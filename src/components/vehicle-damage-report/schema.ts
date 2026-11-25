import { z } from "zod";
import { INSPECTION_VEHICLE_TYPES } from "@/lib/vehicle-types";
import { CONCLUSION_BASE, ZONAS_DANIO, type ZonaDanio } from "./types";

const firmaSchema = z.object({
  nombre: z.string().optional(),
  documento: z.string().optional(),
  fecha: z.string().optional(),
  firmaUrl: z.string().nullable().optional(),
});

export const vehicleDamageSchema = z.object({
  fecha: z.string().min(1, "La fecha es requerida"),
  hora: z.string().min(1, "La hora es requerida"),
  cliente: z.object({
    nombre: z.string().min(1, "El nombre del cliente es requerido"),
    documento: z.string().optional(),
    telefono: z.string().optional(),
    direccion: z.string().optional(),
  }),
  vehiculo: z.object({
    tipoVehiculo: z
      .enum(INSPECTION_VEHICLE_TYPES)
      .default("SUV"),
    marca: z.string().min(1, "La marca del vehículo es requerida"),
    modelo: z.string().min(1, "El modelo del vehículo es requerido"),
    placa: z.string().min(1, "La placa del vehículo es requerida"),
    color: z.string().optional(),
    kilometraje: z.string().optional(),
    combustible: z.union([z.literal("gasolina"), z.literal("diesel"), z.literal("")]),
  }),
  descripcion: z.string().min(1, "Describe el daño encontrado"),
  zonas: z.array(z.enum(ZONAS_DANIO.map((z) => z.value) as [ZonaDanio, ...ZonaDanio[]])),
  evidencias: z.array(z.any()).default([]),
  observaciones: z.string().optional(),
  conclusion: z.string().optional().default(CONCLUSION_BASE),
  firmas: z.object({
    representante: firmaSchema,
    cliente: firmaSchema,
  }),
});

export type VehicleDamageFormValues = z.input<typeof vehicleDamageSchema>;
export type VehicleDamageFormOutput = z.output<typeof vehicleDamageSchema>;
