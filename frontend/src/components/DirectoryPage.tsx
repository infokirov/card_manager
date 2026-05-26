import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export interface ExtraField {
  key: string;
  label: string;
}

interface DirectoryPageProps {
  title: string;
  slug: string;
  extraFields?: ExtraField[];
}

export function DirectoryPage({ title, slug, extraFields = [] }: DirectoryPageProps) {
  const { isAdmin } = useUserRole();
  const [items, setItems] = useState<Record<string, string>[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, string> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ name: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/directories/${slug}`);
    setItems(data);
  };

  useEffect(() => {
    load();
  }, [slug]);

  const columns: Column<Record<string, string>>[] = [
    { key: "name", label: "Название", sortable: true },
    ...extraFields.map((f) => ({ key: f.key, label: f.label, sortable: true })),
  ];

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", ...Object.fromEntries(extraFields.map((f) => [f.key, ""])) });
    setOpen(true);
  };

  const openEdit = (row: Record<string, string>) => {
    setEditing(row);
    setForm({ name: row.name || "", ...Object.fromEntries(extraFields.map((f) => [f.key, row[f.key] || ""])) });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Укажите название");
      return;
    }
    setLoading(true);
    try {
      const body = {
        name: form.name,
        description: form.description,
        url: form.url,
        version: form.version,
      };
      if (editing?.id) {
        await api.put(`/directories/${slug}/${editing.id}`, body);
        toast.success("Запись обновлена");
      } else {
        await api.post(`/directories/${slug}`, body);
        toast.success("Запись добавлена");
      }
      setOpen(false);
      load();
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/directories/${slug}/${id}`);
      toast.success("Запись удалена");
      load();
    } catch {
      toast.error("Ошибка удаления");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={items}
        rowKey={(r) => r.id as string}
        actions={
          isAdmin
            ? (row) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
                      <AlertDialogDescription>Это действие необратимо.</AlertDialogDescription>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(row.id as string)}>Удалить</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )
            : undefined
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Редактировать" : "Добавить"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {extraFields.map((f) => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  value={form[f.key] || ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
            <Button onClick={save} disabled={loading}>
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
