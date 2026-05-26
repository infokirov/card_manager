import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function DbConnectionPage() {
  const [info, setInfo] = useState<Record<string, unknown>>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get("/admin/db-connection").then(({ data }) => setInfo(data));
  }, []);

  const test = async () => {
    setTesting(true);
    try {
      await api.post("/admin/db-connection/test");
      toast.success("Подключение успешно");
    } catch {
      toast.error("Ошибка подключения");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">База данных</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">PostgreSQL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Хост:</strong> {String(info.host)}</p>
          <p><strong>Порт:</strong> {String(info.port)}</p>
          <p><strong>База:</strong> {String(info.database)}</p>
          <p><strong>Пользователь:</strong> {String(info.user)}</p>
          <p><strong>SSL:</strong> {info.ssl ? "Да" : "Нет"}</p>
          <p className="text-muted-foreground">{String(info.configured_url)}</p>
          <Button className="mt-4" onClick={test} disabled={testing}>
            {testing ? "Проверка..." : "Проверить подключение"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
