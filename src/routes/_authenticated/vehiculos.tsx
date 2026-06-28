import { createFileRoute } from "@tanstack/react-router";
import { Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrudPage, type CrudConfig } from "@/components/crud-page";
import { formatCurrency, type Moneda } from "@/lib/format";

type Vehiculo = {
  id: string;
  codigo: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string | null;
  estado: string;
  tarifa_diaria: number;
  moneda: Moneda;
  kilometraje: number;
  clasificacion: string;
};

const estadoColor: Record<string, string> = {
  disponible: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  rentado: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  reservado: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  mantenimiento: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  fuera_servicio: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

const config: CrudConfig<Vehiculo> = {
  title: "Vehículos",
  description: "Administra la flota completa: códigos, placas, tarifas y disponibilidad.",
  table: "vehiculos",
  searchFields: ["codigo", "placa", "marca", "modelo", "color"],
  columns: [
    { key: "codigo", label: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
    { key: "placa", label: "Placa", render: (r) => <span className="font-medium">{r.placa}</span> },
    { key: "vehiculo", label: "Vehículo", render: (r) => `${r.marca} ${r.modelo} ${r.anio}` },
    { key: "color", label: "Color" },
    { key: "kilometraje", label: "KM", render: (r) => r.kilometraje?.toLocaleString("es-NI") ?? "0" },
    { key: "tarifa", label: "Tarifa/día", render: (r) => formatCurrency(r.tarifa_diaria, r.moneda) },
    {
      key: "estado", label: "Estado",
      render: (r) => <Badge variant="outline" className={estadoColor[r.estado] ?? ""}>{r.estado.replace("_", " ")}</Badge>,
    },
  ],
  fields: [
    { name: "codigo", label: "Código interno", type: "text", required: true, placeholder: "V-001" },
    { name: "placa", label: "Placa", type: "text", required: true },
    { name: "marca", label: "Marca", type: "text", required: true },
    { name: "modelo", label: "Modelo", type: "text", required: true },
    { name: "anio", label: "Año", type: "number", required: true, defaultValue: new Date().getFullYear() },
    { name: "color", label: "Color", type: "text" },
    { name: "vin", label: "VIN / Chasis", type: "text" },
    { name: "tipo_vehiculo", label: "Tipo (sedán, SUV...)", type: "text" },
    {
      name: "clasificacion", label: "Clasificación", type: "select", defaultValue: "propio",
      options: [{ value: "propio", label: "Propio" }, { value: "subrentado", label: "Subrentado" }],
    },
    {
      name: "transmision", label: "Transmisión", type: "select",
      options: [{ value: "manual", label: "Manual" }, { value: "automatica", label: "Automática" }],
    },
    {
      name: "combustible", label: "Combustible", type: "select",
      options: [
        { value: "gasolina", label: "Gasolina" },
        { value: "diesel", label: "Diésel" },
        { value: "hibrido", label: "Híbrido" },
        { value: "electrico", label: "Eléctrico" },
        { value: "gas", label: "Gas" },
      ],
    },
    { name: "capacidad", label: "Capacidad (pasajeros)", type: "number" },
    { name: "kilometraje", label: "Kilometraje", type: "number", defaultValue: 0 },
    {
      name: "estado", label: "Estado", type: "select", defaultValue: "disponible",
      options: [
        { value: "disponible", label: "Disponible" },
        { value: "rentado", label: "Rentado" },
        { value: "reservado", label: "Reservado" },
        { value: "mantenimiento", label: "Mantenimiento" },
        { value: "fuera_servicio", label: "Fuera de servicio" },
      ],
    },
    {
      name: "moneda", label: "Moneda", type: "select", defaultValue: "NIO",
      options: [{ value: "NIO", label: "Córdobas (NIO)" }, { value: "USD", label: "Dólares (USD)" }],
    },
    { name: "tarifa_diaria", label: "Tarifa diaria", type: "number", step: "0.01", defaultValue: 0 },
    { name: "tarifa_semanal", label: "Tarifa semanal", type: "number", step: "0.01", defaultValue: 0 },
    { name: "tarifa_mensual", label: "Tarifa mensual", type: "number", step: "0.01", defaultValue: 0 },
    { name: "deposito", label: "Depósito sugerido", type: "number", step: "0.01", defaultValue: 0 },
    { name: "seguro_vencimiento", label: "Vence seguro", type: "date" },
    { name: "circulacion_vencimiento", label: "Vence circulación", type: "date" },
    { name: "notas", label: "Notas", type: "textarea", span: 2 },
  ],
  icon: <Car className="size-6 text-gold" />,
};

export const Route = createFileRoute("/_authenticated/vehiculos")({
  head: () => ({ meta: [{ title: "Vehículos — TM RENT A CAR" }] }),
  component: () => <CrudPage config={config} />,
});