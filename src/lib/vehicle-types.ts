export const INSPECTION_VEHICLE_TYPES = ["SUV", "Pickup", "Sedán", "Microbús"] as const;

export type InspectionVehicleType = (typeof INSPECTION_VEHICLE_TYPES)[number];

export const VEHICLE_TYPE_OPTIONS = [
  { value: "sedan", label: "Sedán" },
  { value: "suv", label: "SUV" },
  { value: "pickup", label: "Pickup" },
  { value: "microbus", label: "Microbús" },
];

export function normalizeVehicleType(tipo: string | null | undefined): string {
  return (tipo ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function getVehicleTypeLabel(tipo: string | null | undefined, fallback = ""): string {
  const normalized = normalizeVehicleType(tipo);
  if (normalized === "camioneta") return "Camioneta";
  return VEHICLE_TYPE_OPTIONS.find((option) => option.value === normalized)?.label || tipo || fallback;
}

export function getInspectionVehicleType(tipo: string | null | undefined): InspectionVehicleType {
  const label = getVehicleTypeLabel(tipo);
  return INSPECTION_VEHICLE_TYPES.find((value) => value === label) ?? "SUV";
}
