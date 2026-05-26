import { NavLink } from "react-router-dom";
import {
  Shield,
  Users,
  CreditCard,
  Building2,
  Briefcase,
  Server,
  Globe,
  Monitor,
  Database,
  UserCog,
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

const mainNav = [
  { to: "/", label: "Сотрудники", icon: Users },
  { to: "/access-cards", label: "Карточки доступа", icon: CreditCard },
];

const dirNav = [
  { to: "/directories/departments", label: "Отделы", icon: Building2 },
  { to: "/directories/positions", label: "Должности", icon: Briefcase },
  { to: "/directories/access-resources", label: "Ресурсы доступа", icon: Server },
  { to: "/directories/internet-resources", label: "Интернет-ресурсы", icon: Globe },
  { to: "/directories/software", label: "ПО", icon: Monitor },
  { to: "/directories/abs-access", label: "Доступ к АБС", icon: Database },
];

const adminNav = [
  { to: "/admin/users", label: "Пользователи", icon: UserCog },
  { to: "/admin/notifications", label: "Уведомления", icon: Bell },
  { to: "/admin/db-connection", label: "База данных", icon: Database },
];

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Users }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary/20 text-white border-l-2 border-primary"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const { isAdmin } = useUserRole();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || !confirm("Удалить свой аккаунт? Это действие необратимо.")) return;
    try {
      await api.post(`/edge/delete-user/${user.id}`);
      logout();
      toast.success("Аккаунт удалён");
    } catch {
      toast.error("Не удалось удалить аккаунт");
    }
  };

  const content = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-white/10 p-4">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <div className="font-semibold text-white">Управление доступом</div>
          <div className="text-xs text-slate-400">Карточки доступа</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <div className="mb-2 px-3 text-xs font-semibold uppercase text-slate-500">Основное</div>
        {mainNav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="mb-2 mt-4 px-3 text-xs font-semibold uppercase text-slate-500">Справочники</div>
        {dirNav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {isAdmin && (
          <>
            <div className="mb-2 mt-4 px-3 text-xs font-semibold uppercase text-slate-500">
              Администрирование
            </div>
            {adminNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-medium text-white">{user?.display_name}</span>
          <Badge variant={isAdmin ? "default" : "secondary"}>
            {isAdmin ? "Админ" : "Пользователь"}
          </Badge>
        </div>
        <div className="mb-3 text-xs text-slate-400">{user?.email}</div>
        <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </Button>
        <Button
          variant="ghost"
          className="mt-1 w-full justify-start text-destructive hover:text-destructive"
          onClick={handleDeleteAccount}
        >
          Удалить аккаунт
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-40 lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-64">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            {content}
          </aside>
        </div>
      )}

      <aside className="hidden h-screen w-64 shrink-0 lg:block">{content}</aside>
    </>
  );
}
