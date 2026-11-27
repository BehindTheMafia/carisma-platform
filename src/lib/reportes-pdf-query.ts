import { supabase } from "@/integrations/supabase/client";
import { Constants } from "@/integrations/supabase/types";
import { type Moneda, convertCurrency } from "@/lib/format";
import { EGRESO_CATEGORIA_LABELS } from "@/lib/constants";
import { desglosarCobros, enPeriodo, esGastoOperativo } from "@/lib/contabilidad-rentas";

export type PeriodoPreset =
  | "hoy"
  | "ayer"
  | "esta_semana"
  | "semana_anterior"
  | "este_mes"
  | "mes_anterior"
  | "este_ano"
  | "ano_anterior"
  | "personalizado";

export type TipoDocumentoFinanciero = "operativo_completo" | "flota_propia";

export interface ReporteFinancieroFiltros {
  tipoDocumento: TipoDocumentoFinanciero;
  periodoPreset: PeriodoPreset;
  fechaInicio: string;
  fechaFin: string;
  moneda: Moneda;
  vehiculoId?: string;
  clienteSearch?: string;
  metodoPago?: string;
  estadoContrato?: string;
  usuario?: string;
  empresa?: string;
  sucursal?: string;
}

export interface SubarriendoDetalleItem {
  id: string;
  vehiculo: string;
  placa: string;
  cliente: string;
  dias: number;
  costoProveedor: number;
  precioVendido: number;
  utilidad: number;
  margenPct: number;
}

export interface CategoriaEgresoItem {
  categoriaKey: string;
  categoriaLabel: string;
  cantidadMovimientos: number;
  subtotal: number;
}

export interface IngresoDetalleItem {
  concepto: string;
  subtotal: number;
}

export interface DatosReporteFinancieroCalculados {
  filtros: ReporteFinancieroFiltros;
  empresaInfo: {
    nombre: string;
    ruc: string;
    direccion: string;
    telefono: string;
    correo: string;
    logoUrl?: string;
  };
  periodoLabel: string;
  fechaEmision: string;
  usuarioEmisor: string;
  moneda: Moneda;
  tipoCambio: number;

  // Ingresos
  ingresosDetalle: IngresoDetalleItem[];
  totalIngresos: number;

  // Egresos
  egresosCategorizados: CategoriaEgresoItem[];
  totalEgresosOperativos: number;

  // Subarriendos (solo en operativo_completo)
  subarriendosTabla: SubarriendoDetalleItem[];
  totalCostoProveedorSubarriendos: number;
  totalPrecioVendidoSubarriendos: number;
  totalUtilidadSubarriendos: number;

  // Cascada Contable
  utilidadBruta: number;
  utilidadOperativa: number;
  utilidadNeta: number;
  margenNetaPct: number;
}

// ── Auxiliares de fechas para el filtro de período ───────────────────────────
export function getFechasFromPreset(preset: PeriodoPreset, customStart?: string, customEnd?: string): { start: string; end: string; label: string } {
  const today = new Date();
  const formatDateStr = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === "hoy") {
    const s = formatDateStr(today);
    return { start: s, end: s, label: `Hoy (${s})` };
  }

  if (preset === "ayer") {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const s = formatDateStr(yesterday);
    return { start: s, end: s, label: `Ayer (${s})` };
  }

  if (preset === "esta_semana") {
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: formatDateStr(monday),
      end: formatDateStr(sunday),
      label: `Esta Semana (${formatDateStr(monday)} a ${formatDateStr(sunday)})`,
    };
  }

  if (preset === "semana_anterior") {
    const day = today.getDay();
    const diffToLastMonday = today.getDate() - day + (day === 0 ? -6 : 1) - 7;
    const monday = new Date(today.setDate(diffToLastMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: formatDateStr(monday),
      end: formatDateStr(sunday),
      label: `Semana Anterior (${formatDateStr(monday)} a ${formatDateStr(sunday)})`,
    };
  }

  if (preset === "este_mes") {
    const y = today.getFullYear();
    const m = today.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    return {
      start: formatDateStr(firstDay),
      end: formatDateStr(lastDay),
      label: `Este Mes (${firstDay.toLocaleDateString("es-ES", { month: "long", year: "numeric" })})`,
    };
  }

  if (preset === "mes_anterior") {
    const y = today.getFullYear();
    const m = today.getMonth() - 1;
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    return {
      start: formatDateStr(firstDay),
      end: formatDateStr(lastDay),
      label: `Mes Anterior (${firstDay.toLocaleDateString("es-ES", { month: "long", year: "numeric" })})`,
    };
  }

  if (preset === "este_ano") {
    const y = today.getFullYear();
    const firstDay = new Date(y, 0, 1);
    const lastDay = new Date(y, 11, 31);
    return {
      start: formatDateStr(firstDay),
      end: formatDateStr(lastDay),
      label: `Este Año (${y})`,
    };
  }

  if (preset === "ano_anterior") {
    const y = today.getFullYear() - 1;
    const firstDay = new Date(y, 0, 1);
    const lastDay = new Date(y, 11, 31);
    return {
      start: formatDateStr(firstDay),
      end: formatDateStr(lastDay),
      label: `Año Anterior (${y})`,
    };
  }

  const s = customStart || formatDateStr(today);
  const e = customEnd || formatDateStr(today);
  return { start: s, end: e, label: `Personalizado (${s} a ${e})` };
}

