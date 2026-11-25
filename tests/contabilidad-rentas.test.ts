import test from "node:test";
import assert from "node:assert/strict";
import { desglosarCobros, enPeriodo, costosSubrentaEnPeriodo, esGastoOperativo } from "../src/lib/contabilidad-rentas.ts";

const renta = { id: "r", total: 100, deposito: 150, moneda: "USD", dias: 2, estado: "finalizada",
  tarifa_subarriendo: 30, vehiculos: { clasificacion: "subrentado", costo_subarriendo: 99 } };
const pago = { id: "p", renta_id: "r", monto: 250, moneda: "USD", fecha: "2026-11-18T02:00:00Z", estado: "pagado" };

test("una garantía no aumenta la venta ni la utilidad de una subrenta", () => {
  const [p] = desglosarCobros([pago], [renta], 36.5);
  assert.equal(p.ingreso, 100);
  assert.equal(p.garantia, 150);
  assert.equal(p.costoProveedorUSD, 60);
  assert.equal(p.ingreso - p.costoProveedorUSD, 40);
});

test("los abonos anteriores se distribuyen antes de filtrar el período", () => {
  const ps = desglosarCobros([
    { ...pago, id: "late", monto: 150, fecha: "2026-11-18T02:00:00Z" },
    { ...pago, id: "early", monto: 100, fecha: "2026-10-10T12:00:00Z" },
  ], [renta], 36.5).filter(p => enPeriodo(p.fecha, "2026-11-17", "2026-11-17"));
  assert.equal(ps.length, 1);
  assert.equal(ps[0].ingreso, 0);
  assert.equal(ps[0].garantia, 150);
  assert.equal(ps[0].costoProveedorUSD, 0);
});

test("las subrentas con pérdida conservan el costo completo del proveedor", () => {
  const [p] = desglosarCobros([pago], [{ ...renta, tarifa_subarriendo: 70 }], 36.5);
  assert.equal(p.costoProveedorUSD, 140);
  assert.equal(p.ingreso - p.costoProveedorUSD, -40);
});

test("un egreso al proveedor sustituye al costo estimado sin duplicarlo", () => {
  const ps = desglosarCobros([pago], [renta], 36.5);
  const costos = costosSubrentaEnPeriodo(ps, [{ renta_id: "r", categoria: "subarriendo", monto: 2190,
    moneda: "NIO", fecha: "2026-11-17" }], "2026-11-01", "2026-11-30", 36.5);
  assert.equal(costos.estimadoUSD, 0);
  assert.equal(costos.registradoUSD, 60);
  assert.equal(costos.totalUSD, 60);
});

test("las devoluciones de garantía no son gastos operativos", () => {
  assert.equal(esGastoOperativo("devolucion_garantia"), false);
  assert.equal(esGastoOperativo("mantenimiento"), true);
});

test("no reconoce como ingreso pagos eliminados, pendientes ni rentas eliminadas", () => {
  assert.equal(desglosarCobros([{ ...pago, deleted_at: "2026-11-17" }], [renta], 36.5).length, 0);
  assert.equal(desglosarCobros([{ ...pago, estado: "pendiente" }], [renta], 36.5).length, 0);
  assert.equal(desglosarCobros([pago], [{ ...renta, deleted_at: "2026-11-17" }], 36.5).length, 0);
});

test("convierte abonos mixtos antes de separar la garantía", () => {
  const [p] = desglosarCobros([{ ...pago, monto: 9125, moneda: "NIO" }], [renta], 36.5);
  assert.equal(p.ingreso, 3650);
  assert.equal(p.garantia, 5475);
  assert.equal(p.costoProveedorUSD, 60);
});

test("la fecha de pago respeta el día de Nicaragua", () => {
  assert.equal(enPeriodo(pago.fecha, "2026-11-17", "2026-11-17"), true);
  assert.equal(enPeriodo(pago.fecha, "2026-11-18", "2026-11-18"), false);
});

test("un exceso sobre renta y garantía no se convierte automáticamente en ingreso", () => {
  const [p] = desglosarCobros([{ ...pago, monto: 300 }], [renta], 36.5);
  assert.equal(p.ingreso, 100);
  assert.equal(p.garantia, 150);
  assert.equal(p.excedente, 50);
});
