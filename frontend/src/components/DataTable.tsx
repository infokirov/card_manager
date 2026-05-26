import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  rowKey: (row: T) => string;
  actions?: (row: T) => React.ReactNode;
}

export function DataTable<T extends object>({
  columns,
  data,
  sortBy,
  sortDir,
  onSort,
  rowKey,
  actions,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm table-striped">
        <thead>
          <tr className="border-b bg-slate-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600",
                  col.sortable && "cursor-pointer select-none hover:bg-slate-200"
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortBy === col.key && (
                    sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </span>
              </th>
            ))}
            {actions && <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Действия</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-muted-foreground">
                Нет данных
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={rowKey(row)} className="border-b table-row-hover">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
                {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Показано {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} из {total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Назад
        </Button>
        <span className="flex items-center px-2 text-sm">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Вперёд
        </Button>
      </div>
    </div>
  );
}
