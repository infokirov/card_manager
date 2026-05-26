import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

const registerUserSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
  display_name: z.string().min(1, "Укажите имя"),
});

const employeeSchema = z.object({
  full_name: z.string().min(1, "Укажите ФИО"),
  department_id: z.string().optional(),
  position_id: z.string().optional(),
});

export function AuthPage() {
  const navigate = useNavigate();
  const { login, register, user } = useAuth();
  const [tab, setTab] = useState("login");
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dirs, setDirs] = useState<{
    departments: Record<string, string>[];
    positions: Record<string, string>[];
    resources: Record<string, string>[];
    internet: Record<string, string>[];
    software: Record<string, string>[];
    abs: Record<string, string>[];
  } | null>(null);

  const [empForm, setEmpForm] = useState({
    full_name: "",
    department_id: "",
    position_id: "",
    has_abs1_access: false,
    has_abs2_access: false,
    resource_ids: [] as string[],
    internet_resource_ids: [] as string[],
    software_ids: [] as string[],
    abs_access_ids: [] as string[],
  });

  const loginForm = useForm({ resolver: zodResolver(loginSchema) });
  const regForm = useForm({ resolver: zodResolver(registerUserSchema) });

  if (user) {
    navigate("/");
    return null;
  }

  const loadDirs = async () => {
    if (dirs) return;
    const [d, p, r, i, s, a] = await Promise.all([
      api.get("/directories/departments"),
      api.get("/directories/positions"),
      api.get("/directories/access-resources"),
      api.get("/directories/internet-resources"),
      api.get("/directories/software"),
      api.get("/directories/abs-access"),
    ]);
    setDirs({
      departments: d.data,
      positions: p.data,
      resources: r.data,
      internet: i.data,
      software: s.data,
      abs: a.data,
    });
  };

  const onLogin = loginForm.handleSubmit(async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Неверный email или пароль";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  });

  const onRegisterUser = regForm.handleSubmit(async (data) => {
    setLoading(true);
    try {
      await register(data.email, data.password, data.display_name);
      toast.success("Регистрация успешна");
      navigate("/");
    } catch {
      toast.error("Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  });

  const onRegisterEmployee = async () => {
    const parsed = employeeSchema.safeParse(empForm);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Проверьте форму");
      return;
    }
    setLoading(true);
    try {
      await api.post("/edge/register-employee", {
        full_name: empForm.full_name,
        department_id: empForm.department_id || null,
        position_id: empForm.position_id || null,
        has_abs1_access: empForm.has_abs1_access,
        has_abs2_access: empForm.has_abs2_access,
        resource_ids: empForm.resource_ids,
        internet_resource_ids: empForm.internet_resource_ids,
        software_ids: empForm.software_ids,
        abs_access_ids: empForm.abs_access_ids,
      });
      toast.success("Сотрудник и карточка доступа созданы");
      setEmpForm({
        full_name: "",
        department_id: "",
        position_id: "",
        has_abs1_access: false,
        has_abs2_access: false,
        resource_ids: [],
        internet_resource_ids: [],
        software_ids: [],
        abs_access_ids: [],
      });
    } catch {
      toast.error("Ошибка регистрации сотрудника");
    } finally {
      setLoading(false);
    }
  };

  const toggleId = (key: keyof typeof empForm, id: string) => {
    const arr = empForm[key] as string[];
    if (Array.isArray(arr)) {
      setEmpForm({
        ...empForm,
        [key]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Управление доступом</CardTitle>
          <p className="text-sm text-muted-foreground">
            Система управления карточками доступа сотрудников
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v === "employee") loadDirs(); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="employee">Новый сотрудник</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={onLogin} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" {...loginForm.register("email")} />
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label>Пароль</Label>
                  <Input type="password" {...loginForm.register("password")} />
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Вход..." : "Войти"}
                </Button>
              </form>
              <p className="text-center text-xs text-muted-foreground">
                Нет аккаунта?{" "}
                <button type="button" className="text-primary underline" onClick={() => setShowRegister(!showRegister)}>
                  Зарегистрироваться
                </button>
              </p>
              {showRegister && (
                <form onSubmit={onRegisterUser} className="space-y-4 border-t pt-4">
                  <div>
                    <Label>Имя</Label>
                    <Input {...regForm.register("display_name")} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" {...regForm.register("email")} />
                  </div>
                  <div>
                    <Label>Пароль</Label>
                    <Input type="password" {...regForm.register("password")} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Создать аккаунт
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="employee" className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>ФИО *</Label>
                <Input
                  value={empForm.full_name}
                  onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })}
                />
              </div>
              {dirs && (
                <>
                  <div>
                    <Label>Отдел</Label>
                    <Select value={empForm.department_id} onValueChange={(v) => setEmpForm({ ...empForm, department_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Выберите отдел" /></SelectTrigger>
                      <SelectContent>
                        {dirs.departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Должность</Label>
                    <Select value={empForm.position_id} onValueChange={(v) => setEmpForm({ ...empForm, position_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Выберите должность" /></SelectTrigger>
                      <SelectContent>
                        {dirs.positions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <CheckboxGroup title="АБС" items={dirs.abs} selected={empForm.abs_access_ids} onToggle={(id) => toggleId("abs_access_ids", id)} />
                  <CheckboxGroup title="Ресурсы" items={dirs.resources} selected={empForm.resource_ids} onToggle={(id) => toggleId("resource_ids", id)} />
                  <CheckboxGroup title="Интернет" items={dirs.internet} selected={empForm.internet_resource_ids} onToggle={(id) => toggleId("internet_resource_ids", id)} />
                  <CheckboxGroup title="ПО" items={dirs.software} selected={empForm.software_ids} onToggle={(id) => toggleId("software_ids", id)} />
                </>
              )}
              <Button className="w-full" onClick={onRegisterEmployee} disabled={loading}>
                {loading ? "Отправка..." : "Зарегистрировать сотрудника"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckboxGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: Record<string, string>[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <Label className="font-semibold">{title}</Label>
      <div className="mt-1 space-y-1">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm">
            <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => onToggle(item.id)} />
            {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}
