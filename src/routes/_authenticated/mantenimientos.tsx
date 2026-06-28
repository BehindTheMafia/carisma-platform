import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrudPage, type CrudConfig } from "@/components/crud-page";
import { formatCurrency, formatDate, type Moneda } from "@/lib/format";

type Mant = {
  id: string;
  vehiculo_id: string;
  fecha: string;
  tipo: string;
  taller: string | null;
  costo: number;
  moneda: Moneda;
  completado: boolean;
  kilometraje: number | null;
  vehiculos?: { codigo: string; placa: string };
};

const config: CrudConfig<Mant> = {
  title: "Mantenimientos",
  description: "Programa y registra mantenimientos preventivos y correctivos.",
  table: "mantenimientos",
  select: "*, vehiculos(codigo, placa)",
  searchFields: ["tipo", "taller"],
  columns: [
    { key: "fecha", label: "Fecha", render: (r) => formatDate(r.fecha) },
    { key: "vehiculo", label: "Vehículo", render: (r) => r.vehiculos ? `${r.vehiculos.codigo} · ${r.vehiculos.placa}` : "—" },
    { key: "tipo", label: "Tipo" },
    { key: "taller", label: "Taller" },
    { key: "km", label: "KM", render: (r) => r.kilometraje?.toLocaleString("es-NI") ?? "—" },
    { key: "costo", label: "Costo", render: (r) => formatCurrency(r.costo, r.moneda) },
    {
      key: "estado", label: "Estado", render: (r) => r.completado
        ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Completado</Badge>
        : <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">Pendiente</Badge>,
    },
  ],
  fields: [
    {
      name: "vehiculo_id", label: "Vehículo", type: "select", required: true,
      optionsQuery: { table: "vehiculos", valueKey: "id", labelKey: (r) => `${r.codigo} · ${r.placa}`, select: "id, codigo, placa" },
    },
    { name: "fecha", label: "Fecha", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
    { name: "tipo", label: "Tipo (aceite, frenos...)", type: "text", required: true },
    { name: "taller", label: "Taller", type: "text" },
    { name: "kilometraje", label: "Kilometraje", type: "number" },
    { name: "costo", label: "Costo", type: "number", step: "0.01", defaultValue: 0 },
    {
      name: "moneda", label: "Moneda", type: "select", defaultValue: "NIO",
      options: [{ value: "NIO", label: "NIO" }, { value: "USD", label: "USD" }],
    },
    { name: "proximo_fecha", label: "Próximo mantenimiento (fecha)", type: "date" },
    { name: "proximo_km", label: "Próximo (km)", type: "number" },
    { name: "completado", label: "Completado", type: "checkbox", defaultValue: true },
    { name: "observaciones", label: "Observaciones", type: "textarea", span: 2 },
  ],
  icon: <Wrench className="size-6 text-gold" />,
};

export const Route = createFileRoute("/_authenticated/mantenimientos")({
  head: () => ({ meta: [{ title: "Mantenimientos — TM RENT A CAR" }] }),
  component: () => <CrudPage config={config} />,
});