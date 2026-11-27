import test from "node:test";
import assert from "node:assert/strict";
import {
  getInspectionVehicleType, getTruckStorageType, getTruckTonnage,
  getVehicleCategory, getVehicleTypeLabel,
} from "../src/lib/vehicle-types.ts";

test("cada tonelaje de camión conserva su capacidad en la ficha y el contrato", () => {
  for (const tons of [2, 3, 5, 8]) {
    const stored = getTruckStorageType(tons);
    assert.equal(stored, `camion_${tons}t`);
    assert.equal(getTruckTonnage(stored), tons);
    assert.equal(getVehicleTypeLabel(stored), `Camión ${tons} toneladas`);
    assert.equal(getInspectionVehicleType(stored), `Camión ${tons} toneladas`);
    assert.equal(getVehicleCategory(stored), "Camión");
  }
  assert.equal(getTruckStorageType(10), null);
  assert.equal(getInspectionVehicleType("pickup"), "Pickup");
});
