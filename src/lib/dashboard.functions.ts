import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DashboardKPIs {
  vehiculos: { total: number; disponibles: number; rentados: number; mantenimiento: number; reservados: number };
  rentas: { activas: number; finalizadas: number; reservadas: number; proximas_vencer: number };
  ingresos: { hoy: number; semana: number; mes: number; pendientes: number };
  alertas: { seguros_vencer: number; mantenimientos_proximos: number };
  ingresos_por_mes: Array<{ mes: string; total: number }>;
  rentas_por_mes: Array<{ mes: string; total: number }>;
  vehiculos_top: Array<{ nombre: string; rentas: number }>;
  metodos_pago: Array<{ metodo: string; total: number }>;
  user: { id: string; nombre: string; email: string; rol: string };
}

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardKPIs> => {
    const { supabase, userId } = context;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Vehículos
    const { data: vehiculos } = await supabase
      .from("vehiculos")
      .select("id, estado, marca, modelo, seguro_vencimiento, proximo_mantenimiento_fecha")
      .is("deleted_at", null);

    const veh = vehiculos ?? [];
    const vehStats = {
      total: veh.length,
      disponibles: veh.filter((v) => v.estado === "disponible").length,
      rentados: veh.filter((v) => v.estado === "rentado").length,
      mantenimiento: veh.filter((v) => v.estado === "mantenimiento").length,
      reservados: veh.filter((v) => v.estado === "reservado").length,
    };

    // Rentas
    const { data: rentas } = await supabase
      .from("rentas")
      .select("id, estado, fecha_devolucion, total, vehiculo_id, created_at")
      .is("deleted_at", null);
    const rs = rentas ?? [];
    const rentaStats = {
      activas: rs.filter((r) => r.estado === "activa").length,
      finalizadas: rs.filter((r) => r.estado === "finalizada").length,
      reservadas: rs.filter((r) => r.estado === "reservada").length,
      proximas_vencer: rs.filter(
        (r) => r.estado === "activa" && r.fecha_devolucion >= now.toISOString() && r.fecha_devolucion <= in7days,
      ).length,
    };

    // Pagos
    const { data: pagos } = await supabase
      .from("pagos")
      .select("monto, metodo, estado, fecha")
      .is("deleted_at", null);
    const ps = pagos ?? [];
    const sum = (xs: typeof ps) => xs.reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const ingresos = {
      hoy: sum(ps.filter((p) => p.fecha >= todayStart && p.estado !== "pendiente")),
      semana: sum(ps.filter((p) => p.fecha >= weekStart && p.estado !== "pendiente")),
      mes: sum(ps.filter((p) => p.fecha >= monthStart && p.estado !== "pendiente")),
      pendientes: sum(ps.filter((p) => p.estado === "pendiente")),
    };

    // Alertas
    const alertas = {
      seguros_vencer: veh.filter((v) => v.seguro_vencimiento && v.seguro_vencimiento <= in30days).length,
      mantenimientos_proximos: veh.filter(
        (v) => v.proximo_mantenimiento_fecha && v.proximo_mantenimiento_fecha <= in30days,
      ).length,
    };

    // Series por mes (últimos 6 meses)
    const months: Array<{ key: string; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("es-NI", { month: "short" }),
      });
    }
    const ingresos_por_mes = months.map((m) => ({
      mes: m.label,
      total: sum(ps.filter((p) => p.fecha?.slice(0, 7) === m.key && p.estado !== "pendiente")),
    }));
    const rentas_por_mes = months.map((m) => ({
      mes: m.label,
      total: rs.filter((r) => r.created_at?.slice(0, 7) === m.key).length,
    }));

    // Top vehículos
    const counts = new Map<string, { nombre: string; rentas: number }>();
    for (const r of rs) {
      const v = veh.find((x) => x.id === r.vehiculo_id);
      if (!v) continue;
      const key = `${v.marca} ${v.modelo}`;
      const c = counts.get(key) ?? { nombre: key, rentas: 0 };
      c.rentas += 1;
      counts.set(key, c);
    }
    const vehiculos_top = [...counts.values()].sort((a, b) => b.rentas - a.rentas).slice(0, 5);

    // Métodos de pago
    const metodos_map = new Map<string, number>();
    for (const p of ps.filter((x) => x.estado !== "pendiente")) {
      metodos_map.set(p.metodo, (metodos_map.get(p.metodo) ?? 0) + Number(p.monto || 0));
    }
    const metodos_pago = [...metodos_map.entries()].map(([metodo, total]) => ({ metodo, total }));

    // User
    const { data: profile } = await supabase.from("profiles").select("nombre, correo").eq("id", userId).maybeSingle();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle();

    return {
      vehiculos: vehStats,
      rentas: rentaStats,
      ingresos,
      alertas,
      ingresos_por_mes,
      rentas_por_mes,
      vehiculos_top,
      metodos_pago,
      user: {
        id: userId,
        nombre: profile?.nombre ?? "",
        email: profile?.correo ?? "",
        rol: roles?.role ?? "administrador",
      },
    };
  });