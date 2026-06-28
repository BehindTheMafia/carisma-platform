import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrudPage, type CrudConfig } from "@/components/crud-page";
import { formatDateTime } from "@/lib/format";

type Insp = {
  id: string;
  renta_id: string;
  tipo: string;
  fecha: string;
  kilometraje: number;
  combustible_porcentaje: number;
  danos: string | null;
  rentas?: { folio: string; vehiculos?: { codigo: string; placa: string } };
};

const config: CrudConfig<Insp> = {
  title: "Inspecciones",
  description: "Inspecciones de salida y devolución del vehículo.",
  table: "inspecciones",
  select: "*, rentas(folio, vehiculos(codigo, placa))",
  softDelete: false,
  columns: [
    { key: "fecha", label: "Fecha", render: (r) => formatDateTime(r.fecha) },
    {
      key: "tipo", label: "Tipo", render: (r) => (
        <Badge variant="outline" className={
          r.tipo === "salida"
            ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
        }>{r.tipo}</Badge>
      ),
    },
    { key: "renta", label: "Renta", render: (r) => <span className="font-mono text-xs">{r.rentas?.folio ?? "—"}</span> },
    { key: "vehiculo", label: "Vehículo", render: (r) => r.rentas?.vehiculos ? `${r.rentas.vehiculos.codigo} · ${r.rentas.vehiculos.placa}` : "—" },
    { key: "km", label: "KM", render: (r) => r.kilometraje?.toLocaleString("es-NI") ?? "—" },
    { key: "combustible", label: "Combustible", render: (r) => `${r.combustible_porcentaje}%` },
    { key: "danos", label: "Daños" },
  ],
  fields: [
    {
      name: "renta_id", label: "Renta", type: "select", required: true,
      optionsQuery: { table: "rentas", valueKey: "id", labelKey: "folio", select: "id, folio", orderBy: "folio" },
    },
    {
      name: "tipo", label: "Tipo", type: "select", required: true, defaultValue: "salida",
      options: [{ value: "salida", label: "Salida" }, { value: "devolucion", label: "Devolución" }],
    },
    { name: "fecha", label: "Fecha", type: "datetime", required: true, defaultValue: new Date().toISOString().slice(0, 16) },
    { name: "kilometraje", label: "Kilometraje", type: "number", required: true, defaultValue: 0 },
    { name: "combustible_porcentaje", label: "Combustible %", type: "number", defaultValue: 100 },
    { name: "danos", label: "Daños observados", type: "textarea", span: 2 },
    { name: "observaciones", label: "Observaciones", type: "textarea", span: 2 },
  ],
  icon: <ClipboardCheck className="size-6 text-gold" />,
};

export const Route = createFileRoute("/_authenticated/inspecciones")({
  head: () => ({ meta: [{ title: "Inspecciones — TM RENT A CAR" }] }),
  component: () => <CrudPage config={config} />,
});