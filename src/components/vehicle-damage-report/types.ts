import type { InspectionVehicleType } from "@/lib/vehicle-types";
import type { Foto } from "@/components/image-upload";

export type Combustible = "gasolina" | "diesel";

export type TipoVehiculo = InspectionVehicleType;

export type ZonaDanio = "delantera" | "trasera" | "derecha" | "izquierda" | "interior" | "otro";

export interface Firma {
  nombre: string;
  documento?: string;
  fecha: string;
  firmaUrl: string | null;
}

export interface CompanyInfo {
  nombre: string;
  ruc?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  logo_url?: string | null;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  nombre: "TM RENT A CAR - Maria Auxiliadora Torres Montalvan",
  ruc: "4011107950010N",
  telefono: "8386-6806 / 7681-1323 / 2523-6262",
  correo: "rentcartm26@gmail.com",
  direccion: "BO. LA REFORMA, POLICIA NACIONAL 2 1/2C E. MASAYA",
  logo_url: "/logorent.png",
};

export interface VehicleDamageReport {
  fecha: string;
  hora: string;
  cliente: {
    nombre: string;
    documento: string;
    telefono: string;
    direccion: string;
  };
  vehiculo: {
    tipoVehiculo: TipoVehiculo;
    marca: string;
    modelo: string;
    placa: string;
    color: string;
    kilometraje: string;
    combustible: Combustible | "";
  };
  descripcion: string;
  zonas: ZonaDanio[];
  evidencias: Foto[];
  observaciones: string;
  conclusion: string;
  firmas: {
    representante: Firma;
    cliente: Firma;
  };
}

export const ZONAS_DANIO: { value: ZonaDanio; label: string }[] = [
  { value: "delantera", label: "Parte delantera" },
  { value: "trasera", label: "Parte trasera" },
  { value: "derecha", label: "Lado derecho" },
  { value: "izquierda", label: "Lado izquierdo" },
  { value: "interior", label: "Interior" },
  { value: "otro", label: "Otro" },
];

export const ZONA_LABEL: Record<ZonaDanio, string> = {
  delantera: "Parte delantera",
  trasera: "Parte trasera",
  derecha: "Lado derecho",
  izquierda: "Lado izquierdo",
  interior: "Interior",
  otro: "Otro",
};

export const CONCLUSION_BASE =
  "Se inspecciona el vehículo descrito en el presente informe, constatando los daños detallados anteriormente. El cliente declara haber recibido el vehículo en las condiciones señaladas y acepta la veracidad de la información registrada.";

export const DEFAULT_REPORT: VehicleDamageReport = {
  fecha: new Date().toISOString().slice(0, 10),
  hora: new Date().toTimeString().slice(0, 5),
  cliente: { nombre: "", documento: "", telefono: "", direccion: "" },
  vehiculo: {
    tipoVehiculo: "SUV",
    marca: "",
    modelo: "",
    placa: "",
    color: "",
    kilometraje: "",
    combustible: "",
  },
  descripcion: "",
  zonas: [],
  evidencias: [],
  observaciones: "",
  conclusion: CONCLUSION_BASE,
  firmas: {
    representante: { nombre: "", documento: "", fecha: "", firmaUrl: null },
    cliente: { nombre: "", documento: "", fecha: "", firmaUrl: null },
  },
};
