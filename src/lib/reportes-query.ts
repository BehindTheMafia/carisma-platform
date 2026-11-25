import { supabase } from "@/integrations/supabase/client";
import type { Moneda } from "@/lib/format";
import { desglosarCobros, enPeriodo, fechaContable, costosSubrentaEnPeriodo, esGastoOperativo } from "@/lib/contabilidad-rentas";

export type ReportesRaw = {
  ingresos: number;
  ingresosPrev: number;
  ingresosChange: number;
  ingresosPrevByMoneda: Record<string, number>;
  ingresosPropios: number;
  ingresosSubrentados: number;
  costoSubarriendoTotal: number;
  gananciaBruta: number;
  ingresosByMoneda: Record<string, number>;
  ingresosPropiosByMoneda: Record<string, number>;
  ingresosSubrentadosByMoneda: Record<string, number>;
  costoSubarriendoByMoneda: Record<string, number>;
  ingresosSeries: Array<{ mes: string; total: number; moneda: Record<string, number>; label: string }>;
  metodosPago: Array<{ metodo: string; total: number; moneda: Record<string, number> }>;
  totalVehiculos: number;
  vehiculosDisponibles: number;
  vehiculosRentados: number;
  vehiculosMantenimiento: number;
  vehiculosReservados: number;
  flotaPie: Array<{ name: string; value: number }>;
  occupancyRate: number;
  topVehiculos: Array<{ nombre: string; rentas: number; ingresos: number; plate: string; moneda: Record<string, number> }>;
  proxMantenimientos: Array<{ id: string; vehiculo: string; placa: string; tipo: string; fecha: string; taller: string; costo: number }>;
  segurosVencer: Array<{ id: string; vehiculo: string; placa: string; aseguradora: string; fechaVencimiento: string; costo: number }>;
  totalRentas: number;
  rentasActivas: number;
  rentasFinalizadas: number;
  rentasReservadas: number;
  rentasCotizacion: number;
  totalClientes: number;
  avgRentalValue: number;
  avgDuration: number;
  pendientesTotal: number;
  pendientesByMoneda: Record<string, number>;
  rentasSeries: Array<{ mes: string; total: number; label: string }>;
  occupancySeries: Array<{ mes: string; total: number; label: string; occupancy: number }>;
  sparklineData: number[];
  rentabilidadSeries: Array<{
    mes: string;
    propios: number;
    subrentados: number;
    costoSubarriendo: number;
    propiosMoneda: Record<string, number>;
    subrentadosMoneda: Record<string, number>;
    label: string;
  }>;
  proximasVencer: number;
  egresosTotal: number;
  egresosOperativos: number;
  egresosSubrentas: number;
  egresosPrev: number;
  egresosChange: number;
  egresosByMoneda: Record<string, number>;
  egresosOperativosByMoneda: Record<string, number>;
  egresosSubrentasByMoneda: Record<string, number>;
  egresosByCategoria: Array<{ categoria: string; total: number; moneda: Record<string, number> }>;
  utilidadNeta: number;
  garantiasByMoneda: Record<string, number>;
};

