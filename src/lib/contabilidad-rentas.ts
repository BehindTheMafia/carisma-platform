/** Cobros de clientes: la garantía es un pasivo reembolsable, nunca una venta. */
export type RentaContable = {
  id: string;
  total: number;
  deposito: number;
  moneda: string;
  dias?: number;
  tarifa_subarriendo?: number | null;
  estado?: string;
  deleted_at?: string | null;
  vehiculo_id?: string;
  vehiculos?: { clasificacion?: string; costo_subarriendo?: number | null } | null;
};

export type PagoContable = {
  id: string;
  renta_id: string;
  monto: number;
  moneda: string;
  fecha: string;
  estado?: string;
  deleted_at?: string | null;
};

export const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function fechaContable(fecha: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Managua", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(fecha));
}

export function enPeriodo(fecha: string, desde: string, hasta: string): boolean {
  const dia = fechaContable(fecha);
  return dia >= desde && dia <= hasta;
}

function convertir(monto: number, origen: string, destino: string, tipoCambio: number) {
  if (origen === destino) return monto;
  if (!(tipoCambio > 0)) throw new Error("Tipo de cambio no válido");
  return origen === "USD" ? monto * tipoCambio : monto / tipoCambio;
}

/** Se procesa TODO el historial antes de filtrar fechas o métodos de pago. */
export function desglosarCobros<P extends PagoContable, R extends RentaContable>(
  pagos: P[], rentas: R[], tipoCambio: number,
) {
  const rentasMap = new Map(rentas.filter(r => !r.deleted_at).map(r => [r.id, r]));
  const acumulados = new Map<string, number>();
  return pagos.filter(p => !p.deleted_at && p.estado === "pagado")
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.id.localeCompare(b.id))
    .flatMap(p => {
      const renta = rentasMap.get(p.renta_id);
      if (!renta || renta.estado === "cotizacion" || renta.estado === "cancelada") return [];
      const anterior = acumulados.get(renta.id) ?? 0;
      const montoRenta = convertir(Number(p.monto), p.moneda, renta.moneda, tipoCambio);
      const ingresoRenta = Math.max(0, Math.min(montoRenta, Number(renta.total) - anterior));
      const garantiaAnterior = Math.max(0, anterior - Number(renta.total));
      const garantiaRenta = Math.max(0, Math.min(montoRenta - ingresoRenta, Number(renta.deposito) - garantiaAnterior));
      acumulados.set(renta.id, redondear(anterior + montoRenta));
      const ingreso = redondear(convertir(ingresoRenta, renta.moneda, p.moneda, tipoCambio));
      const garantia = redondear(convertir(garantiaRenta, renta.moneda, p.moneda, tipoCambio));
      const esSubrenta = renta.vehiculos?.clasificacion === "subrentado";
      // La tarifa pactada en la renta prevalece sobre la tarifa actual del vehículo.
      const tarifa = Number(renta.tarifa_subarriendo) > 0
        ? Number(renta.tarifa_subarriendo) : Number(renta.vehiculos?.costo_subarriendo ?? 0);
      const costoProveedorUSD = esSubrenta && renta.total > 0
        ? redondear(Math.max(0, Number(renta.dias ?? 0)) * tarifa * ingresoRenta / renta.total) : 0;
      return [{ ...p, renta, ingreso, garantia,
        excedente: redondear(Number(p.monto) - ingreso - garantia),
        esSubrenta, costoProveedorUSD }];
    });
}

export type EgresoContable = {
  renta_id?: string | null;
  categoria?: string;
  fecha: string;
  monto: number;
  moneda: string;
  deleted_at?: string | null;
};

/** Un pago al proveedor registrado sustituye al costo estimado de esa renta. */
export function costosSubrentaEnPeriodo(
  cobros: { renta_id: string; fecha: string; costoProveedorUSD: number }[],
  egresos: EgresoContable[], desde: string, hasta: string, tipoCambio: number,
) {
  const proveedores = egresos.filter(e => !e.deleted_at && e.categoria === "subarriendo");
  const conPagoProveedor = new Set(proveedores.map(e => e.renta_id).filter(Boolean));
  const estimadoUSD = redondear(cobros.filter(c => !conPagoProveedor.has(c.renta_id) && enPeriodo(c.fecha, desde, hasta))
    .reduce((s, c) => s + c.costoProveedorUSD, 0));
  const registradoUSD = redondear(proveedores.filter(e => enPeriodo(e.fecha, desde, hasta))
    .reduce((s, e) => s + convertir(Number(e.monto), e.moneda, "USD", tipoCambio), 0));
  return { estimadoUSD, registradoUSD, totalUSD: redondear(estimadoUSD + registradoUSD), conPagoProveedor };
}

export function esGastoOperativo(categoria?: string): boolean {
  return categoria !== "subarriendo" && categoria !== "devolucion_garantia";
}
