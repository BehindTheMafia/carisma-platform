import { createFileRoute } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Car, CheckCircle2, Wrench, FileText, Calendar, Clock,
  DollarSign, AlertTriangle, ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/dashboard.functions";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TM RENT A CAR" }] }),
  component: DashboardPage,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function DashboardPage() {
  const fetchDashboard = useServerFn(getDashboardData);
  const { data, isLoading } = useQuery(
    queryOptions({
      queryKey: ["dashboard"],
      queryFn: () => fetchDashboard(),
      staleTime: 30_000,
    }),
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" /><Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen operativo en tiempo real · {new Date().toLocaleDateString("es-NI", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Disponibles" value={data.vehiculos.disponibles} hint={`${data.vehiculos.total} en flota`} icon={CheckCircle2} tone="success" />
        <KpiCard label="Rentados" value={data.vehiculos.rentados} icon={Car} tone="default" />
        <KpiCard label="En mantenimiento" value={data.vehiculos.mantenimiento} icon={Wrench} tone="warning" />
        <KpiCard label="Rentas activas" value={data.rentas.activas} hint={`${data.rentas.reservadas} reservadas`} icon={FileText} tone="info" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ingresos hoy" value={formatCurrency(data.ingresos.hoy)} icon={DollarSign} tone="gold" />
        <KpiCard label="Ingresos semana" value={formatCurrency(data.ingresos.semana)} icon={DollarSign} tone="gold" />
        <KpiCard label="Ingresos mes" value={formatCurrency(data.ingresos.mes)} icon={DollarSign} tone="gold" />
        <KpiCard label="Pagos pendientes" value={formatCurrency(data.ingresos.pendientes)} icon={Clock} tone="warning" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Devoluciones próximas" value={data.rentas.proximas_vencer} hint="Próximos 7 días" icon={Calendar} tone="info" />
        <KpiCard label="Seguros por vencer" value={data.alertas.seguros_vencer} hint="Próximos 30 días" icon={ShieldAlert} tone="destructive" />
        <KpiCard label="Mantenimientos próximos" value={data.alertas.mantenimientos_proximos} hint="Próximos 30 días" icon={AlertTriangle} tone="warning" />
        <KpiCard label="Rentas finalizadas" value={data.rentas.finalizadas} icon={CheckCircle2} tone="success" />
      </div>

      {/* Gráficas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Ingresos por mes</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.ingresos_por_mes}>
                <defs>
                  <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} />
                <Area type="monotone" dataKey="total" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#gradIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Rentas por mes</CardTitle>
            <CardDescription>Volumen de operaciones</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.rentas_por_mes}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Vehículos más rentados</CardTitle>
            <CardDescription>Ranking histórico</CardDescription>
          </CardHeader>
          <CardContent>
            {data.vehiculos_top.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Aún no hay datos suficientes.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.vehiculos_top.map((v, i) => (
                  <li key={v.nombre} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-md bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
                      <span className="text-sm font-medium">{v.nombre}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground">{v.rentas} rentas</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Métodos de pago</CardTitle>
            <CardDescription>Distribución de ingresos</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {data.metodos_pago.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.metodos_pago} dataKey="total" nameKey="metodo" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {data.metodos_pago.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}