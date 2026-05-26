import { useCallback, useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { AccessCardDialog } from "@/components/AccessCardDialog";
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

type Card = {
  id: string;
  employee_name: string;
  department_name?: string;
  has_abs1_access: boolean;
  has_abs2_access: boolean;
  resource_count: number;
  software_count: number;
};

export function AccessCardsPage() {
  const { isAdmin } = useUserRole();
  const [items, setItems] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("employee");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [viewId, setViewId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await api.get("/access-cards", {
      params: { search, page, page_size: 50, sort_by: sortBy, sort_dir: sortDir },
    });
    setItems(data.items);
    setTotal(data.total);
  }, [search, page, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  const yesNo = (v: boolean) => (
    <Badge variant={v ? "success" : "secondary"}>{v ? "Да" : "Нет"}</Badge>
  );

  const columns: Column<Card>[] = [
    { key: "employee", label: "Сотрудник", sortable: true, render: (r) => r.employee_name },
    { key: "department", label: "Отдел", sortable: true, render: (r) => r.department_name || "—" },
    { key: "abs1", label: "АБС1", sortable: true, render: (r) => yesNo(r.has_abs1_access) },
    { key: "abs2", label: "АБС2", sortable: true, render: (r) => yesNo(r.has_abs2_access) },
    { key: "resources", label: "Ресурсы", sortable: true, render: (r) => r.resource_count },
    { key: "software", label: "ПО", sortable: true, render: (r) => r.software_count },
  ];

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const remove = async (id: string) => {
    await api.delete(`/access-cards/${id}`);
    toast.success("Карточка удалена");
    load();
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Карточки доступа</h1>

      <div className="mb-4">
        <Input
          placeholder="Поиск по сотруднику..."
          className="max-w-xs"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
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
            <Button variant="ghost" size="icon" onClick={() => setViewId(row.id)}>
              <Eye className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>Удалить карточку?</AlertDialogTitle>
                  <AlertDialogDescription>Это действие необратимо.</AlertDialogDescription>
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

      <Pagination page={page} total={total} pageSize={50} onPageChange={setPage} />

      <AccessCardDialog
        cardId={viewId}
        open={!!viewId}
        onOpenChange={(o) => !o && setViewId(null)}
        onSaved={load}
      />
    </div>
  );
}
