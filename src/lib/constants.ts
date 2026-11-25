export const RENTA_ESTADO_COLORS: Record<string, string> = {
  cotizacion: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  reservada: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  activa: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  finalizada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  cancelada: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
}

export const RENTA_ESTADO_LABELS: Record<string, string> = {
  cotizacion: "Cotización",
  reservada: "Reservada",
  activa: "Activa",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
}

export const VEHICULO_ESTADO_COLORS: Record<string, string> = {
  disponible: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  rentado: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  reservado: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  mantenimiento: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  fuera_servicio: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
}

export const PAGO_ESTADO_COLORS: Record<string, string> = {
  pendiente: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  parcial: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  pagado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
}

export const ESTADO_FINANCIERO_COLORS: Record<string, string> = {
  sin_pagar: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  pago_parcial: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  pagada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  reembolsada: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
}

export const ESTADO_FINANCIERO_LABELS: Record<string, string> = {
  sin_pagar: "Sin pagar",
  pago_parcial: "Pago parcial",
  pagada: "Pagada",
  reembolsada: "Reembolsada",
}

export const EGRESO_CATEGORIA_LABELS: Record<string, string> = {
  devolucion_garantia: "Devolución de garantía (fuera de resultados)",
  combustible: "Combustible",
  mantenimiento: "Mantenimiento",
  lavado: "Lavado y detallado",
  peaje: "Peajes",
  multa: "Multas / infracciones",
  seguro: "Seguros",
  impuesto: "Impuestos / tasas",
  suministro: "Suministros",
  reparacion: "Reparaciones",
  traslado: "Traslados / grúa",
  comision: "Comisiones",
  subarriendo: "Pagos Subrentas / Subarriendos",
  otros: "Otros",
}

export const EGRESO_CATEGORIA_COLORS: Record<string, string> = {
  devolucion_garantia: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  combustible: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  mantenimiento: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  lavado: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  peaje: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  multa: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  seguro: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  impuesto: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  suministro: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  reparacion: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  traslado: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
  comision: "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30",
  subarriendo: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  otros: "bg-neutral-500/15 text-neutral-700 dark:text-neutral-300 border-neutral-500/30",
}
