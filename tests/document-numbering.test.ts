import test from "node:test";
import assert from "node:assert/strict";
import { claveNumeroDocumento, numerosParaDocumento } from "../src/lib/document-numbering.ts";

test("los ceros iniciales no permiten reutilizar el mismo número", () => {
  assert.equal(claveNumeroDocumento("0045"), claveNumeroDocumento("45"));
  assert.equal(claveNumeroDocumento(" 0045 "), "45");
  assert.notEqual(claveNumeroDocumento("0045"), claveNumeroDocumento("0046"));
});

test("una factura independiente reserva su número sin expediente de renta", () => {
  assert.deepEqual(numerosParaDocumento("factura", { facturaModo: "conceptos", docNum: "0044", facturaNum: "0045" }), ["0045"]);
  assert.deepEqual(numerosParaDocumento("contrato", { docNum: "0045", facturaNum: "0044" }), ["0045"]);
});

test("los documentos de una renta comparten expediente y una factura puede tener número distinto", () => {
  assert.deepEqual(numerosParaDocumento("factura", { facturaModo: "renta", docNum: "0045", facturaNum: "0045" }), ["0045"]);
  assert.deepEqual(numerosParaDocumento("factura", { facturaModo: "renta", docNum: "0045", facturaNum: "A-12" }), ["0045", "A-12"]);
});