export async function fetchReportesSummary(
  dateFrom: string,
  dateTo: string,
  monedaPrincipal: Moneda = "NIO",
): Promise<ReportesRaw> {
  const rangeFrom = new Date(dateFrom).toISOString();
  const rangeTo = new Date(new Date(dateTo).getTime() + 86400000).toISOString();

  const durationMs = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
  const prevRangeFrom = new Date(new Date(dateFrom).getTime() - durationMs).toISOString();
  const prevDateFrom = new Date(new Date(dateFrom).getTime() - durationMs - 86400000).toISOString().slice(0, 10);
  const prevDateTo = new Date(new Date(dateFrom).getTime() - 86400000).toISOString().slice(0, 10);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const in30 = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const in60 = new Date(today.getTime() + 60 * 86400000).toISOString().slice(0, 10);
  const in7 = new Date(today.getTime() + 7 * 86400000).toISOString();

  const [rentas, rentasPrev, clientes, mantenimientos, seguros, pagosPendientesQ, egresosQ, egresosPrevQ, notasDebitoQ, notasDebitoPrevQ, pagosQ] =
    await Promise.all([
      supabase
        .from("rentas")
        .select("id, estado, vehiculo_id, fecha_inicio, fecha_devolucion, fecha_devolucion_real, total, deposito, moneda, dias, tarifa_subarriendo, vehiculos(clasificacion,costo_subarriendo)")
        .is("deleted_at", null),

      supabase
        .from("rentas")
        .select("id, estado, vehiculo_id, fecha_inicio, fecha_devolucion, fecha_devolucion_real, total, moneda")
        .is("deleted_at", null)
        .lt("fecha_inicio", rangeFrom)
        .gte("fecha_devolucion", prevRangeFrom),

      supabase.from("clientes").select("id, nombre, correo, telefono").is("deleted_at", null),

      supabase
        .from("mantenimientos")
        .select("id, tipo, fecha, taller, vehiculo_id")
        .is("deleted_at", null)
        .gte("fecha", todayStr)
        .lte("fecha", in30)
        .order("fecha"),

      supabase
        .from("seguros")
        .select("id, aseguradora, fecha_vencimiento, vehiculo_id")
        .eq("activo", true)
        .is("deleted_at", null)
        .gte("fecha_vencimiento", todayStr)
        .lte("fecha_vencimiento", in60)
        .order("fecha_vencimiento"),

      supabase
        .from("pagos")
        .select("monto, moneda, estado")
        .is("deleted_at", null)
        .eq("estado", "pendiente"),

      supabase
        .from("egresos")
        .select("monto, moneda, categoria, renta_id, fecha")
        .is("deleted_at", null),

      supabase
        .from("egresos")
        .select("monto, moneda, categoria")
        .is("deleted_at", null)
        .gte("fecha", prevRangeFrom.slice(0, 10))
        .lt("fecha", dateFrom),

      supabase
        .from("notas_debito")
        .select("total, moneda, fecha")
        .eq("estado", "emitida")
        .gte("fecha", dateFrom)
        .lte("fecha", dateTo),

      supabase
        .from("notas_debito")
        .select("total, moneda, fecha")
        .eq("estado", "emitida")
        .gte("fecha", prevRangeFrom.slice(0, 10))
        .lt("fecha", dateFrom),

      supabase
        .from("pagos")
        .select("id, renta_id, fecha, monto, moneda, metodo, estado, deleted_at")
        .is("deleted_at", null)
        .eq("estado", "pagado"),
    ]);

  for (const result of [rentas, pagosQ, egresosQ, notasDebitoQ, notasDebitoPrevQ]) {
    if (result.error) throw result.error;
  }
  const configResult = await supabase.from("configuracion_empresa").select("tipo_cambio").limit(1).maybeSingle();
  if (configResult.error) throw configResult.error;
  const cobros = desglosarCobros(pagosQ.data ?? [], rentas.data ?? [], Number(configResult.data?.tipo_cambio ?? 36.5));
  const cobrosPeriodo = cobros.filter(p => enPeriodo(p.fecha, dateFrom, dateTo));
  const cobrosPrev = cobros.filter(p => enPeriodo(p.fecha, prevDateFrom, prevDateTo));
  const rentasCobradas = cobrosPeriodo.map(p => ({ ...p.renta, total: p.ingreso, moneda: p.moneda, fecha_devolucion: p.fecha, costoProveedorUSD: p.costoProveedorUSD }));
  const costosProveedor = costosSubrentaEnPeriodo(cobros, egresosQ.data ?? [], dateFrom, dateTo, Number(configResult.data?.tipo_cambio ?? 36.5));

  let vehiculosResult = await supabase
    .from("vehiculos")
    .select("id, marca, modelo, estado, anio, placa, clasificacion, costo_subarriendo, tarifa_diaria")
    .is("deleted_at", null);

  if (vehiculosResult.error) {
    vehiculosResult = await supabase
      .from("vehiculos")
      .select("id, marca, modelo, estado, anio, placa, clasificacion")
      .is("deleted_at", null) as typeof vehiculosResult;
  }

  const rs = (rentas.data ?? []).filter(r => r.fecha_inicio < rangeTo && r.fecha_devolucion >= rangeFrom);
  const rsPrev = rentasPrev.data ?? [];
  const vs = vehiculosResult.data ?? [];

  const vehMap = new Map(
    vs.map((v) => [
      v.id,
      {
        name: `${v.marca} ${v.modelo}`,
        plate: v.placa ?? "",
        year: v.anio ?? "",
        clasificacion: v.clasificacion ?? "propio",
        costoSubarriendo: Number(v.costo_subarriendo ?? 0),
        tarifaDiaria: Number(v.tarifa_diaria ?? 0),
      },
    ]),
  );

  const rsFinalizadas = rs.filter(
    (r) => r.estado === "finalizada" && r.fecha_devolucion >= rangeFrom && r.fecha_devolucion < rangeTo,
  );
  const rsPrevFinalizadas = rsPrev.filter(
    (r) => r.estado === "finalizada" && r.fecha_devolucion >= prevRangeFrom && r.fecha_devolucion < rangeFrom,
  );

  const sumByMoneda = (rows: Array<{ total?: unknown; moneda?: unknown }>): Record<string, number> => {
    const acc: Record<string, number> = {};
    for (const row of rows) {
      const m = (row.moneda ?? "NIO") as string;
      acc[m] = (acc[m] ?? 0) + Number(row.total ?? 0);
    }
    return acc;
  };

  const mergeByMoneda = (...maps: Record<string, number>[]): Record<string, number> => {
    const acc: Record<string, number> = {};
    for (const map of maps) {
      for (const [m, v] of Object.entries(map)) acc[m] = (acc[m] ?? 0) + v;
    }
    return acc;
  };

  const ndCurrentByMoneda = sumByMoneda(notasDebitoQ.data ?? []);
  const ndPrevByMoneda = sumByMoneda(notasDebitoPrevQ.data ?? []);
  const ndTotalCurrent = Object.values(ndCurrentByMoneda).reduce((a, v) => a + v, 0);
  const ndTotalPrev = Object.values(ndPrevByMoneda).reduce((a, v) => a + v, 0);

  const ingresosRentasByMoneda = sumByMoneda(cobrosPeriodo.map(p => ({ total: p.ingreso, moneda: p.moneda })));
  const ingresosRentasPrevByMoneda = sumByMoneda(cobrosPrev.map(p => ({ total: p.ingreso, moneda: p.moneda })));

  const ingresosByMoneda = mergeByMoneda(ndCurrentByMoneda, ingresosRentasByMoneda);
  const ingresosPrevByMoneda = mergeByMoneda(ndPrevByMoneda, ingresosRentasPrevByMoneda);

  const ingresos = Object.values(ingresosByMoneda).reduce((a, v) => a + v, 0);
  const ingresosPrev = Object.values(ingresosPrevByMoneda).reduce((a, v) => a + v, 0);
  const ingresosChange =
    ingresosPrev > 0 ? ((ingresos - ingresosPrev) / ingresosPrev) * 100 : 0;

  let ingresosPropios = ndTotalCurrent;
  let ingresosSubrentados = 0;
  let costoSubarriendoTotal = 0;

  const ingresosPropiosByMoneda: Record<string, number> = { ...ndCurrentByMoneda };
  const ingresosSubrentadosByMoneda: Record<string, number> = {};

  const diasRenta = (r: { fecha_inicio?: string; fecha_devolucion?: string }): number =>
    r.fecha_inicio && r.fecha_devolucion
      ? Math.max(
          1,
          Math.ceil(
            (new Date(r.fecha_devolucion).getTime() - new Date(r.fecha_inicio).getTime()) / 86400000,
          ),
        )
      : 0;

  for (const r of rentasCobradas) {
    const veh = vehMap.get(r.vehiculo_id);
    const totalRenta = Number(r.total ?? 0);
    const rMoneda = (r.moneda ?? "NIO") as string;

    if (veh && veh.clasificacion === "subrentado") {
      ingresosSubrentados += totalRenta;
      ingresosSubrentadosByMoneda[rMoneda] = (ingresosSubrentadosByMoneda[rMoneda] ?? 0) + totalRenta;
      costoSubarriendoTotal += r.costoProveedorUSD;
    } else {
      ingresosPropios += totalRenta;
      ingresosPropiosByMoneda[rMoneda] = (ingresosPropiosByMoneda[rMoneda] ?? 0) + totalRenta;
    }
  }
  costoSubarriendoTotal = costosProveedor.totalUSD;
  const costoSubarriendoByMoneda: Record<string, number> = { USD: costoSubarriendoTotal };
  const gananciaBruta = ingresos - costoSubarriendoTotal;

  const avgRentalValue =
    rsFinalizadas.length > 0 ? ingresos / rsFinalizadas.length : 0;

  const totalDurationDays = rsFinalizadas.reduce((sum, r) => {
    if (r.fecha_inicio && (r.fecha_devolucion || r.fecha_devolucion_real)) {
      const end = r.fecha_devolucion_real ?? r.fecha_devolucion;
      const diff = new Date(end).getTime() - new Date(r.fecha_inicio).getTime();
      return sum + Math.max(1, Math.round(diff / 86400000));
    }
    return sum;
  }, 0);
  const avgDuration =
    rsFinalizadas.length > 0 ? totalDurationDays / rsFinalizadas.length : 0;

  const ingresosMes: Record<string, { total: number; moneda: Record<string, number> }> = {};
  for (const r of rentasCobradas) {
    if (!r.fecha_devolucion) continue;
    const key = fechaContable(r.fecha_devolucion).slice(0, 7);
    if (!ingresosMes[key]) ingresosMes[key] = { total: 0, moneda: {} };
    const val = Number(r.total ?? 0);
    const rMoneda = (r.moneda ?? "NIO") as string;
    ingresosMes[key].total += val;
    ingresosMes[key].moneda[rMoneda] = (ingresosMes[key].moneda[rMoneda] ?? 0) + val;
  }
  const ingresosSeries = Object.entries(ingresosMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([mes, v]) => ({
      mes,
      total: v.total,
      moneda: v.moneda,
      label: new Date(mes + "-01").toLocaleDateString("es-NI", {
        month: "short",
        year: "2-digit",
      }),
    }));

  const rentasMes: Record<string, number> = {};
  for (const r of rs) {
    if (r.estado === "cancelada" || r.estado === "cotizacion") continue;
    if (!r.fecha_devolucion) continue;
    const d = new Date(r.fecha_devolucion);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    rentasMes[key] = (rentasMes[key] ?? 0) + 1;
  }
  const rentasSeries = Object.entries(rentasMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([mes, total]) => ({
      mes,
      total,
      label: new Date(mes + "-01").toLocaleDateString("es-NI", {
        month: "short",
        year: "2-digit",
      }),
    }));

  const occupancySeries = rentasSeries.map((item) => {
    const [y, m] = item.mes.split("-").map(Number);
    const monthStart = Date.UTC(y, m - 1, 1);
    const monthEnd = Date.UTC(y, m, 1);
    const daysInMonth = (monthEnd - monthStart) / 86400000;
    let rentedDays = 0;
    for (const r of rs) {
      if (r.estado !== "activa") continue;
      const start = new Date(r.fecha_inicio).getTime();
      const end = new Date(r.fecha_devolucion).getTime();
      const ovStart = Math.max(start, monthStart);
      const ovEnd = Math.min(end, monthEnd);
      if (ovEnd > ovStart) rentedDays += (ovEnd - ovStart) / 86400000;
    }
    const occupancy =
      vs.length > 0 ? Math.min(100, Math.round((rentedDays / (daysInMonth * vs.length)) * 100)) : 0;
    return { ...item, occupancy };
  });

  const metodoLabels: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
  };
  const metodosMap = new Map<string, { total: number; moneda: Record<string, number> }>();
  for (const p of cobrosPeriodo) {
    const metodo = (p.metodo ?? "efectivo") as string;
    const pMoneda = (p.moneda ?? "NIO") as string;
    const val = p.ingreso;
    const entry = metodosMap.get(metodo) ?? { total: 0, moneda: {} };
    entry.total += val;
    entry.moneda[pMoneda] = (entry.moneda[pMoneda] ?? 0) + val;
    metodosMap.set(metodo, entry);
  }
  const metodosPago = [...metodosMap.entries()]
    .map(([metodo, v]) => ({ metodo: metodoLabels[metodo] ?? metodo, total: v.total, moneda: v.moneda }))
    .sort((a, b) => b.total - a.total);

  const vehStats = {
    total: vs.length,
    disponibles: 0,
    rentados: 0,
    mantenimiento: 0,
    reservados: 0,
  };
  for (const v of vs) {
    if (v.estado === "disponible") vehStats.disponibles++;
    else if (v.estado === "rentado") vehStats.rentados++;
    else if (v.estado === "mantenimiento") vehStats.mantenimiento++;
    else if (v.estado === "reservado") vehStats.reservados++;
  }
  const flotaEstado: Record<string, number> = {};
  for (const v of vs) flotaEstado[v.estado] = (flotaEstado[v.estado] ?? 0) + 1;
  const flotaPie = Object.entries(flotaEstado).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const occupancyRate =
    vehStats.total > 0 ? Math.round((vehStats.rentados / vehStats.total) * 100) : 0;

  const rentasEstado: Record<string, number> = {};
  for (const r of rs) {
    rentasEstado[r.estado] = (rentasEstado[r.estado] ?? 0) + 1;
  }

  const vehCounts = new Map<
    string,
    { nombre: string; rentas: number; ingresos: number; plate: string; moneda: Record<string, number> }
  >();
  for (const r of rentasCobradas) {
    const v = vehMap.get(r.vehiculo_id);
    if (!v) continue;
    const c = vehCounts.get(r.vehiculo_id) ?? {
      nombre: v.name,
      rentas: 0,
      ingresos: 0,
      plate: v.plate,
      moneda: {},
    };
    const val = Number(r.total ?? 0);
    const rMoneda = (r.moneda ?? "NIO") as string;
    c.rentas += 1;
    c.ingresos += val;
    c.moneda[rMoneda] = (c.moneda[rMoneda] ?? 0) + val;
    vehCounts.set(r.vehiculo_id, c);
  }
  const topVehiculos = [...vehCounts.values()]
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 5);

  const proxMantenimientos = (mantenimientos.data ?? []).map((m) => ({
    id: m.id,
    vehiculo: vehMap.get(m.vehiculo_id)?.name ?? "Desconocido",
    placa: vehMap.get(m.vehiculo_id)?.plate ?? "",
    tipo: m.tipo,
    fecha: m.fecha,
    taller: m.taller ?? "",
    costo: 0,
  }));

  const segurosVencer = (seguros.data ?? []).map((s) => ({
    id: s.id,
    vehiculo: vehMap.get(s.vehiculo_id)?.name ?? "Desconocido",
    placa: vehMap.get(s.vehiculo_id)?.plate ?? "",
    aseguradora: s.aseguradora,
    fechaVencimiento: s.fecha_vencimiento,
    costo: 0,
  }));

  const pendientesTotal = (pagosPendientesQ.data ?? []).reduce(
    (a, p) => a + Number(p.monto ?? 0),
    0,
  );

  const pendientesByMoneda: Record<string, number> = {};
  for (const p of pagosPendientesQ.data ?? []) {
    const pMoneda = (p.moneda ?? "NIO") as string;
    pendientesByMoneda[pMoneda] = (pendientesByMoneda[pMoneda] ?? 0) + Number(p.monto ?? 0);
  }

  const sparklineData = ingresosSeries.map((i) => i.total);

  const rentabilidadMes: Record<
    string,
    { propios: number; subrentados: number; costoSubarriendo: number; propiosMoneda: Record<string, number>; subrentadosMoneda: Record<string, number> }
  > = {};
  for (const r of rentasCobradas) {
    if (!r.fecha_devolucion) continue;
    const key = fechaContable(r.fecha_devolucion).slice(0, 7);
    if (!rentabilidadMes[key]) rentabilidadMes[key] = { propios: 0, subrentados: 0, costoSubarriendo: 0, propiosMoneda: {}, subrentadosMoneda: {} };
    const totalRenta = Number(r.total ?? 0);
    const rMoneda = (r.moneda ?? "NIO") as string;
    const veh = vehMap.get(r.vehiculo_id);
    if (veh && veh.clasificacion === "subrentado") {
      rentabilidadMes[key].subrentados += totalRenta;
      rentabilidadMes[key].subrentadosMoneda[rMoneda] = (rentabilidadMes[key].subrentadosMoneda[rMoneda] ?? 0) + totalRenta;
      rentabilidadMes[key].costoSubarriendo += r.costoProveedorUSD;
    } else {
      rentabilidadMes[key].propios += totalRenta;
      rentabilidadMes[key].propiosMoneda[rMoneda] = (rentabilidadMes[key].propiosMoneda[rMoneda] ?? 0) + totalRenta;
    }
  }
  const rentabilidadSeries = Object.entries(rentabilidadMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([mes, vals]) => ({
      mes,
      propios: vals.propios,
      subrentados: vals.subrentados,
      costoSubarriendo: vals.costoSubarriendo,
      propiosMoneda: vals.propiosMoneda,
      subrentadosMoneda: vals.subrentadosMoneda,
      label: new Date(mes + "-01").toLocaleDateString("es-NI", {
        month: "short",
        year: "2-digit",
      }),
    }));

  const proximasVencer = rs.filter(
    (r) => r.estado === "activa" && r.fecha_devolucion >= today.toISOString() && r.fecha_devolucion <= in7,
  ).length;

  const egresosByMoneda: Record<string, number> = { USD: costosProveedor.totalUSD };
  const egresosOperativosByMoneda: Record<string, number> = {};
  const egresosSubrentasByMoneda: Record<string, number> = { ...costoSubarriendoByMoneda };
  const egresosCategoriaMap = new Map<string, { total: number; moneda: Record<string, number> }>();

  let registeredSubarriendosMonto = 0;
  let registeredOperativosMonto = 0;

  for (const e of egresosQ.data ?? []) {
    if (!enPeriodo(e.fecha, dateFrom, dateTo) || e.categoria === "devolucion_garantia") continue;
    const eMoneda = (e.moneda ?? "NIO") as string;
    const eMonto = Number(e.monto ?? 0);

    const cat = e.categoria ?? "otros";
    if (cat === "subarriendo") {
      registeredSubarriendosMonto += eMonto;
    } else {
      egresosByMoneda[eMoneda] = (egresosByMoneda[eMoneda] ?? 0) + eMonto;
      registeredOperativosMonto += eMonto;
      egresosOperativosByMoneda[eMoneda] = (egresosOperativosByMoneda[eMoneda] ?? 0) + eMonto;
    }

    const entry = egresosCategoriaMap.get(cat) ?? { total: 0, moneda: {} };
    entry.total += eMonto;
    entry.moneda[eMoneda] = (entry.moneda[eMoneda] ?? 0) + eMonto;
    egresosCategoriaMap.set(cat, entry);
  }
  const egresosByCategoria = [...egresosCategoriaMap.entries()]
    .map(([categoria, v]) => ({ categoria, total: v.total, moneda: v.moneda }))
    .sort((a, b) => b.total - a.total);

  const egresosOperativos = registeredOperativosMonto;
  const egresosSubrentas = costoSubarriendoTotal;
  const egresosTotal = egresosOperativos + egresosSubrentas;
  const costosPrev = costosSubrentaEnPeriodo(cobros, egresosQ.data ?? [], prevDateFrom, prevDateTo, Number(configResult.data?.tipo_cambio ?? 36.5));
  const egresosPrev = costosPrev.totalUSD + (egresosPrevQ.data ?? []).filter(e => esGastoOperativo(e.categoria)).reduce((a, e) => a + Number(e.monto ?? 0), 0);
  const egresosChange = egresosPrev > 0 ? ((egresosTotal - egresosPrev) / egresosPrev) * 100 : 0;

  const utilidadNeta = ingresos - egresosTotal;

  return {
    ingresos,
    ingresosPrev,
    ingresosChange,
    ingresosPrevByMoneda,
    ingresosPropios,
    ingresosSubrentados,
    costoSubarriendoTotal,
    gananciaBruta,
    ingresosByMoneda,
    ingresosPropiosByMoneda,
    ingresosSubrentadosByMoneda,
    costoSubarriendoByMoneda,
    ingresosSeries,
    metodosPago,
    totalVehiculos: vehStats.total,
    vehiculosDisponibles: vehStats.disponibles,
    vehiculosRentados: vehStats.rentados,
    vehiculosMantenimiento: vehStats.mantenimiento,
    vehiculosReservados: vehStats.reservados,
    flotaPie,
    occupancyRate,
    topVehiculos,
    proxMantenimientos,
    segurosVencer,
    totalRentas: rs.length,
    rentasActivas: rs.filter((r) => r.estado === "activa").length,
    rentasFinalizadas: rsFinalizadas.length,
    rentasReservadas: rs.filter((r) => r.estado === "reservada").length,
    rentasCotizacion: rs.filter((r) => r.estado === "cotizacion").length,
    totalClientes: (clientes.data ?? []).length,
    avgRentalValue,
    avgDuration,
    pendientesTotal,
    pendientesByMoneda,
    rentasSeries,
    occupancySeries,
    sparklineData,
    rentabilidadSeries,
    proximasVencer,
    egresosTotal,
    egresosOperativos,
    egresosSubrentas,
    egresosPrev,
    egresosChange,
    egresosByMoneda,
    egresosOperativosByMoneda,
    egresosSubrentasByMoneda,
    egresosByCategoria,
    utilidadNeta,
    garantiasByMoneda: sumByMoneda(cobrosPeriodo.map(p => ({ total: p.garantia, moneda: p.moneda }))),
  };
}
