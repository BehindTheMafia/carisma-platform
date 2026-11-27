export const TRUCK_TONNAGES = [2, 3, 5, 8] as const;
export const TRUCK_TONNAGE_OPTIONS = TRUCK_TONNAGES.map((value) => ({
  value: String(value), label: `${value} toneladas`,
}));

export const INSPECTION_VEHICLE_TYPES = [
  "SUV", "Pickup", "Sedán", "Microbús", "Camión",
  "Camión 2 toneladas", "Camión 3 toneladas", "Camión 5 toneladas", "Camión 8 toneladas",
] as const;

export type InspectionVehicleType = (typeof INSPECTION_VEHICLE_TYPES)[number];

export const VEHICLE_TYPE_OPTIONS = [
  { value: "sedan", label: "Sedán" },
  { value: "suv", label: "SUV" },
  { value: "pickup", label: "Pickup" },
  { value: "microbus", label: "Microbús" },
  { value: "camion", label: "Camión" },
];

export function normalizeVehicleType(tipo: string | null | undefined): string {
  return (tipo ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function getVehicleTypeLabel(tipo: string | null | undefined, fallback = ""): string {
  const normalized = normalizeVehicleType(tipo);
  const toneladas = getTruckTonnage(tipo);
  if (toneladas) return `Camión ${toneladas} toneladas`;
  if (normalized === "camioneta") return "Camioneta";
  return VEHICLE_TYPE_OPTIONS.find((option) => option.value === normalized)?.label || tipo || fallback;
}

export function getTruckTonnage(tipo: string | null | undefined): number | null {
  const match = /^camion[_\s-]*(2|3|5|8)(?:t|\s*toneladas?)?$/.exec(normalizeVehicleType(tipo));
  return match ? Number(match[1]) : null;
}

export function getTruckStorageType(toneladas: string | number): string | null {
  const number = Number(toneladas);
  return TRUCK_TONNAGES.some((value) => value === number) ? `camion_${number}t` : null;
}

export function getVehicleCategory(tipo: string | null | undefined): string {
  const label = getVehicleTypeLabel(tipo);
  return label.startsWith("Camión") ? "Camión" : label;
}

export function getInspectionVehicleType(tipo: string | null | undefined): InspectionVehicleType {
  const label = getVehicleTypeLabel(tipo);
  return INSPECTION_VEHICLE_TYPES.find((value) => value === label) ?? "SUV";
}
