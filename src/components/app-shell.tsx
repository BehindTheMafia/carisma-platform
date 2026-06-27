import { useState, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Car, Users, FileText, Calendar, FileSignature,
  CreditCard, Wrench, ShieldCheck, AlertTriangle, ClipboardCheck,
  UserCog, Settings, BarChart3, LogOut, Menu, Bell, Search,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavGroup {
  label: string;
  items: Array<{ to: string; label: string; icon: typeof LayoutDashboard }>;
}

const NAV: NavGroup[] = [
  {
    label: "Operación",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/rentas", label: "Rentas", icon: FileText },
      { to: "/calendario", label: "Calendario", icon: Calendar },
      { to: "/contratos", label: "Contratos", icon: FileSignature },
      { to: "/pagos", label: "Pagos", icon: CreditCard },
      { to: "/inspecciones", label: "Inspecciones", icon: ClipboardCheck },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { to: "/vehiculos", label: "Vehículos", icon: Car },
      { to: "/clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    label: "Flota",
    items: [
      { to: "/mantenimientos", label: "Mantenimientos", icon: Wrench },
      { to: "/seguros", label: "Seguros", icon: ShieldCheck },
      { to: "/multas", label: "Multas", icon: AlertTriangle },
    ],
  },
  {
    label: "Administración",
    items: [
      { to: "/reportes", label: "Reportes", icon: BarChart3 },
      { to: "/usuarios", label: "Usuarios", icon: UserCog },
      { to: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

export function AppShell({ children, user }: { children: ReactNode; user: { email?: string; nombre?: string; rol?: string } | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.navigate({ to: "/auth", replace: true });
  }

  const initials = (user?.nombre || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <BrandLogo />
        </div>
        <nav className="flex flex-col gap-6 overflow-y-auto px-3 py-5" style={{ maxHeight: "calc(100vh - 4rem)" }}>
          {NAV.map((group) => (
            <div key={group.label}>
              <div className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                {group.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", active ? "text-gold" : "")} strokeWidth={2.2} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen((o) => !o)}>
            <Menu className="size-5" />
          </Button>
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar vehículos, clientes, rentas..." className="h-9 pl-9" />
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-5" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-gold" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md p-1 hover:bg-accent">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <div className="text-sm font-medium leading-tight">{user?.nombre ?? "Usuario"}</div>
                    <div className="text-[0.7rem] capitalize text-muted-foreground leading-tight">{user?.rol ?? "—"}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="font-semibold">{user?.nombre ?? "Usuario"}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 size-4" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}