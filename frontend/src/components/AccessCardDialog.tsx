import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import api from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { printAccessCard } from "@/lib/printAccessCard";
import { toast } from "sonner";

interface AccessCardDialogProps {
  cardId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function AccessCardDialog({ cardId, open, onOpenChange, onSaved }: AccessCardDialogProps) {
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [dirs, setDirs] = useState<{
    resources: Record<string, string>[];
    internet: Record<string, string>[];
    software: Record<string, string>[];
    abs: Record<string, string>[];
  }>({ resources: [], internet: [], software: [], abs: [] });
  const [selected, setSelected] = useState({
    has_abs1: false,
    has_abs2: false,
    resource_ids: [] as string[],
    internet_resource_ids: [] as string[],
    software_ids: [] as string[],
    abs_access_ids: [] as string[],
  });

  useEffect(() => {
    if (!open || !cardId) return;
    const load = async () => {
      const [cardRes, res, inet, sw, abs] = await Promise.all([
        api.get(`/access-cards/${cardId}`),
        api.get("/directories/access-resources"),
        api.get("/directories/internet-resources"),
        api.get("/directories/software"),
        api.get("/directories/abs-access"),
      ]);
      const d = cardRes.data;
      setCard(d.card);
      setHistory(d.history);
      setDirs({
        resources: res.data,
        internet: inet.data,
        software: sw.data,
        abs: abs.data,
      });
      setSelected({
        has_abs1: d.card.has_abs1_access,
        has_abs2: d.card.has_abs2_access,
        resource_ids: d.resources.map((r: { id: string }) => r.id),
        internet_resource_ids: d.internet_resources.map((r: { id: string }) => r.id),
        software_ids: d.software.map((r: { id: string }) => r.id),
        abs_access_ids: d.abs_access.map((r: { id: string }) => r.id),
      });
    };
    load();
  }, [open, cardId]);

  const toggle = (key: keyof typeof selected, id: string) => {
    const arr = selected[key] as string[];
    if (Array.isArray(arr)) {
      setSelected({
        ...selected,
        [key]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
      });
    }
  };

  const save = async () => {
    if (!cardId) return;
    setLoading(true);
    try {
      await api.put(`/access-cards/${cardId}`, selected);
      toast.success("Карточка сохранена");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!card) return;
    printAccessCard({
      employeeName: String(card.employee_name),
      department: String(card.department_name || ""),
      position: String(card.position_name || ""),
      hasAbs1: selected.has_abs1,
      hasAbs2: selected.has_abs2,
      resources: dirs.resources
        .filter((r) => selected.resource_ids.includes(r.id))
        .map((r) => ({ name: r.name })),
      internet: dirs.internet
        .filter((r) => selected.internet_resource_ids.includes(r.id))
        .map((r) => ({ name: r.name, url: r.url })),
      software: dirs.software
        .filter((r) => selected.software_ids.includes(r.id))
        .map((r) => ({ name: r.name, version: r.version })),
      absAccess: dirs.abs
        .filter((r) => selected.abs_access_ids.includes(r.id))
        .map((r) => ({ name: r.name })),
    });
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Карточка: {String(card.employee_name)}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="access">
          <TabsList>
            <TabsTrigger value="access">Доступы</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="access">
            <ScrollArea className="h-80 pr-4">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.has_abs1}
                      disabled={!isAdmin}
                      onCheckedChange={(c) => setSelected({ ...selected, has_abs1: !!c })}
                    />
                    АБС1
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.has_abs2}
                      disabled={!isAdmin}
                      onCheckedChange={(c) => setSelected({ ...selected, has_abs2: !!c })}
                    />
                    АБС2
                  </label>
                </div>

                <Section title="Доступ к АБС" items={dirs.abs} selected={selected.abs_access_ids} onToggle={(id) => toggle("abs_access_ids", id)} disabled={!isAdmin} />
                <Section title="Ресурсы" items={dirs.resources} selected={selected.resource_ids} onToggle={(id) => toggle("resource_ids", id)} disabled={!isAdmin} />
                <Section title="Интернет-ресурсы" items={dirs.internet} selected={selected.internet_resource_ids} onToggle={(id) => toggle("internet_resource_ids", id)} disabled={!isAdmin} />
                <Section title="ПО" items={dirs.software} selected={selected.software_ids} onToggle={(id) => toggle("software_ids", id)} disabled={!isAdmin} />
              </div>
            </ScrollArea>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Печать
              </Button>
              {isAdmin && (
                <Button onClick={save} disabled={loading}>
                  {loading ? "Сохранение..." : "Сохранить"}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="h-80">
              {history.length === 0 ? (
                <p className="text-muted-foreground">История пуста</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {history.map((h) => (
                    <li key={String(h.id)} className="rounded border p-2">
                      <span className="font-medium">{String(h.action_type)}</span>
                      {h.field_name != null && h.field_name !== "" ? (
                        <span className="text-muted-foreground">
                          {" "}
                          — {String(h.field_name)}: {String(h.old_value)} → {String(h.new_value)}
                        </span>
                      ) : null}
                      <div className="text-xs text-muted-foreground">
                        {new Date(String(h.changed_at)).toLocaleString("ru-RU")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  items,
  selected,
  onToggle,
  disabled,
}: {
  title: string;
  items: Record<string, string>[];
  selected: string[];
  onToggle: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <Label className="mb-2 block font-semibold">{title}</Label>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(item.id)}
              disabled={disabled}
              onCheckedChange={() => onToggle(item.id)}
            />
            {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}
