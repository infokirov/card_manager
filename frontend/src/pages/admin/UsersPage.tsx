import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  role: string;
};

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(1),
  role: z.enum(["admin", "user"]),
});

type CreateUserForm = z.infer<typeof createSchema>;

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      email: "",
      password: "",
      display_name: "",
      role: "user",
    },
  });

  const load = async () => {
    const { data } = await api.get("/admin/users");
    setUsers(data);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<UserRow>[] = [
    { key: "display_name", label: "Имя" },
    {
      key: "role",
      label: "Роль",
      render: (r) => (
        <Badge>{r.role === "admin" ? "Администратор" : "Пользователь"}</Badge>
      ),
    },
  ];

  const changeRole = async (id: string, role: string) => {
    await api.patch(`/admin/users/${id}/role?role=${role}`);
    toast.success("Роль обновлена");
    load();
  };

  const remove = async (id: string) => {
    await api.delete(`/admin/users/${id}`);
    toast.success("Пользователь удалён");
    load();
  };

  const onCreate = form.handleSubmit(async (data) => {
    setLoading(true);
    try {
      await api.post("/edge/create-user", data);
      toast.success("Пользователь создан");
      setOpen(false);
      load();
    } catch {
      toast.error("Ошибка создания");
    } finally {
      setLoading(false);
    }
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Пользователи</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Создать
        </Button>
      </div>

      <Input
        placeholder="Поиск..."
        className="mb-4 max-w-xs"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        actions={(row) => (
          <div className="flex items-center justify-end gap-2">
            <Select value={row.role} onValueChange={(v) => changeRole(row.id, v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Администратор</SelectItem>
                <SelectItem value="user">Пользователь</SelectItem>
              </SelectContent>
            </Select>
            {row.id !== currentUser?.id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(row.id)}>Удалить</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый пользователь</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div>
              <Label>Имя</Label>
              <Input {...form.register("display_name")} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input type="password" {...form.register("password")} />
            </div>
            <div>
              <Label>Роль</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(v) => form.setValue("role", v as CreateUserForm["role"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="user">Пользователь</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Создание..." : "Создать"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