// ── Función principal de obtención y cálculo de datos reales ───────────────
export async function obtenerDatosReporteFinanciero(
  filtros: ReporteFinancieroFiltros
): Promise<DatosReporteFinancieroCalculados> {
  const { start, end, label: periodoLabel } = getFechasFromPreset(
    filtros.periodoPreset,
    filtros.fechaInicio,
    filtros.fechaFin
  );

  // 1. Configuración de Empresa
  const { data: configData } = await supabase
    .from("configuracion_empresa")
    .select("*")
    .limit(1)
    .maybeSingle();

  const tipoCambio = Number(configData?.tipo_cambio ?? 36.5);

  const empresaInfo = {
    nombre: configData?.nombre || "Maria Auxiliadora Torres Montalvan (CARISMA RENT A CAR)",
    ruc: configData?.ruc || "4011107950010N",
    direccion: configData?.direccion || "BO. LA REFORMA, POLICIA NACIONAL 2 1/2C E. MASAYA",
    telefono: configData?.telefono || "8386-6806 / 76811323 / 2523-6262",
    correo: configData?.correo || "rentcartm26@gmail.com",
    logoUrl: "/logorent.png",
  };

  // 2. Obtener Vehículos reales
  let vehiculosResult = await supabase
    .from("vehiculos")
    .select("id, marca, modelo, anio, placa, clasificacion, costo_subarriendo, tarifa_diaria")
    .is("deleted_at", null);

  if (vehiculosResult.error) {
    vehiculosResult = await supabase
      .from("vehiculos")
      .select("id, marca, modelo, placa, clasificacion")
      .is("deleted_at", null) as typeof vehiculosResult;
  }

  const rawVehiculos = vehiculosResult.data || [];

  const vehiculosMap = new Map<string, { id: string; nombre: string; placa: string; clasificacion: string; costoSubarriendo: number }>();
  rawVehiculos.forEach((v: any) => {
    vehiculosMap.set(v.id, {
      id: v.id,
      nombre: `${v.marca || ""} ${v.modelo || ""} ${v.anio || ""}`.trim(),
      placa: v.placa || "",
      clasificacion: v.clasificacion || "propio",
      costoSubarriendo: Number(v.costo_subarriendo || 0),
    });
  });

  // 3. Consultas en paralelo para rentas, pagos, egresos y notas de débito
  let rentasQuery = supabase
    .from("rentas")
    .select(`
      id,
      numero_oficial,
      fecha_inicio,
      fecha_devolucion,
      fecha_devolucion_real,
      estado,
      total,
      tarifa,
      dias,
      tarifa_subarriendo,
      vehiculos(clasificacion, costo_subarriendo),
      deposito,
      descuento,
      moneda,
      vehiculo_id,
      deleted_at,
      clientes (nombre)
    `)
    .is("deleted_at", null);

  if (filtros.vehiculoId && filtros.vehiculoId !== "todos") {
    rentasQuery = rentasQuery.eq("vehiculo_id", filtros.vehiculoId);
  }
  if (filtros.estadoContrato && filtros.estadoContrato !== "todos") {
    const estado = Constants.public.Enums.renta_estado.find((value) => value === filtros.estadoContrato);
    if (!estado) throw new Error("Estado de contrato no válido");
    rentasQuery = rentasQuery.eq("estado", estado);
  }

  let pagosQuery = supabase
    .from("pagos")
    .select("id, renta_id, contrato_id, nota_debito_id, monto, moneda, fecha, metodo, estado, referencia, deleted_at, contratos(form_data), notas_debito(numero, estado, deleted_at, cliente:clientes(nombre))")
    .is("deleted_at", null)
    .eq("estado", "pagado");

  if (filtros.metodoPago && filtros.metodoPago !== "todos") {
    const metodo = Constants.public.Enums.pago_metodo.find((value) => value === filtros.metodoPago);
    if (!metodo) throw new Error("Método de pago no válido");
    // El método se filtra después de distribuir todo el historial entre renta y garantía.
  }

  const [rentasRes, pagosRes, egresosRes] = await Promise.all([
    rentasQuery,
    (async () => {
      const full = await pagosQuery;
      if (!full.error || !["42703", "PGRST200"].includes(full.error.code)) return full;
      const legacy = await supabase.from("pagos")
        .select("id, renta_id, contrato_id, monto, moneda, fecha, metodo, estado, referencia, deleted_at, contratos(form_data)")
        .is("deleted_at", null).eq("estado", "pagado");
      return { data: (legacy.data ?? []).map(p => ({ ...p, nota_debito_id: null, notas_debito: null })), error: legacy.error };
    })(),
    supabase
      .from("egresos")
      .select("id, renta_id, fecha, categoria, concepto, descripcion, monto, moneda, responsable, deleted_at")
      .is("deleted_at", null),
  ]);

  for (const result of [rentasRes, pagosRes, egresosRes]) {
    if (result.error) throw result.error;
  }
  const rawRentas = rentasRes.data ?? [];
  const rawEgresos = egresosRes.data ?? [];
  const cobros = desglosarCobros((pagosRes.data ?? []).filter((p): p is typeof p & { renta_id: string } => !!p.renta_id), rawRentas, tipoCambio).filter(p =>
    enPeriodo(p.fecha, start, end) &&
    (!filtros.metodoPago || filtros.metodoPago === "todos" || p.metodo === filtros.metodoPago) &&
    (!filtros.clienteSearch || (p.renta.clientes?.nombre ?? "").toLowerCase().includes(filtros.clienteSearch.toLowerCase())) &&
    (filtros.tipoDocumento !== "flota_propia" || !p.esSubrenta)
  );
  const rentaMap = new Map(rawRentas.map(r => [r.id, r]));
  const proveedorRegistrado = new Set(rawEgresos.filter(e => e.categoria === "subarriendo" && e.renta_id).map(e => e.renta_id));
  const cv = (monto: number, moneda: string) => convertCurrency(Number(monto), moneda as Moneda, filtros.moneda, tipoCambio);
  const ingresosConceptos = (pagosRes.data ?? []).filter(p =>
    !!p.contrato_id && !!p.contratos && enPeriodo(p.fecha, start, end) &&
    (!filtros.metodoPago || filtros.metodoPago === "todos" || p.metodo === filtros.metodoPago) &&
    (!filtros.clienteSearch || String((p.contratos.form_data as Record<string, unknown> | null)?.cliente ?? "").toLowerCase().includes(filtros.clienteSearch.toLowerCase())) &&
    (!filtros.vehiculoId || filtros.vehiculoId === "todos") &&
    (!filtros.estadoContrato || filtros.estadoContrato === "todos")
  ).reduce((sum, p) => sum + cv(p.monto, p.moneda), 0);
  let ingresosRentasPropias = 0;
  let ingresosRentasSubrentadas = 0;
  const subMap = new Map<string, SubarriendoDetalleItem>();
  for (const p of cobros) {
    const ingreso = cv(p.ingreso, p.moneda);
    if (!p.esSubrenta) { ingresosRentasPropias += ingreso; continue; }
    ingresosRentasSubrentadas += ingreso;
    const veh = vehiculosMap.get(p.renta.vehiculo_id);
    const item = subMap.get(p.renta_id) ?? {
      id: p.renta_id, vehiculo: veh?.nombre ?? "Vehículo subrentado", placa: veh?.placa ?? "—",
      cliente: p.renta.clientes?.nombre ?? "Cliente", dias: Number(p.renta.dias),
      costoProveedor: 0, precioVendido: 0, utilidad: 0, margenPct: 0,
    };
    item.precioVendido += ingreso;
    if (!proveedorRegistrado.has(p.renta_id)) item.costoProveedor += cv(p.costoProveedorUSD, "USD");
    subMap.set(p.renta_id, item);
  }
  const egresosCatMap = new Map<string, { count: number; subtotal: number }>();
  let proveedorSinRenta = 0;
  for (const e of rawEgresos) {
    if (!enPeriodo(e.fecha, start, end) || e.categoria === "devolucion_garantia") continue;
    const renta = e.renta_id ? rentaMap.get(e.renta_id) : null;
    if ((filtros.vehiculoId && filtros.vehiculoId !== "todos" || filtros.clienteSearch || filtros.estadoContrato && filtros.estadoContrato !== "todos") && !renta) continue;
    if (filtros.clienteSearch && !renta?.clientes?.nombre?.toLowerCase().includes(filtros.clienteSearch.toLowerCase())) continue;
    if (filtros.tipoDocumento === "flota_propia" && (e.categoria === "subarriendo" || renta?.vehiculos?.clasificacion === "subrentado")) continue;
    if (e.categoria === "subarriendo") {
      let item = e.renta_id ? subMap.get(e.renta_id) : null;
      if (!item && renta) {
        const veh = vehiculosMap.get(renta.vehiculo_id);
        item = { id: renta.id, vehiculo: veh?.nombre ?? "Subrenta", placa: veh?.placa ?? "—",
          cliente: renta.clientes?.nombre ?? "Cliente", dias: Number(renta.dias), costoProveedor: 0,
          precioVendido: 0, utilidad: 0, margenPct: 0 };
        subMap.set(renta.id, item);
      }
      if (item) item.costoProveedor += cv(e.monto, e.moneda);
      else proveedorSinRenta += cv(e.monto, e.moneda);
      continue;
    }
    if (!esGastoOperativo(e.categoria)) continue;
    const cat = e.categoria || "otros";
    const actual = egresosCatMap.get(cat) ?? { count: 0, subtotal: 0 };
    actual.count++;
    actual.subtotal += cv(e.monto, e.moneda);
    egresosCatMap.set(cat, actual);
  }
  const ingresosDetalle: IngresoDetalleItem[] = [
    { concepto: "Rentas de vehículos propios (sin garantías)", subtotal: ingresosRentasPropias },
  ];
  if (ingresosConceptos) ingresosDetalle.push({ concepto: "Facturas por conceptos cobradas", subtotal: ingresosConceptos });
  if (filtros.tipoDocumento === "operativo_completo") {
    ingresosDetalle.push({ concepto: "Cobros por subrentas (sin garantías)", subtotal: ingresosRentasSubrentadas });
  }
  const notasTotal = (pagosRes.data ?? []).filter(p =>
    !!p.nota_debito_id && p.notas_debito?.estado === "emitida" && !p.notas_debito.deleted_at &&
    enPeriodo(p.fecha, start, end) &&
    (!filtros.metodoPago || filtros.metodoPago === "todos" || p.metodo === filtros.metodoPago) &&
    (!filtros.clienteSearch || (p.notas_debito.cliente?.nombre ?? "").toLowerCase().includes(filtros.clienteSearch.toLowerCase())) &&
    (!filtros.vehiculoId || filtros.vehiculoId === "todos") &&
    (!filtros.estadoContrato || filtros.estadoContrato === "todos")
  ).reduce((s, p) => s + cv(p.monto, p.moneda), 0);
  if (notasTotal) ingresosDetalle.push({ concepto: "Notas de débito cobradas", subtotal: notasTotal });
  const totalIngresos = ingresosDetalle.reduce((s, i) => s + i.subtotal, 0);
  const subarriendosTabla = [...subMap.values()].map(item => ({ ...item,
    utilidad: item.precioVendido - item.costoProveedor,
    margenPct: item.precioVendido > 0 ? (item.precioVendido - item.costoProveedor) / item.precioVendido * 100 : 0,
  }));
  const egresosCategorizados: CategoriaEgresoItem[] = [...egresosCatMap.entries()].map(([key, val]) => ({
    categoriaKey: key, categoriaLabel: EGRESO_CATEGORIA_LABELS[key] || key,
    cantidadMovimientos: val.count, subtotal: val.subtotal,
  })).sort((a, b) => b.subtotal - a.subtotal);
  const totalEgresosOperativos = egresosCategorizados.reduce((s, e) => s + e.subtotal, 0);
  const totalCostoProveedorSubarriendos = subarriendosTabla.reduce((s, i) => s + i.costoProveedor, 0) + proveedorSinRenta;
  const totalPrecioVendidoSubarriendos = subarriendosTabla.reduce((s, i) => s + i.precioVendido, 0);
  const totalUtilidadSubarriendos = totalPrecioVendidoSubarriendos - totalCostoProveedorSubarriendos;
  const utilidadBruta = totalIngresos - totalCostoProveedorSubarriendos;
  const utilidadOperativa = utilidadBruta - totalEgresosOperativos;
  const utilidadNeta = utilidadOperativa;
  const margenNetaPct = totalIngresos > 0 ? utilidadNeta / totalIngresos * 100 : 0;

  return {
    filtros,
    empresaInfo,
    periodoLabel,
    fechaEmision: new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    usuarioEmisor: filtros.usuario || "Administrador",
    moneda: filtros.moneda,
    tipoCambio,

    ingresosDetalle,
    totalIngresos,

    egresosCategorizados,
    totalEgresosOperativos,

    subarriendosTabla,
    totalCostoProveedorSubarriendos,
    totalPrecioVendidoSubarriendos,
    totalUtilidadSubarriendos,

    utilidadBruta,
    utilidadOperativa,
    utilidadNeta,
    margenNetaPct,
  };
}
