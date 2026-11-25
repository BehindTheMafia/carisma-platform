
export type EstadoPago = "pendiente" | "parcial" | "pagado"

export type ResumenFinanciero = {
  totalRequerido: number
  totalPagado: number
  saldoPendiente: number
  estado: EstadoPago
  progressPct: number
}

export function calcularEstadoPago(
  totalPagado: number,
  totalRequerido: number,
): EstadoPago {
  if (totalPagado <= 0) return "pendiente"
  if (totalPagado >= totalRequerido) return "pagado"
  return "parcial"
}

export function calcularResumenFinanciero(
  pagos: { monto: number; deleted_at: string | null; estado?: string }[],
  total: number,
  deposito: number,
): ResumenFinanciero {
  const totalPagado = pagos
    .filter((p) => !p.deleted_at && (!p.estado || p.estado === "pagado"))
    .reduce((sum, p) => sum + Number(p.monto), 0)
  const totalRequerido = Number(total) + Number(deposito)
  const saldoPendiente = Math.max(0, totalRequerido - totalPagado)
  const estado = calcularEstadoPago(totalPagado, totalRequerido)
  const progressPct = totalRequerido > 0 ? Math.min(100, (totalPagado / totalRequerido) * 100) : 0
  return { totalRequerido, totalPagado, saldoPendiente, estado, progressPct }
}

export function validarMontoPago(
  monto: number,
  saldoPendiente: number,
): string | null {
  if (monto <= 0) return "El monto debe ser mayor a cero."
  if (monto > saldoPendiente) {
    return `No es posible registrar un pago mayor al saldo pendiente.`
  }
  return null
}

export type SplitSubrenta = {
  costoSubarriendo: number
  utilidad: number
}

export function calcularSplitSubrenta(
  montoPago: number,
  costoSubarriendoTotal: number,
  totalRenta?: number,
): SplitSubrenta {
  if (totalRenta && totalRenta > 0) {
    const ratio = Math.min(1, Math.max(0, costoSubarriendoTotal / totalRenta))
    const costo = montoPago * ratio
    const utilidad = montoPago - costo
    return { costoSubarriendo: costo, utilidad }
  }
  const costo = Math.min(costoSubarriendoTotal, montoPago)
  const utilidad = montoPago - costo
  return { costoSubarriendo: costo, utilidad }
}

/**
 * Calcula el costo total de subarriendo de una renta.
 * Es la única implementación canónica — usada por RentaDetailTabPayments
 * y por el dataset financiero de Reportes.
 *
 * @param dias         Número de días de la renta (renta.dias)
 * @param costoXDia    Tarifa diaria pagada al proveedor (vehiculo.costo_subarriendo)
 */
export function calcularCostoSubrentaRenta(
  dias: number,
  costoXDia: number,
): number {
  return Math.max(0, dias) * Math.max(0, costoXDia)
}
