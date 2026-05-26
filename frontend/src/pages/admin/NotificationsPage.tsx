import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function NotificationsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get("/admin/notifications");
    setSettings(data);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key: string, value: unknown) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const save = async () => {
    setLoading(true);
    try {
      await api.put("/admin/notifications", {
        enabled: settings.enabled,
        smtp_host: settings.smtp_host,
        smtp_port: Number(settings.smtp_port) || 587,
        smtp_login: settings.smtp_login,
        smtp_password: settings.smtp_password,
        sender_email: settings.sender_email,
        sender_name: settings.sender_name,
        use_tls: settings.use_tls,
        recipients: settings.recipients || [],
      });
      toast.success("Настройки сохранены");
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  const testEmail = async () => {
    try {
      const { data } = await api.post("/admin/notifications/test", {});
      toast.success(`Тест отправлен: ${data.sent_to}`);
    } catch {
      toast.error("Не удалось отправить тест");
    }
  };

  const recipients = (settings.recipients as string[]) || [];

  const addRecipient = () => {
    if (!newEmail.includes("@")) {
      toast.error("Некорректный email");
      return;
    }
    if (recipients.includes(newEmail)) return;
    update("recipients", [...recipients, newEmail]);
    setNewEmail("");
  };

  const removeRecipient = (email: string) => {
    update(
      "recipients",
      recipients.filter((r) => r !== email)
    );
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Уведомления</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Настройки SMTP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label>Уведомления включены</Label>
            <Switch
              checked={!!settings.enabled}
              onCheckedChange={(c) => update("enabled", c)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>SMTP хост</Label>
              <Input
                value={String(settings.smtp_host || "")}
                onChange={(e) => update("smtp_host", e.target.value)}
              />
            </div>
            <div>
              <Label>Порт</Label>
              <Input
                type="number"
                value={String(settings.smtp_port || 587)}
                onChange={(e) => update("smtp_port", e.target.value)}
              />
            </div>
            <div>
              <Label>Логин</Label>
              <Input
                value={String(settings.smtp_login || "")}
                onChange={(e) => update("smtp_login", e.target.value)}
              />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input
                type="password"
                value={String(settings.smtp_password || "")}
                onChange={(e) => update("smtp_password", e.target.value)}
              />
            </div>
            <div>
              <Label>Email отправителя</Label>
              <Input
                value={String(settings.sender_email || "")}
                onChange={(e) => update("sender_email", e.target.value)}
              />
            </div>
            <div>
              <Label>Имя отправителя</Label>
              <Input
                value={String(settings.sender_name || "")}
                onChange={(e) => update("sender_name", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label>TLS</Label>
            <Switch
              checked={settings.use_tls !== false}
              onCheckedChange={(c) => update("use_tls", c)}
            />
          </div>

          <div>
            <Label>Получатели</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {recipients.map((email) => (
                <Badge
                  key={email}
                  className="cursor-pointer"
                  onClick={() => removeRecipient(email)}
                >
                  {email} ×
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="email@company.ru"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={addRecipient}>
                Добавить
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={loading}>
              {loading ? "Сохранение..." : "Сохранить настройки"}
            </Button>
            <Button variant="outline" onClick={testEmail}>
              Тестовая отправка
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
