import { z } from "zod";
import { convertCurrency, type Moneda } from "./format.ts";

export const conceptoFacturaSchema = z.object({
  id: z.string().min(1),
  descripcion: z.string().trim().min(1, "Escribe la descripción de cada concepto").max(500, "Cada concepto admite hasta 500 caracteres"),
  cantidad: z.number().finite().positive("La cantidad debe ser mayor a cero").max(1000000),
  precioUnitario: z.number().finite().nonnegative("El precio no puede ser negativo").max(1000000),
});

export type ConceptoFactura = z.infer<typeof conceptoFacturaSchema>;

export const facturaConceptosSchema = z.object({
  cliente: z.string().trim().min(1, "Escribe o selecciona el cliente"),
  monedaConceptos: z.enum(["USD", "NIO"]).optional(),
  tasa: z.coerce.number().finite().positive("La tasa de cambio debe ser mayor a cero"),
  conceptosFactura: z.array(conceptoFacturaSchema).min(1, "Agrega al menos un concepto").max(20, "Puedes agregar hasta 20 conceptos"),
}).refine((data) => calcularTotalConceptos(data.conceptosFactura) > 0, {
  message: "El total de la factura debe ser mayor a cero",
  path: ["conceptosFactura"],
});

export function esFacturaPorConceptos(data: { facturaModo?: string; docType?: string }): boolean {
  return data.facturaModo === "conceptos" && (!data.docType || data.docType === "factura");
}

export function calcularImporteConcepto(concepto: Pick<ConceptoFactura, "cantidad" | "precioUnitario">): number {
  const importe = Number(concepto.cantidad) * Number(concepto.precioUnitario);
  const centavos = importe * 100;
  return Number.isFinite(centavos) ? Math.round(centavos + Number.EPSILON * Math.abs(centavos)) / 100 : 0;
}

export function calcularTotalConceptos(conceptos: ConceptoFactura[] = []): number {
  return conceptos.reduce((total, concepto) => total + Math.round(calcularImporteConcepto(concepto) * 100), 0) / 100;
}

/** Los abonos en otra moneda se convierten a la tasa guardada en la factura. */
export function saldoFacturaConceptos(
  total: number, monedaFactura: Moneda, tasa: number,
  pagos: ReadonlyArray<{ monto: number; moneda: Moneda }>,
): { pagado: number; saldo: number } {
  const pagado = pagos.reduce((sum, pago) => sum + convertCurrency(Number(pago.monto), pago.moneda, monedaFactura, tasa), 0);
  return { pagado, saldo: Math.max(0, Math.round((total - pagado) * 100) / 100) };
}

export function nuevoConceptoFactura(): ConceptoFactura {
  return { id: crypto.randomUUID(), descripcion: "", cantidad: 1, precioUnitario: 0 };
}
