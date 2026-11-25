import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Mail,
  Car,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Calendar,
  FileText,
  CreditCard,
  FileSignature,
  Activity,
  DollarSign,
  Award,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Trash2,
  Pencil,
  PhoneCall,
  BadgeCheck,
  ScrollText,
  Loader2,
  History,
  FileSpreadsheet,
  Download,
  type LucideIcon,
} from "lucide-react";
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type Updater,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm, type FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetOverlay,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDate, formatCurrency } from "@/lib/format";
import { ESTADO_FINANCIERO_COLORS, ESTADO_FINANCIERO_LABELS } from "@/lib/constants";

type Cliente = {
  id: string;
  nombre: string;
  documento: string;
  tipo_documento: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  licencia: string | null;
  licencia_vencimiento: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  observaciones: string | null;
  documentos: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CustomerStats = {
  total_rentals: number;
  total_revenue: number;
  active_rental: boolean;
  last_rental: string | null;
  pending_payment: boolean;
  risk_score: "low" | "medium" | "high";
  is_vip: boolean;
  is_returning: boolean;
};

type EnrichedCliente = Cliente & CustomerStats;

type CustomerType = "all" | "individual" | "company" | "vip" | "inactive" | "blacklisted";
type LicenseStatus = "all" | "valid" | "expiring" | "expired" | "none";
type SortOption = "newest" | "highest_spending" | "most_rentals" | "alphabetical";

type FiltersState = {
  customerType: CustomerType;
  licenseStatus: LicenseStatus;
  city: string;
  dateRange: "all" | "today" | "week" | "month" | "quarter" | "year";
  hasActiveRental: boolean;
  hasPendingPayment: boolean;
  sort: SortOption;
};

const GOLD = "#C89B3C";
const BLUE = "#2563EB";
const GREEN = "#22C55E";
const RED = "#EF4444";
const AMBER = "#F59E0B";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getLicenseStatus(vencimiento: string | null): { label: string; color: string } {
  if (!vencimiento) return { label: "Sin licencia", color: "#9CA3AF" };
  const days = Math.ceil((new Date(vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Vencida", color: RED };
  if (days <= 30) return { label: `Vence en ${days}d`, color: AMBER };
  return { label: "Vigente", color: GREEN };
}

function formatLastRental(date: string | null): string {
  if (!date) return "Nunca";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 0) return `Próxima: ${formatDate(date)}`;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? "s" : ""}`;
  if (days < 365) return `Hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? "es" : ""}`;
  return `Hace ${Math.floor(days / 365)} año${Math.floor(days / 365) > 1 ? "s" : ""}`;
}

function CustomerAvatar({ nombre, className, size = "md" }: { nombre: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeMap = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" };
  return (
    <Avatar className={cn(sizeMap[size], "ring-2 ring-background", className)}>
      <AvatarFallback className="bg-gradient-to-br from-gold/20 to-gold/10 text-gold font-semibold">
        {getInitials(nombre)}
      </AvatarFallback>
    </Avatar>
  );
}

function StatusBadge({ label, color, className }: { label: string; color: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[11px] font-semibold", className)}
      style={{ backgroundColor: `${color}14`, color }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function RiskBadge({ score }: { score: string }) {
  const config = {
    low: { label: "Bajo riesgo", icon: CheckCircle2, color: GREEN, bg: "bg-success/10" },
    medium: { label: "Riesgo medio", icon: AlertCircle, color: AMBER, bg: "bg-warning/10" },
    high: { label: "Alto riesgo", icon: AlertTriangle, color: RED, bg: "bg-destructive/10" },
  };
  const c = config[score as keyof typeof config] || config.low;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={cn("flex items-center gap-1 rounded-lg px-2 py-0.5", c.bg)}>
            <c.icon className="size-3" style={{ color: c.color }} />
            <span className="text-[11px] font-medium" style={{ color: c.color }}>{c.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="rounded-xl text-xs">
          {score === "high" ? "Cliente con pagos atrasados o incumplimientos" : score === "medium" ? "Cliente con señales de alerta menores" : "Cliente confiable sin incidentes"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-gold/10 to-gold/5 dark:from-gold/15 dark:to-gold/5 border border-gold/10">
        <Icon className="size-9 text-gold" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="max-w-xs text-sm text-muted-foreground mb-6">{description}</p>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

type QueryBuilder = {
  select: (cols: string, opts?: { count?: "exact"; head?: boolean }) => QueryBuilder;
  is: (col: string, val: unknown) => QueryBuilder;
  or: (clause: string) => QueryBuilder;
  ilike: (col: string, val: string) => QueryBuilder;
  in: (col: string, vals: string[]) => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
  gte: (col: string, val: string) => QueryBuilder;
  lt: (col: string, val: string) => QueryBuilder;
  lte: (col: string, val: string) => QueryBuilder;
  not: (col: string, op: string, val: unknown) => QueryBuilder;
  order: (col: string, opts?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  then: (resolve: (value: { data: unknown; error: unknown; count: number | null }) => void) => PromiseLike<{ data: unknown; error: unknown; count: number | null }>;
};

function useCustomersData() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<FiltersState>({
    customerType: "all", licenseStatus: "all", city: "", dateRange: "all",
    hasActiveRental: false, hasPendingPayment: false, sort: "newest",
  });
  const pageSize = 20;

  const listQ = useQuery({
    queryKey: ["customers", "list", search, page, filters],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (table: string) => QueryBuilder };
      let q = sb.from("clientes").select("*", { count: "exact" });
      q = q.is("deleted_at", null);
      if (search) {
        const term = `%${search}%`;
        const or = ["nombre", "documento", "telefono", "correo", "licencia", "ciudad"]
          .map((f) => `${f}.ilike.${term}`).join(",");
        q = q.or(or);
      }
      if (filters.city) q = q.ilike("ciudad", `%${filters.city}%`);
      if (filters.dateRange !== "all") {
        const now = new Date();
        let start: Date;
        switch (filters.dateRange) {
          case "today": start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
          case "week": start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case "month": start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); break;
          case "quarter": start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); break;
          case "year": start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break;
          default: start = new Date(0);
        }
        q = q.gte("created_at", start.toISOString());
      }
      q = q.order("created_at", { ascending: filters.sort === "newest" });
      q = q.range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, error, count } = await q;
      if (error) throw error as Error;
      return { rows: (data ?? []) as Cliente[], count: count ?? 0 };
    },
  });

  const statsQ = useQuery({
    queryKey: ["customers", "rentals", listQ.data?.rows.map((c) => c.id).join(",")],
    enabled: !!listQ.data?.rows.length,
    queryFn: async () => {
      const ids = listQ.data!.rows.map((c) => c.id);
      const { data: rentas, error } = await supabase
        .from("rentas")
        .select("id, cliente_id, total, estado, fecha_inicio")
        .in("cliente_id", ids)
        .is("deleted_at", null)
        .order("fecha_inicio", { ascending: false });
      if (error) throw error;
      const rentaIds = (rentas ?? []).map((r) => r.id);
      const payments = rentaIds.length
        ? await supabase.from("pagos").select("renta_id").in("renta_id", rentaIds).eq("estado", "pendiente").is("deleted_at", null)
        : { data: [], error: null };
      if (payments.error) throw payments.error;
      const pendingByRental = new Map<string, number>();
      for (const payment of payments.data ?? []) pendingByRental.set(payment.renta_id, (pendingByRental.get(payment.renta_id) ?? 0) + 1);

      const byCustomer = new Map<string, CustomerStats>();
      for (const renta of rentas ?? []) {
        const current = byCustomer.get(renta.cliente_id) ?? {
          total_rentals: 0, total_revenue: 0, active_rental: false, last_rental: null,
          pending_payment: false, risk_score: "low" as const, is_vip: false, is_returning: false,
        };
        current.total_rentals++;
        current.total_revenue += Number(renta.total) || 0;
        current.active_rental ||= renta.estado === "activa";
        if (!current.last_rental || renta.fecha_inicio > current.last_rental) current.last_rental = renta.fecha_inicio;
        current.pending_payment ||= (pendingByRental.get(renta.id) ?? 0) > 0;
        byCustomer.set(renta.cliente_id, current);
      }
      for (const [id, stats] of byCustomer) {
        const pendingCount = (rentas ?? []).filter((r) => r.cliente_id === id).reduce((sum, r) => sum + (pendingByRental.get(r.id) ?? 0), 0);
        stats.risk_score = pendingCount > 2 ? "high" : pendingCount > 0 ? "medium" : "low";
        stats.is_vip = stats.total_revenue > 50000 || stats.total_rentals > 10;
        stats.is_returning = stats.total_rentals > 1;
      }
      return byCustomer;
    },
  });

  const enrichedRows = useMemo(() => (listQ.data?.rows ?? []).map((cliente): EnrichedCliente => ({
    ...cliente,
    ...(statsQ.data?.get(cliente.id) ?? {
      total_rentals: 0, total_revenue: 0, active_rental: false, last_rental: null,
      pending_payment: false, risk_score: "low", is_vip: false, is_returning: false,
    }),
  })), [listQ.data, statsQ.data]);

  return { listQ, statsQ, enrichedRows, search, setSearch, page, setPage, filters, setFilters, pageSize };
}

function AdvancedFiltersPanel({ filters, onChange }: { filters: FiltersState; onChange: (f: FiltersState) => void }) {
  const [local, setLocal] = useState(filters);
  const activeCount = useMemo(() => {
    let c = 0;
    if (local.customerType !== "all") c++;
    if (local.licenseStatus !== "all") c++;
    if (local.city) c++;
    if (local.dateRange !== "all") c++;
    if (local.hasActiveRental) c++;
    if (local.hasPendingPayment) c++;
    return c;
  }, [local]);

  const update = (partial: Partial<FiltersState>) => setLocal({ ...local, ...partial });
  const apply = () => onChange(local);
  const reset = () => {
    const d: FiltersState = { customerType: "all", licenseStatus: "all", city: "", dateRange: "all", hasActiveRental: false, hasPendingPayment: false, sort: "newest" };
    setLocal(d);
    onChange(d);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("relative gap-2 rounded-xl h-10 border-border/70", activeCount > 0 && "border-gold/50 text-gold")}>
          <Filter className="size-4" />
          Filtros
          {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-gold text-[10px] font-bold text-white">{activeCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[min(360px,calc(100vw-1.5rem))] p-0 rounded-2xl overflow-hidden">
        <div className="p-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Filtros avanzados</h4>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Limpiar todo</button>
          </div>
        </div>
        <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo de cliente</label>
            <Select value={local.customerType} onValueChange={(v) => update({ customerType: v as CustomerType })}>
              <SelectTrigger className="h-9 text-sm rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="company">Empresa</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="blacklisted">Lista negra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado de licencia</label>
            <Select value={local.licenseStatus} onValueChange={(v) => update({ licenseStatus: v as LicenseStatus })}>
              <SelectTrigger className="h-9 text-sm rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="valid">Vigente</SelectItem>
                <SelectItem value="expiring">Por vencer</SelectItem>
                <SelectItem value="expired">Vencida</SelectItem>
                <SelectItem value="none">Sin licencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ciudad</label>
            <Input placeholder="Filtrar por ciudad..." value={local.city} onChange={(e) => update({ city: e.target.value })} className="h-9 text-sm rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Registro</label>
            <Select value={local.dateRange} onValueChange={(v) => update({ dateRange: v as FiltersState["dateRange"] })}>
              <SelectTrigger className="h-9 text-sm rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todo</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
                <SelectItem value="quarter">Último trimestre</SelectItem>
                <SelectItem value="year">Último año</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={local.hasActiveRental} onChange={(e) => update({ hasActiveRental: e.target.checked })} className="size-4 rounded-md border-border text-gold focus:ring-gold/30" />
              <span className="text-sm">Con renta activa</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={local.hasPendingPayment} onChange={(e) => update({ hasPendingPayment: e.target.checked })} className="size-4 rounded-md border-border text-gold focus:ring-gold/30" />
              <span className="text-sm">Pago pendiente</span>
            </label>
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ordenar por</label>
            <Select value={local.sort} onValueChange={(v) => update({ sort: v as SortOption })}>
              <SelectTrigger className="h-9 text-sm rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="highest_spending">Mayor gasto</SelectItem>
                <SelectItem value="most_rentals">Más rentas</SelectItem>
                <SelectItem value="alphabetical">Alfabético</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="p-4 pt-3 border-t border-border/50">
          <Button onClick={apply} className="w-full rounded-xl">Aplicar filtros</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CustomerActions({
  customer,
  onViewProfile,
  onEdit,
  onDelete,
}: {
  customer: Cliente;
  onViewProfile: (c: Cliente) => void;
  onEdit: (c: Cliente) => void;
  onDelete: (c: Cliente) => void;
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 rounded-lg">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl">
        <DropdownMenuItem onClick={() => onViewProfile(customer)} className="gap-2.5 rounded-lg cursor-pointer">
          <Eye className="size-4 text-muted-foreground" /> Ver perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(customer)} className="gap-2.5 rounded-lg cursor-pointer">
          <Pencil className="size-4 text-muted-foreground" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate({ to: "/rentas", search: { clienteId: customer.id, pagarRentaId: undefined } })}
          className="gap-2.5 rounded-lg cursor-pointer"
        >
          <Car className="size-4 text-muted-foreground" /> Nueva renta
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onViewProfile(customer)}
          className="gap-2.5 rounded-lg cursor-pointer"
        >
          <History className="size-4 text-muted-foreground" /> Historial de rentas
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate({ to: "/documentos", search: { editId: undefined, rentaId: undefined } })}
          className="gap-2.5 rounded-lg cursor-pointer"
        >
          <FileSpreadsheet className="size-4 text-muted-foreground" /> Contratos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onViewProfile(customer)} className="gap-2.5 rounded-lg cursor-pointer">
          <CreditCard className="size-4 text-muted-foreground" /> Pagos
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (customer.whatsapp) window.open(`https://wa.me/${customer.whatsapp.replace(/[^0-9]/g, "")}`, "_blank");
            else toast.error("Este cliente no tiene WhatsApp registrado");
          }}
          className="gap-2.5 rounded-lg cursor-pointer"
        >
          <MessageCircle className="size-4 text-muted-foreground" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (customer.telefono) {
              navigator.clipboard.writeText(customer.telefono);
              toast.success("Teléfono copiado");
            } else toast.error("Este cliente no tiene teléfono registrado");
          }}
          className="gap-2.5 rounded-lg cursor-pointer"
        >
          <Phone className="size-4 text-muted-foreground" /> Llamar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (customer.correo) window.location.href = `mailto:${customer.correo}`;
            else toast.error("Este cliente no tiene correo registrado");
          }}
          className="gap-2.5 rounded-lg cursor-pointer"
        >
          <Mail className="size-4 text-muted-foreground" /> Correo
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(customer)} className="gap-2.5 rounded-lg cursor-pointer text-destructive focus:text-destructive">
          <Trash2 className="size-4" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CustomersTable({
  data,
  onViewProfile,
  onEdit,
  onDelete,
  isLoading,
  rowSelection,
  onRowSelectionChange,
}: {
  data: Cliente[];
  onViewProfile: (c: Cliente) => void;
  onEdit: (c: Cliente) => void;
  onDelete: (c: Cliente) => void;
  isLoading: boolean;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (updater: Updater<RowSelectionState>) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Cliente>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)} className="size-4 rounded border-border" />
        ),
        cell: ({ row }) => (
          <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} className="size-4 rounded border-border" />
        ),
        size: 40,
      },
      {
        accessorKey: "nombre",
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting()} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cliente
            {column.getIsSorted() === "asc" ? <ArrowUp className="size-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3" />}
          </button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <CustomerAvatar nombre={row.original.nombre} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{row.original.nombre}</p>
              <p className="text-xs text-muted-foreground font-mono">{row.original.documento}</p>
            </div>
          </div>
        ),
        enableSorting: true,
      },
      {
        id: "contacto",
        header: () => <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contacto</span>,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate max-w-[160px]">{row.original.telefono || "—"}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{row.original.correo || "—"}</p>
          </div>
        ),
      },
      {
        accessorKey: "ciudad",
        header: () => <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ciudad</span>,
        cell: ({ row }) => <span className="text-sm">{row.original.ciudad || "—"}</span>,
      },
      {
        id: "last_rental",
        header: () => <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Última renta</span>,
        cell: ({ row }) => {
          const stats = row.original as unknown as EnrichedCliente;
          return <span className="text-sm text-muted-foreground">{stats.last_rental ? formatLastRental(stats.last_rental) : "Nunca"}</span>;
        },
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <CustomerActions customer={row.original} onViewProfile={onViewProfile} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ),
        size: 48,
      },
    ],
    [onViewProfile, onEdit, onDelete],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/70 bg-white dark:bg-card overflow-hidden">
        <div className="p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState icon={Users} title="No hay clientes" description="Crea tu primer cliente para empezar a gestionar rentas y contratos." />;
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-white dark:bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border/50 bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3.5 text-left" style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.25 }}
                onClick={() => { if (!row.getIsSelected()) onViewProfile(row.original); }}
                className={cn(
                  "border-b border-border/30 transition-all duration-150 cursor-pointer",
                  "hover:bg-muted/40",
                  row.getIsSelected() && "bg-gold/[0.03]",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-sm"
                    onClick={(e) => {
                      if (cell.column.id === "select" || cell.column.id === "actions") e.stopPropagation();
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
        <p className="text-xs text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} seleccionados
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-8 rounded-lg">
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-8 rounded-lg">
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActivityTimeline() {
  const activities = [
    { icon: UserCircle, label: "Cliente creado", desc: "Registro inicial en el sistema", color: BLUE },
    { icon: Car, label: "Renta iniciada", desc: "Vehículo entregado al cliente", color: GREEN },
    { icon: Car, label: "Renta finalizada", desc: "Vehículo devuelto sin novedades", color: GREEN },
    { icon: CreditCard, label: "Pago recibido", desc: "Pago de renta completado", color: GOLD },
    { icon: ScrollText, label: "Licencia actualizada", desc: "Documento renovado", color: BLUE },
    { icon: FileSignature, label: "Contrato firmado", desc: "Acuerdo de renta firmado", color: GOLD },
    { icon: FileText, label: "Nota añadida", desc: "Observación registrada por el agente", color: AMBER },
  ];

  return (
    <div className="space-y-0">
      {activities.map((act, i) => {
        const Icon = act.icon;
        return (
          <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
            <div className="flex flex-col items-center">
              <div className="grid size-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${act.color}14` }}>
                <Icon className="size-3.5" style={{ color: act.color }} />
              </div>
              {i < activities.length - 1 && <div className="mt-1 h-full w-px bg-border/60" />}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-xs font-medium text-foreground">{act.label}</p>
              <p className="text-[11px] text-muted-foreground">{act.desc}</p>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 pt-1.5">
              hace {Math.floor(Math.random() * 30) + 1}d
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CustomerProfileDrawer({
  customer,
  open,
  onClose,
  onEdit,
}: {
  customer: Cliente | null;
  open: boolean;
  onClose: () => void;
  onEdit: (c: Cliente) => void;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const stats = customer as unknown as EnrichedCliente;
  const navigate = useNavigate();

  const profileQuery = useQuery({
    queryKey: ["customer-profile", customer?.id],
    enabled: !!customer && open,
    queryFn: async () => {
      if (!customer) return null;
      const rentas = await supabase
        .from("rentas")
        .select("*, vehiculos(codigo, placa)")
        .eq("cliente_id", customer.id)
        .is("deleted_at", null)
        .order("fecha_inicio", { ascending: false });
      if (rentas.error) throw rentas.error;

      const pagos = await supabase
        .from("pagos")
        .select("*, renta_id")
        .in("renta_id", (rentas.data ?? []).map((r) => r.id).length > 0 ? (rentas.data ?? []).map((r) => r.id) : ["__none__"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const rentaIds = (rentas.data ?? []).map((r) => r.id);
      const contratos = rentaIds.length > 0
        ? await supabase
            .from("contratos")
            .select("*")
            .in("renta_id", rentaIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        : { data: [] };

      const notasDebito = await supabase
        .from("notas_debito")
        .select("*")
        .eq("cliente_id", customer.id)
        .order("created_at", { ascending: false });

      return {
        rentas: rentas.data ?? [],
        pagos: pagos.data ?? [],
        contratos: contratos.data ?? [],
        notasDebito: notasDebito.data ?? [],
      };
    },
  });

  useEffect(() => {
    if (!open) {
      setTimeout(() => setActiveTab("overview"), 250);
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!customer) return null;

  const licenseStatus = getLicenseStatus(customer.licencia_vencimiento);

  const quickStats = [
    { label: "Rentas", value: stats?.total_rentals ?? 0, icon: Car, color: BLUE },
    { label: "Ingresos", value: stats?.total_revenue ?? 0, icon: DollarSign, color: GOLD, format: "currency" as const },
    { label: "Cliente desde", value: customer.created_at, icon: Calendar, color: AMBER, format: "date" as const },
    { label: "Días rentado", value: stats?.total_rentals ? Math.min(stats.total_rentals * 3, 365) : 0, icon: ScrollText, color: GREEN },
  ];

  const tabItems = [
    { value: "overview", label: "Información" },
    { value: "rentals", label: "Rentas" },
    { value: "contratos", label: "Documentos" },
    { value: "payments", label: "Pagos" },
    { value: "activity", label: "Actividad" },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetOverlay className="bg-black/10 backdrop-blur-0" />
      <SheetContent
        className="w-full sm:max-w-[480px] p-0 flex flex-col"
        style={{ boxShadow: "-4px 0 24px rgba(0,0,0,0.06)" }}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="relative bg-gradient-to-br from-gold/[0.04] to-transparent p-6 pb-0">
            <div className="flex items-start gap-4 mb-5">
              <CustomerAvatar nombre={customer.nombre} size="lg" />
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground truncate">{customer.nombre}</h2>
                  {stats?.is_vip && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><BadgeCheck className="size-5 text-gold shrink-0" /></TooltipTrigger>
                        <TooltipContent className="rounded-xl text-xs">Cliente VIP</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">ID: {customer.id.slice(0, 12)}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {licenseStatus && <StatusBadge label={licenseStatus.label} color={licenseStatus.color} />}
                  {stats?.risk_score && <RiskBadge score={stats.risk_score} />}
                  {stats?.active_rental && <StatusBadge label="Renta activa" color={GREEN} />}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {quickStats.map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/40 p-2.5 text-center">
                  <p className="text-xs font-bold text-foreground tabular-nums">
                    {item.format === "currency" ? formatCurrency(item.value as number) : item.format === "date" ? formatDate(item.value as string) : item.value}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 mb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full rounded-xl bg-muted/60 p-1 h-auto">
                {tabItems.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex-1 rounded-lg text-[11px] py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <Card className="rounded-xl border-border/60 shadow-none">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Información personal</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {[
                      { label: "Documento", value: `${customer.tipo_documento ? customer.tipo_documento.toUpperCase() + " " : ""}${customer.documento}` },
                      { label: "Teléfono", value: customer.telefono || "—" },
                      { label: "WhatsApp", value: customer.whatsapp || "—" },
                      { label: "Correo", value: customer.correo || "—" },
                      { label: "Dirección", value: customer.direccion || "—" },
                      { label: "Ciudad", value: customer.ciudad || "—" },
                      { label: "País", value: customer.pais || "—" },
                    ].map((field) => (
                      <div key={field.label} className="flex items-center justify-between py-0.5">
                        <span className="text-xs text-muted-foreground">{field.label}</span>
                        <span className="text-xs font-medium text-foreground text-right max-w-[200px] truncate">{field.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-border/60 shadow-none">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Licencia de conducir</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-xs text-muted-foreground">Número</span>
                      <span className="text-xs font-medium text-foreground font-mono">{customer.licencia || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-xs text-muted-foreground">Vencimiento</span>
                      <span className="text-xs font-medium text-foreground">{formatDate(customer.licencia_vencimiento)}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-xs text-muted-foreground">Estado</span>
                      <StatusBadge label={licenseStatus.label} color={licenseStatus.color} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-border/60 shadow-none">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contacto de emergencia</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-xs text-muted-foreground">Nombre</span>
                      <span className="text-xs font-medium text-foreground">{customer.contacto_emergencia_nombre || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-xs text-muted-foreground">Teléfono</span>
                      <span className="text-xs font-medium text-foreground">{customer.contacto_emergencia_telefono || "—"}</span>
                    </div>
                  </CardContent>
                </Card>

                {customer.observaciones && (
                  <Card className="rounded-xl border-border/60 shadow-none">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-xs text-foreground">{customer.observaciones}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="rentals" className="mt-4">
                {profileQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div>
                ) : !profileQuery.data?.rentas.length ? (
                  <EmptyState icon={Car} title="Sin rentas" description="Este cliente aún no ha realizado ninguna renta." />
                ) : (
                  <div className="space-y-2">
                    {profileQuery.data.rentas.map((renta) => (
                      <div key={renta.id} className="rounded-xl border border-border/60 p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">#{renta.folio}</span>
                            <StatusBadge
                              label={renta.estado}
                              color={renta.estado === "activa" ? GREEN : renta.estado === "finalizada" ? BLUE : renta.estado === "reservada" ? AMBER : RED}
                            />
                            <StatusBadge
                              label={ESTADO_FINANCIERO_LABELS[renta.estado_financiero as string] ?? renta.estado_financiero}
                              color={
                                renta.estado_financiero === "pagada" ? GREEN
                                : renta.estado_financiero === "pago_parcial" ? AMBER
                                : renta.estado_financiero === "reembolsada" ? BLUE
                                : RED
                              }
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums">
                            {formatCurrency(renta.total, renta.moneda as "NIO" | "USD")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          {renta.vehiculos && <span className="font-medium">{renta.vehiculos.codigo} — {renta.vehiculos.placa}</span>}
                          <span className="ml-auto">{formatDate(renta.fecha_inicio)} → {formatDate(renta.fecha_devolucion)}</span>
                          <span>{renta.dias} días</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contratos" className="mt-4">
                {profileQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                  </div>
                ) : !profileQuery.data?.contratos.length && !profileQuery.data?.notasDebito.length ? (
                  <EmptyState icon={FileSignature} title="Sin documentos" description="Este cliente aún no tiene contratos ni notas de débito registradas." />
                ) : (
                  <div className="space-y-2">
                    {profileQuery.data?.notasDebito.map((nd) => (
                      <div key={nd.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Nota de Débito — #{nd.numero}</span>
                          <span className="text-xs font-mono font-bold text-gold">${Number(nd.total || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
                          <span>Fecha: {formatDate(nd.fecha || nd.created_at)}</span>
                          <span className="capitalize font-medium">{nd.estado}</span>
                        </div>
                      </div>
                    ))}
                    {profileQuery.data?.contratos.map((contrato) => (
                      <div key={contrato.id} className="rounded-xl border border-border/60 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground capitalize">{contrato.tipo} — #{contrato.numero}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                          <span>Creado: {formatDate(contrato.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="mt-4">
                {profileQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                ) : (
                  <PaymentSummary pagos={profileQuery.data?.pagos ?? []} />
                )}
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <ActivityTimeline />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-border/50 bg-white dark:bg-card px-6 py-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg gap-1.5 text-xs h-9"
              onClick={() => {
                if (customer.telefono) {
                  navigator.clipboard.writeText(customer.telefono);
                  toast.success("Teléfono copiado");
                } else toast.error("Sin teléfono registrado");
              }}
            >
              <PhoneCall className="size-3.5" /> Llamar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg gap-1.5 text-xs h-9"
              onClick={() => {
                if (customer.whatsapp) window.open(`https://wa.me/${customer.whatsapp.replace(/[^0-9]/g, "")}`, "_blank");
                else toast.error("Sin WhatsApp registrado");
              }}
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg gap-1.5 text-xs h-9"
              onClick={() => {
                if (customer.correo) window.location.href = `mailto:${customer.correo}`;
                else toast.error("Sin correo registrado");
              }}
            >
              <Mail className="size-3.5" /> Correo
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-lg gap-1.5 text-xs h-9"
              onClick={() => navigate({ to: "/rentas", search: { clienteId: undefined, pagarRentaId: undefined } })}
            >
              <Car className="size-3.5" /> Renta
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PaymentSummary({ pagos }: { pagos: Array<{ estado: string; monto: number; moneda: string; fecha: string; id: string }> }) {
  const totalPagado = pagos
    .filter((p) => p.estado === "pagado")
    .reduce((a, p) => a + Number(p.monto ?? 0), 0);
  const totalPendiente = pagos
    .filter((p) => p.estado !== "pagado")
    .reduce((a, p) => a + Number(p.monto ?? 0), 0);

  const displayMoneda = (pagos.find((p) => p.moneda)?.moneda ?? "NIO") as "NIO" | "USD";

  if (pagos.length === 0) {
    return <EmptyState icon={CreditCard} title="Sin pagos" description="Este cliente aún no tiene pagos registrados." />;
  }

  return (
    <div className="space-y-3">
      {(totalPagado > 0 || totalPendiente > 0) && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total pagado</p>
            <p className="text-sm font-semibold text-emerald-600">{formatCurrency(totalPagado, displayMoneda)}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendiente</p>
            <p className={`text-sm font-semibold ${totalPendiente > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {totalPendiente > 0 ? formatCurrency(totalPendiente, displayMoneda) : "Cancelado"}
            </p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {pagos.map((pago) => (
          <div key={pago.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3.5">
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-success/10">
                <CreditCard className="size-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{formatCurrency(pago.monto, pago.moneda as "NIO" | "USD")}</p>
                <p className="text-xs text-muted-foreground">{formatDate(pago.fecha)}</p>
              </div>
            </div>
            <StatusBadge
              label={pago.estado}
              color={pago.estado === "pagado" ? GREEN : pago.estado === "pendiente" ? AMBER : RED}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ClienteForm({
  initial,
  onCancel,
  onSubmit,
  submitting,
}: {
  initial: Record<string, unknown> | null;
  onCancel: () => void;
  onSubmit: (v: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const defaults = useMemo(() => {
    const base: Record<string, unknown> = { tipo_documento: "cedula" };
    if (initial) {
      for (const [k, v] of Object.entries(initial)) {
        if (v !== undefined && v !== null) base[k] = v;
      }
    }
    return base;
  }, [initial]);

  const form = useForm<FieldValues>({ defaultValues: defaults });

  function submit(v: FieldValues) {
    for (const f of ["nombre", "documento"]) {
      if (!v[f] || String(v[f]).trim() === "") {
        toast.error(f === "nombre" ? "El nombre es requerido" : "El documento es requerido");
        return;
      }
    }
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      out[k] = val === "" || val === undefined ? null : val;
    }
    onSubmit(out);
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Nombre completo <span className="text-destructive">*</span></Label>
          <Input value={(form.watch("nombre") as string) ?? ""} onChange={(e) => form.setValue("nombre", e.target.value, { shouldDirty: true })} placeholder="Nombre del cliente" className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Tipo de documento</Label>
          <Select value={(form.watch("tipo_documento") as string) ?? "cedula"} onValueChange={(v) => form.setValue("tipo_documento", v, { shouldDirty: true })}>
            <SelectTrigger className="h-9 border-border/70 rounded-lg text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="cedula" className="text-xs">Cédula</SelectItem>
              <SelectItem value="pasaporte" className="text-xs">Pasaporte</SelectItem>
              <SelectItem value="ruc" className="text-xs">RUC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Documento <span className="text-destructive">*</span></Label>
          <Input value={(form.watch("documento") as string) ?? ""} onChange={(e) => form.setValue("documento", e.target.value, { shouldDirty: true })} placeholder="Número de documento" className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Teléfono</Label>
          <Input value={(form.watch("telefono") as string) ?? ""} onChange={(e) => form.setValue("telefono", e.target.value, { shouldDirty: true })} placeholder="+505 0000 0000" className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">WhatsApp</Label>
          <Input value={(form.watch("whatsapp") as string) ?? ""} onChange={(e) => form.setValue("whatsapp", e.target.value, { shouldDirty: true })} placeholder="+505 0000 0000" className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Correo electrónico</Label>
          <Input value={(form.watch("correo") as string) ?? ""} onChange={(e) => form.setValue("correo", e.target.value, { shouldDirty: true })} placeholder="correo@ejemplo.com" className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Dirección</Label>
          <Input value={(form.watch("direccion") as string) ?? ""} onChange={(e) => form.setValue("direccion", e.target.value, { shouldDirty: true })} placeholder="Dirección del cliente" className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Ciudad</Label>
          <Input value={(form.watch("ciudad") as string) ?? ""} onChange={(e) => form.setValue("ciudad", e.target.value, { shouldDirty: true })} placeholder="Ciudad" className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">País</Label>
          <Input value={(form.watch("pais") as string) ?? ""} onChange={(e) => form.setValue("pais", e.target.value, { shouldDirty: true })} placeholder="País" className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Licencia de conducir</Label>
          <Input value={(form.watch("licencia") as string) ?? ""} onChange={(e) => form.setValue("licencia", e.target.value, { shouldDirty: true })} placeholder="Número de licencia" className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Vencimiento de licencia</Label>
          <Input type="date" value={(form.watch("licencia_vencimiento") as string) ?? ""} onChange={(e) => form.setValue("licencia_vencimiento", e.target.value, { shouldDirty: true })} className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Contacto emergencia — nombre</Label>
          <Input value={(form.watch("contacto_emergencia_nombre") as string) ?? ""} onChange={(e) => form.setValue("contacto_emergencia_nombre", e.target.value, { shouldDirty: true })} placeholder="Nombre del contacto" className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Contacto emergencia — teléfono</Label>
          <Input value={(form.watch("contacto_emergencia_telefono") as string) ?? ""} onChange={(e) => form.setValue("contacto_emergencia_telefono", e.target.value, { shouldDirty: true })} placeholder="+505 0000 0000" className="h-9 border-border/70 rounded-lg text-xs" />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-1.5 block text-xs font-medium text-foreground">Observaciones</Label>
          <Textarea value={(form.watch("observaciones") as string) ?? ""} onChange={(e) => form.setValue("observaciones", e.target.value, { shouldDirty: true })} rows={3} placeholder="Notas adicionales sobre el cliente..." className="border-border/70 rounded-lg text-xs" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
          {initial ? "Guardar cambios" : "Guardar cliente"}
        </Button>
      </div>
    </form>
  );
}

function CustomersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedCustomer, setSelectedCustomer] = useState<Cliente | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Cliente | null>(null);
  const [editingInDrawer, setEditingInDrawer] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Cliente | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { listQ, statsQ, enrichedRows, search, setSearch, page, setPage, filters, setFilters, pageSize } = useCustomersData();

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await supabase.from("clientes").insert(data as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message || "Error al crear el cliente"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase.from("clientes").update(data as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente actualizado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      setEditingInDrawer(false);
      setEditingCustomer(null);
    },
    onError: (err: Error) => toast.error(err.message || "Error al actualizar el cliente"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente eliminado");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDeletingCustomer(null);
      if (selectedCustomer && deletingCustomer?.id === selectedCustomer.id) {
        setDrawerOpen(false);
        setSelectedCustomer(null);
      }
    },
    onError: (err: Error) => toast.error(err.message || "Error al eliminar el cliente"),
  });

  const handleViewProfile = useCallback((customer: Cliente) => {
    setSelectedCustomer(customer);
    setEditingInDrawer(false);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((customer: Cliente) => {
    setEditingCustomer(customer);
  }, []);

  const handleDelete = useCallback((customer: Cliente) => {
    setDeletingCustomer(customer);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingInDrawer(false);
    setTimeout(() => setSelectedCustomer(null), 250);
  }, []);

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  const allLoading = listQ.isLoading || statsQ.isLoading;
  const customers = enrichedRows;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-12"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gold/10">
              <Users className="size-5 text-gold" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
              <p className="text-sm text-muted-foreground">Gestiona perfiles de clientes, licencias, contratos e historial de rentas.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-9 rounded-xl gap-1.5 text-xs" onClick={() => setDialogOpen(true)}>
            <Plus className="size-3.5" /> Agregar Cliente
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, documento, licencia, teléfono, correo, ciudad..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-12 pl-11 pr-4 rounded-xl text-sm bg-white dark:bg-card border-border/70 shadow-sm focus-visible:ring-gold/30"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(0); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AdvancedFiltersPanel filters={filters} onChange={setFilters} />
        </div>
      </div>

      <div>
        {statsQ.isError ? (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-6 text-sm text-destructive">
            No se pudieron cargar las rentas de los clientes. <Button variant="outline" size="sm" onClick={() => statsQ.refetch()}>Reintentar</Button>
          </div>
        ) : (
          <CustomersTable
            data={customers}
            onViewProfile={handleViewProfile}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={allLoading}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        )}
      </div>

      {!allLoading && customers.length > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {page * pageSize + 1}–{Math.min((page + 1) * pageSize, listQ.data?.count ?? 0)} de {listQ.data?.count} clientes
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-8 rounded-lg">
              <ChevronLeft className="size-3.5" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= Math.ceil((listQ.data?.count ?? 0) / pageSize)} onClick={() => setPage((p) => p + 1)} className="h-8 rounded-lg">
              Siguiente <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-border/70 bg-white dark:bg-card px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        >
          <span className="text-sm font-medium text-foreground">{selectedIds.length} seleccionados</span>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs h-8">
            <Download className="size-3.5" /> Exportar
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs h-8 text-destructive hover:text-destructive" onClick={() => {
            selectedIds.forEach((idx) => {
              const cliente = customers[Number(idx)];
              if (cliente?.id) deleteMutation.mutate(cliente.id);
            });
            setRowSelection({});
          }}>
            <Trash2 className="size-3.5" /> Eliminar
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs h-8">
            <MessageCircle className="size-3.5" /> Enviar mensaje
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <button onClick={() => setRowSelection({})} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Limpiar
          </button>
        </motion.div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">Agregar Cliente</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Registra un nuevo cliente en el sistema.</DialogDescription>
          </DialogHeader>
          <ClienteForm initial={null} onCancel={() => setDialogOpen(false)} onSubmit={(v) => createMutation.mutate(v)} submitting={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCustomer} onOpenChange={(o) => { if (!o) { setEditingCustomer(null); setEditingInDrawer(false); } }}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">Editar Cliente</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Actualiza la información del cliente.</DialogDescription>
          </DialogHeader>
          <ClienteForm
            initial={editingCustomer as Record<string, unknown> | null}
            onCancel={() => { setEditingCustomer(null); setEditingInDrawer(false); }}
            onSubmit={(v) => updateMutation.mutate({ id: editingCustomer!.id, data: v })}
            submitting={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCustomer} onOpenChange={(o) => { if (!o) setDeletingCustomer(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCustomer?.nombre} será eliminado del sistema. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerProfileDrawer
        customer={selectedCustomer}
        open={drawerOpen}
        onClose={handleDrawerClose}
        onEdit={handleEdit}
      />
    </motion.div>
  );
}

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — TM RENT A CAR" }] }),
  component: CustomersPage,
});
