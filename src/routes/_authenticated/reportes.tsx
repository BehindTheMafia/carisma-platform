import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, TrendingUp, Car, Users, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { formatCurrency } from "@/lib/format";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function Page() {
  const reportQ = useQuery({
    queryKey: ["reportes-summary"],
    queryFn: async () => {
      const [rentas, pagos, vehiculos, clientes, multas] = await Promise.all([
        supabase.from("rentas").select("estado, total, fecha_inicio, moneda").is("deleted_at", null),
        supabase.from("pagos").select("monto, fecha, moneda, estado").is("deleted_at", null),
        supabase.from("vehiculos").select("estado").is("deleted_at", null),
        supabase.from("clientes").select("id").is("deleted_at", null),
        supabase.from("multas").select("monto, estado, moneda").is("deleted_at", null),
      ]);

      const ingresos = (pagos.data ?? [])
        .filter((p) => p.estado === "pagado")
        .reduce((a, p) => a + Number(p.monto ?? 0), 0);
      const ingresosMes: Record<string, number> = {};
      for (const p of pagos.data ?? []) {
        if (p.estado !== "pagado") continue;
        const d = new Date(p.fecha);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        ingresosMes[key] = (ingresosMes[key] ?? 0) + Number(p.monto ?? 0);
      }
      const ingresosSeries = Object.entries(ingresosMes)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([mes, total]) => ({ mes, total }));

      const flotaEstado: Record<string, number> = {};
      for (const v of vehiculos.data ?? []) flotaEstado[v.estado] = (flotaEstado[v.estado] ?? 0) + 1;
      const flotaPie = Object.entries(flotaEstado).map(([name, value]) => ({ name, value }));

      const rentasEstado: Record<string, number> = {};
      for (const r of rentas.data ?? []) rentasEstado[r.estado] = (rentasEstado[r.estado] ?? 0) + 1;
      const rentasBar = Object.entries(rentasEstado).map(([name, total]) => ({ name, total }));

      const multasPendientes = (multas.data ?? [])
        .filter((m) => m.estado === "pendiente")
        .reduce((a, m) => a + Number(m.monto ?? 0), 0);

      return {
        ingresos,
        ingresosSeries,
        flotaPie,
        rentasBar,
        totalRentas: rentas.data?.length ?? 0,
        totalClientes: clientes.data?.length ?? 0,
        totalVehiculos: vehiculos.data?.length ?? 0,
        multasPendientes,
      };
    },
  });

  const d = reportQ.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="size-6 text-gold" /> Reportes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Indicadores financieros y operativos de TM RENT A CAR.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ingresos totales" value={formatCurrency(d?.ingresos ?? 0, "NIO")} icon={DollarSign} />
        <KpiCard label="Rentas registradas" value={String(d?.totalRentas ?? 0)} icon={TrendingUp} />
        <KpiCard label="Vehículos en flota" value={String(d?.totalVehiculos ?? 0)} icon={Car} />
        <KpiCard label="Clientes activos" value={String(d?.totalClientes ?? 0)} icon={Users} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ingresos (últimos 6 meses)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d?.ingresosSeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => formatCurrency(v, "NIO")} />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Estado de la flota</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d?.flotaPie ?? []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {(d?.flotaPie ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Rentas por estado</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d?.rentasBar ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({ meta: [{ title: "Reportes — TM RENT A CAR" }] }),
  component: Page,
});