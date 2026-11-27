import test from "node:test";
import assert from "node:assert/strict";
import { calcularTotalConceptos, esFacturaPorConceptos, facturaConceptosSchema, saldoFacturaConceptos } from "../src/lib/factura-conceptos.ts";

const traslado = { id: "traslado", descripcion: "Traslado aeropuerto–hotel del 11 de octubre", cantidad: 1, precioUnitario: 35 };
const factura = { cliente: "Cliente de prueba", tasa: 36.6243, conceptosFactura: [traslado] };

test("un traslado se factura sin vehículo ni fechas de renta", () => {
  assert.equal(facturaConceptosSchema.safeParse(factura).success, true);
  assert.equal(calcularTotalConceptos(factura.conceptosFactura), 35);
});

test("suma varios servicios y redondea cada importe a centavos", () => {
  const conceptos = [traslado, { ...traslado, id: "regreso", cantidad: 3, precioUnitario: 0.1 }, { ...traslado, id: "espera", cantidad: 1.5, precioUnitario: 12.35 }];
  assert.equal(calcularTotalConceptos(conceptos), 53.83);
});

test("rechaza conceptos vacíos, cantidades inválidas y precios negativos", () => {
  for (const cambio of [{ descripcion: "  " }, { cantidad: 0 }, { cantidad: -1 }, { precioUnitario: -5 }, { precioUnitario: Infinity }, { cantidad: NaN }]) {
    assert.equal(facturaConceptosSchema.safeParse({ ...factura, conceptosFactura: [{ ...traslado, ...cambio }] }).success, false);
  }
  assert.equal(facturaConceptosSchema.safeParse({ ...factura, conceptosFactura: [] }).success, false);
});

test("requiere cliente, tasa positiva y un total mayor que cero", () => {
  assert.equal(facturaConceptosSchema.safeParse({ ...factura, cliente: " " }).success, false);
  assert.equal(facturaConceptosSchema.safeParse({ ...factura, tasa: 0 }).success, false);
  assert.equal(facturaConceptosSchema.safeParse({ ...factura, conceptosFactura: [{ ...traslado, precioUnitario: 0 }] }).success, false);
});

test("limita la longitud y cantidad de conceptos para mantener legible la factura", () => {
  assert.equal(facturaConceptosSchema.safeParse({ ...factura, conceptosFactura: [{ ...traslado, descripcion: "a".repeat(501) }] }).success, false);
  assert.equal(facturaConceptosSchema.safeParse({ ...factura, conceptosFactura: Array.from({ length: 21 }, (_, i) => ({ ...traslado, id: String(i) })) }).success, false);
});

test("las facturas antiguas y los demás documentos mantienen su cálculo de renta", () => {
  assert.equal(esFacturaPorConceptos({ docType: "factura" }), false);
  assert.equal(esFacturaPorConceptos({ facturaModo: "conceptos", docType: "contrato" }), false);
  assert.equal(esFacturaPorConceptos({ facturaModo: "conceptos", docType: "factura" }), true);
});

test("una factura por conceptos acepta córdobas y conserva compatibilidad con facturas anteriores", () => {
  assert.equal(facturaConceptosSchema.safeParse({ ...factura, monedaConceptos: "NIO" }).success, true);
  assert.equal(facturaConceptosSchema.safeParse({ ...factura, monedaConceptos: "USD" }).success, true);
  assert.equal(facturaConceptosSchema.safeParse({ ...factura, monedaConceptos: "EUR" }).success, false);
  assert.equal(facturaConceptosSchema.safeParse(factura).success, true);
});

test("los abonos parciales en dos monedas usan la tasa de la factura sin cobrar la garantía de rentas", () => {
  const tasa = 36.6243;
  assert.deepEqual(saldoFacturaConceptos(30, "USD", tasa, [
    { monto: 10, moneda: "USD" }, { monto: 366.24, moneda: "NIO" },
  ]).saldo, 10);
  assert.equal(saldoFacturaConceptos(30, "USD", tasa, [{ monto: 1098.73, moneda: "NIO" }]).saldo, 0);
});
