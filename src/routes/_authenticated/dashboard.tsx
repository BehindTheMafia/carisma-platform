import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Car,
  CheckCircle2,
  Wrench,
  FileText,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Plus,
  UserPlus,
  FileSignature,
  CreditCard,
  BarChart3,
  Activity,
  Landmark,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { fetchReportesSummary } from "@/lib/reportes-query";
import { formatCurrency, convertCurrency, type Moneda } from "@/lib/format";

const GOLD = "#C89B3C";
const NAVY = "#111827";
const BLUE = "#2563EB";
const GREEN = "#22C55E";
const RED = "#EF4444";
const AMBER = "#F59E0B";

const CHART_COLORS = [GOLD, BLUE, GREEN, AMBER, RED];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TM RENT A CAR" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultEnd = now.toISOString().slice(0, 10);
  const [displayCurrency, setDisplayCurrency] = useState<Moneda>("NIO");

  const configQ = useQuery({
    queryKey: ["configuracion_empresa"],
    queryFn: async () => {
      const { data } = await supabase.from("configuracion_empresa")
        .select("moneda_principal, tipo_cambio").limit(1).maybeSingle();
      return {
        moneda: (data?.moneda_principal ?? "NIO") as Moneda,
        tipoCambio: Number(data?.tipo_cambio ?? 36.5),
      };
    },
  });

  useEffect(() => {
    if (configQ.data) setDisplayCurrency(configQ.data.moneda);
  }, [configQ.data]);

  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const u = await supabase.auth.getUser();
      const userId = u.data?.user?.id;
      if (!userId) return { nombre: "" };
      const { data: p } = await supabase.from("profiles")
        .select("nombre").eq("id", userId).maybeSingle();
      return { nombre: p?.nombre ?? "" };
    },
  });

  const reportQ = useQuery({
    queryKey: ["reportes-summary-v2", defaultStart, defaultEnd],
    staleTime: 30_000,
    queryFn: () => fetchReportesSummary(defaultStart, defaultEnd, configQ.data?.moneda ?? "NIO"),
  });

  const tipoCambio = configQ.data?.tipoCambio ?? 36.5;
  const d = reportQ.data;
  const isLoading = reportQ.isLoading || configQ.isLoading;

  const c = useMemo(() => {
    if (!d) return null;

    const convert = (amount: number, fromMoneda: Record<string, number> | undefined) => {
      if (!fromMoneda) return convertCurrency(amount, "NIO", displayCurrency, tipoCambio);
      let total = 0;
      for (const [m, val] of Object.entries(fromMoneda)) {
        total += convertCurrency(val, m as Moneda, displayCurrency, tipoCambio);
      }
      return Math.round(total * 100) / 100;
    };

    const ingresosConv = convert(d.ingresos, d.ingresosByMoneda);
    const gananciaBrutaConv = ingresosConv - convert(d.costoSubarriendoTotal, d.costoSubarriendoByMoneda);
    const pendientesConv = convert(d.pendientesTotal, d.pendientesByMoneda);
    const egresosConv = convert(d.egresosTotal, d.egresosByMoneda);
    const utilidadNetaConv = ingresosConv - egresosConv;

    const ingresosSeriesConv = d.ingresosSeries.map((s) => ({
      ...s,
      total: convert(s.total, s.moneda),
    }));

    const metodosPagoConv = d.metodosPago.map((m) => ({
      ...m,
      total: convert(m.total, m.moneda),
    }));

    const egresosByCategoriaConv = d.egresosByCategoria.map((e) => ({
      ...e,
      total: convert(e.total, e.moneda),
    }));

    return {
      ...d,
      ingresos: ingresosConv,
      pendientesTotal: pendientesConv,
      gananciaBruta: gananciaBrutaConv,
      egresosTotal: egresosConv,
      utilidadNeta: utilidadNetaConv,
      ingresosSeries: ingresosSeriesConv,
      metodosPago: metodosPagoConv,
      egresosByCategoria: egresosByCategoriaConv,
    };
  }, [d, displayCurrency, tipoCambio]);

  if (isLoading || !c) return <LoadingSkeleton />;

  const today = new Date().toLocaleDateString("es-NI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const quickActions = [
    { label: "Nueva Renta", icon: Plus, to: "/rentas" },
    { label: "Añadir Vehículo", icon: Car, to: "/vehiculos" },
    { label: "Nuevo Cliente", icon: UserPlus, to: "/clientes" },
    { label: "Generar Documento", icon: FileSignature, to: "/documentos" },
    { label: "Registrar Pago", icon: CreditCard, to: "/pagos" },
  ];

  const totalVeh = c.totalVehiculos;
  const pctDisponibles = totalVeh > 0 ? Math.round((c.vehiculosDisponibles / totalVeh) * 100) : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-12">
      {/* SECTION 1: Header */}
      <motion.div variants={item}>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#111827] dark:text-white">
              Buenas {profileQ.data?.nombre?.split(" ")[0] || "días"} 👋
            </h1>
            <p className="text-base text-[#6B7280] dark:text-[#9CA3AF] capitalize mt-1.5">{today}</p>
          </div>
          <div className="flex min-w-0 w-full flex-wrap items-center gap-3 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisplayCurrency(displayCurrency === "NIO" ? "USD" : "NIO")}
              className="h-9 gap-1.5 border-[#E5E7EB] dark:border-[#1F2937] text-xs font-medium hover:border-[#C89B3C]/40 transition-all duration-200"
            >
              <Landmark className="size-3.5" />
              {displayCurrency}
            </Button>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((a) => (
                <Link key={a.to} to={a.to}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 border-[#E5E7EB] dark:border-[#1F2937] text-xs font-medium hover:border-[#C89B3C]/40 hover:text-[#C89B3C] transition-all duration-200"
                  >
                    <a.icon className="size-3.5" />
                    {a.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* SECTION 2: Primary KPIs */}
      <motion.div variants={item} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <PrimaryKpi
          label="Vehículos Disponibles"
          value={String(c.vehiculosDisponibles)}
          sub={`${pctDisponibles}% de ${totalVeh}`}
          trend={c.vehiculosDisponibles > 0 ? "up" : "neutral"}
          icon={CheckCircle2}
          color={GREEN}
          bgClass="from-green-50 to-green-100/40 dark:from-green-950/30 dark:to-green-900/20"
        />
        <PrimaryKpi
          label="Rentas Activas"
          value={String(c.rentasActivas)}
          sub={`${c.rentasReservadas} reservadas`}
          trend={c.rentasActivas > 0 ? "up" : "neutral"}
          icon={Activity}
          color={BLUE}
          bgClass="from-blue-50 to-blue-100/40 dark:from-blue-950/30 dark:to-blue-900/20"
        />
        <PrimaryKpi
          label="Egresos"
          value={formatCurrency(c.egresosTotal, displayCurrency)}
          sub={c.egresosByCategoria.length > 0 ? `${c.egresosByCategoria[0]?.categoria ?? ""} · ${c.egresosByCategoria.length} categorías` : "Sin egresos"}
          trend={c.egresosTotal > 0 ? "down" : "neutral"}
          icon={Wallet}
          color={RED}
          bgClass="from-rose-50 to-rose-100/40 dark:from-rose-950/30 dark:to-rose-900/20"
        />
      </motion.div>

      {/* SECTION 3: Operational Status */}
      <motion.div variants={item}>
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="size-4 text-[#C89B3C]" />
          <h2 className="text-sm font-semibold text-[#111827] dark:text-white">Estado Operativo</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatusBadge label="En mantenimiento" value={c.vehiculosMantenimiento} icon={Wrench} color={AMBER} />
          <StatusBadge label="Próximas devoluciones" value={c.proximasVencer} icon={Calendar} color={BLUE} />
          <StatusBadge label="Seguros por vencer" value={c.segurosVencer.length} icon={ShieldAlert} color={RED} />
          <StatusBadge label="Mantenimientos próximos" value={c.proxMantenimientos.length} icon={AlertTriangle} color={AMBER} />
          <StatusBadge label="Rentas finalizadas" value={c.rentasFinalizadas} icon={CheckCircle2} color={GREEN} />
          <StatusBadge label="Reservadas" value={c.rentasReservadas} icon={FileText} color={BLUE} />
        </div>
      </motion.div>

      {/* SECTION 4: Analytics */}
      <motion.div variants={item} className="grid gap-5 lg:grid-cols-2">
        <PremiumChartCard
          title="Ingresos Mensuales"
          subtitle="Últimos meses"
          gradientId="revGrad"
          gradientColor={GOLD}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={c.ingresosSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v, displayCurrency)} />} cursor={{ stroke: GOLD, strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="total" stroke={GOLD} strokeWidth={2.5} fill="url(#revGrad)" animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </PremiumChartCard>

        <PremiumChartCard
          title="Rentas por Mes"
          subtitle="Volumen de operaciones"
          gradientId="rentGrad"
          gradientColor={BLUE}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={c.rentasSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip formatter={(v: number) => `${v} rentas`} />} cursor={{ fill: "#E5E7EB", fillOpacity: 0.4 }} />
              <Bar dataKey="total" fill={BLUE} radius={[6, 6, 0, 0]} maxBarSize={40} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </PremiumChartCard>
      </motion.div>

      {/* SECTION 5: Top Vehicles + Classification */}
      <motion.div variants={item} className="grid gap-5 lg:grid-cols-2">
        <PremiumCard title="Vehículos Más Rentados" subtitle="Ranking por ingresos" icon={Activity}>
          {c.topVehiculos.length === 0 ? (
            <EmptyState message="Aún no hay datos suficientes para mostrar el ranking de vehículos." />
          ) : (
            <div className="space-y-1">
              {c.topVehiculos.map((v, i) => {
                const maxRentas = c.topVehiculos[0].rentas;
                const pct = maxRentas > 0 ? (v.rentas / maxRentas) * 100 : 0;
                return (
                  <div key={v.nombre} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#1A1A2E]">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#F3F4F6] text-[11px] font-bold text-[#6B7280] dark:bg-[#1F2937] dark:text-[#9CA3AF]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#111827] dark:text-white truncate">{v.nombre}</span>
                        <span className="text-sm font-semibold tabular-nums text-[#6B7280] dark:text-[#9CA3AF]">{v.rentas}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-[#F3F4F6] dark:bg-[#1F2937] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD}CC)` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PremiumCard>

        <PremiumCard title="Clasificación de Ingresos" subtitle="Propios vs Subrentados" icon={CreditCard}>
          {c.metodosPago.length === 0 ? (
            <EmptyState message="Aún no hay datos suficientes." />
          ) : (
            <div className="relative flex h-64 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={c.metodosPago} dataKey="total" nameKey="metodo" innerRadius={60} outerRadius={100} paddingAngle={3} animationDuration={800}>
                    {c.metodosPago.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v, displayCurrency)} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#111827] dark:text-white tabular-nums">{c.metodosPago.length}</p>
                  <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">Tipos</p>
                </div>
              </div>
            </div>
          )}
        </PremiumCard>
      </motion.div>

      {/* SECTION 6: Egresos Breakdown */}
      {c.egresosByCategoria.length > 0 && (
        <motion.div variants={item}>
          <PremiumCard title="Egresos por Categoría" subtitle={`Total: ${formatCurrency(c.egresosTotal, displayCurrency)}`} icon={Wallet}>
            <div className="space-y-3">
              {c.egresosByCategoria.map((e) => {
                const maxTotal = c.egresosByCategoria[0].total;
                const pct = maxTotal > 0 ? (e.total / maxTotal) * 100 : 0;
                const pctOfTotal = c.egresosTotal > 0 ? (e.total / c.egresosTotal) * 100 : 0;
                return (
                  <div key={e.categoria} className="group flex items-center gap-3 round-xl px-3 py-1.5 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#1A1A2E]">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#111827] dark:text-white capitalize">{e.categoria}</span>
                        <span className="text-sm font-semibold tabular-nums text-[#6B7280] dark:text-[#9CA3AF]">
                          {formatCurrency(e.total, displayCurrency)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-2 w-full rounded-full bg-[#F3F4F6] dark:bg-[#1F2937] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${RED}, ${RED}99)` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#9CA3AF] tabular-nums shrink-0">{pctOfTotal.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </PremiumCard>
        </motion.div>
      )}

      {/* SECTION 7: Activity */}
      <motion.div variants={item}>
        <PremiumCard title="Actividad Reciente" subtitle="Resumen del período" icon={Activity}>
          <div className="space-y-0">
            {[
              { icon: Activity, label: "Rentas activas", value: c.rentasActivas, color: BLUE },
              { icon: Car, label: "Vehículos rentados", value: c.vehiculosRentados, color: GOLD },
              { icon: CheckCircle2, label: "Rentas finalizadas", value: c.rentasFinalizadas, color: GREEN },
              { icon: AlertTriangle, label: "Alertas activas", value: c.proxMantenimientos.length + c.segurosVencer.length, color: RED },
            ].map((act, i) => (
              <div key={act.label} className="group flex items-center gap-4 border-b border-[#F3F4F6] dark:border-[#1F2937] py-4 last:border-0">
                <div className="relative flex items-center justify-center">
                  <div className="grid size-10 place-items-center rounded-xl bg-[#F9FAFB] dark:bg-[#1A1A2E] transition-colors group-hover:bg-[#F3F4F6] dark:group-hover:bg-[#1F2937]">
                    <act.icon className="size-4.5" style={{ color: act.color }} />
                  </div>
                  {i < 3 && <div className="absolute -bottom-4 left-1/2 h-3 w-px -translate-x-1/2 bg-[#E5E7EB] dark:bg-[#1F2937]" />}
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#111827] dark:text-white">{act.label}</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">En tiempo real</p>
                  </div>
                  <Badge variant="outline" className="border-[#E5E7EB] dark:border-[#1F2937] text-xs font-semibold tabular-nums" style={{ color: act.color }}>
                    {act.value}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </PremiumCard>
      </motion.div>
    </motion.div>
  );
}

/* ─── Components ─── */

function PrimaryKpi({ label, value, sub, trend, icon: Icon, color, bgClass, }: {
  label: string; value: string; sub: string; trend: "up" | "down" | "neutral";
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string; bgClass: string;
}) {
  return (
    <motion.div whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-[#E5E7EB]/80 dark:border-[#1F2937]/80 bg-white dark:bg-[#0F0F1A] p-5 transition-shadow duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${bgClass} opacity-60 dark:opacity-30`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">{label}</p>
            <p className="text-3xl font-bold tracking-tight text-[#111827] dark:text-white tabular-nums">{value}</p>
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${color}15` }}>
            <Icon className="size-5" style={{ color }} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {trend === "up" && <TrendingUp className="size-3.5 text-[#22C55E]" />}
          {trend === "down" && <TrendingDown className="size-3.5 text-[#EF4444]" />}
          <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">{sub}</span>
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ label, value, icon: Icon, color, }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string;
}) {
  return (
    <motion.div whileHover={{ y: -1, transition: { duration: 0.2 } }}
      className="flex items-center gap-3 rounded-xl border border-[#E5E7EB]/70 dark:border-[#1F2937]/70 bg-white dark:bg-[#0F0F1A] px-4 py-3 transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${color}12` }}>
        <Icon className="size-4" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-[#6B7280] dark:text-[#9CA3AF]">{label}</p>
        <p className="text-base font-bold text-[#111827] dark:text-white tabular-nums">{value}</p>
      </div>
    </motion.div>
  );
}

function PremiumCard({ title, subtitle, icon: Icon, children, }: {
  title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden rounded-2xl border border-[#E5E7EB]/80 dark:border-[#1F2937]/80 bg-white dark:bg-[#0F0F1A] shadow-sm transition-shadow duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-6">
        <div>
          <CardTitle className="text-sm font-semibold text-[#111827] dark:text-white">{title}</CardTitle>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">{subtitle}</p>
        </div>
        <div className="grid size-8 place-items-center rounded-lg bg-[#F9FAFB] dark:bg-[#1A1A2E]">
          <Icon className="size-4 text-[#6B7280] dark:text-[#9CA3AF]" />
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-5">{children}</CardContent>
    </Card>
  );
}

function PremiumChartCard({ title, subtitle, gradientId, gradientColor, children, }: {
  title: string; subtitle: string; gradientId: string; gradientColor: string; children: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden rounded-2xl border border-[#E5E7EB]/80 dark:border-[#1F2937]/80 bg-white dark:bg-[#0F0F1A] shadow-sm transition-shadow duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
      <CardHeader className="pb-2 pt-5 px-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-[#111827] dark:text-white">{title}</CardTitle>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: gradientColor }} />
            <span className="text-[10px] font-medium text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">Total</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-72 px-4 pb-4">{children}</CardContent>
    </Card>
  );
}

function ChartTooltip({ active, payload, label, formatter, }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string; formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#0F0F1A] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
      <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-bold text-[#111827] dark:text-white tabular-nums">{formatter ? formatter(p.value) : p.value}</p>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-[#F9FAFB] dark:bg-[#1A1A2E]">
        <BarChart3 className="size-7 text-[#D1D5DB] dark:text-[#4B5563]" />
      </div>
      <p className="max-w-xs text-sm text-[#6B7280] dark:text-[#9CA3AF]">{message}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-28 rounded-lg" />)}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
      </div>
    </div>
  );
}
