import { useCallback, useEffect, useState } from "react";
import { Copy, CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const schema = z.object({
  full_name: z.string().min(1, "Укажите ФИО"),
  department_id: z.string().optional(),
  position_id: z.string().optional(),
  is_dismissed: z.boolean(),
});

type Employee = {
  id: string;
  full_name: string;
  department_name?: string;
  position_name?: string;
  is_dismissed: boolean;
  department_id?: string;
  position_id?: string;
};

export function EmployeesPage() {
  const { isAdmin } = useUserRole();
  const [items, setItems] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Record<string, string>[]>([]);
  const [positions, setPositions] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", department_id: "", position_id: "", is_dismissed: false },
  });

  const load = useCallback(async () => {
    const { data } = await api.get("/employees", {
      params: { search, status, page, page_size: 50, sort_by: sortBy, sort_dir: sortDir },
    });
    setItems(data.items);
    setTotal(data.total);
  }, [search, status, page, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([
      api.get("/directories/departments"),
      api.get("/directories/positions"),
    ]).then(([d, p]) => {
      setDepartments(d.data);
      setPositions(p.data);
    });
  }, []);

  const columns: Column<Employee>[] = [
    { key: "full_name", label: "ФИО", sortable: true },
    { key: "department", label: "Отдел", sortable: true, render: (r) => r.department_name || "—" },
    { key: "position", label: "Должность", sortable: true, render: (r) => r.position_name || "—" },
    {
      key: "status",
      label: "Статус",
      sortable: true,
      render: (r) => (
        <Badge variant={r.is_dismissed ? "destructive" : "success"}>
          {r.is_dismissed ? "Уволен" : "Активен"}
        </Badge>
      ),
    },
  ];

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.reset({ full_name: "", department_id: "", position_id: "", is_dismissed: false });
    setOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    form.reset({
      full_name: emp.full_name,
      department_id: emp.department_id || "",
      position_id: emp.position_id || "",
      is_dismissed: emp.is_dismissed,
    });
    setOpen(true);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setLoading(true);
    try {
      const body = {
        full_name: data.full_name,
        department_id: data.department_id || null,
        position_id: data.position_id || null,
        is_dismissed: data.is_dismissed,
      };
      if (editing) {
        await api.put(`/employees/${editing.id}`, body);
        toast.success("Сотрудник обновлён");
      } else {
        await api.post("/employees", body);
        toast.success("Сотрудник добавлен");
      }
      setOpen(false);
      load();
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  });

  const remove = async (id: string) => {
    await api.delete(`/employees/${id}`);
    toast.success("Сотрудник удалён");
    load();
  };

  const copy = async (id: string) => {
    await api.post(`/employees/${id}/copy`);
    toast.success("Копия создана");
    load();
  };

  const createCard = async (id: string) => {
    try {
      await api.post(`/access-cards/for-employee/${id}`);
      toast.success("Карточка доступа создана");
    } catch {
      toast.error("Карточка уже существует или ошибка");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Сотрудники</h1>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <Input
          placeholder="Поиск по ФИО..."
          className="max-w-xs"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все сотрудники</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="dismissed">Уволенные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={items}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        rowKey={(r) => r.id}
        actions={(row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" title="Карточка" onClick={() => createCard(row.id)}>
              <CreditCard className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <>
                <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => copy(row.id)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>Удалить сотрудника?</AlertDialogTitle>
                    <AlertDialogDescription>Карточка доступа будет удалена каскадно.</AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(row.id)}>Удалить</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        )}
      />

      <Pagination page={page} total={total} pageSize={50} onPageChange={setPage} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Редактировать сотрудника" : "Новый сотрудник"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>ФИО *</Label>
              <Input {...form.register("full_name")} />
              {form.formState.errors.full_name && (
                <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
              )}
            </div>
            <div>
              <Label>Отдел</Label>
              <Select
                value={form.watch("department_id")}
                onValueChange={(v) => form.setValue("department_id", v)}
              >
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Должность</Label>
              <Select
                value={form.watch("position_id")}
                onValueChange={(v) => form.setValue("position_id", v)}
              >
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={form.watch("is_dismissed")}
                onCheckedChange={(c) => form.setValue("is_dismissed", !!c)}
              />
              Уволен
            </label>
            <Button type="submit" disabled={loading}>
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
