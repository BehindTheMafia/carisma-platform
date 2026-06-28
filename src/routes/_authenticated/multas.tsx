import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrudPage, type CrudConfig } from "@/components/crud-page";
import { formatCurrency, formatDate, type Moneda } from "@/lib/format";

type Multa = {
  id: string;
  vehiculo_id: string;
  cliente_id: string | null;
  renta_id: string | null;
  fecha: string;
  descripcion: string;
  monto: number;
  moneda: Moneda;
  estado: string;
  vehiculos?: { codigo: string; placa: string };
  clientes?: { nombre: string };
};

const estadoColor: Record<string, string> = {
  pendiente: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  pagada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  disputada: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

const config: CrudConfig<Multa> = {
  title: "Multas",
  description: "Infracciones de tránsito y cargos al cliente.",
  table: "multas",
  select: "*, vehiculos(codigo, placa), clientes(nombre)",
  searchFields: ["descripcion"],
  columns: [
    { key: "fecha", label: "Fecha", render: (r) => formatDate(r.fecha) },
    { key: "vehiculo", label: "Vehículo", render: (r) => r.vehiculos ? `${r.vehiculos.codigo} · ${r.vehiculos.placa}` : "—" },
    { key: "cliente", label: "Cliente", render: (r) => r.clientes?.nombre ?? "—" },
    { key: "descripcion", label: "Descripción" },
    { key: "monto", label: "Monto", render: (r) => formatCurrency(r.monto, r.moneda) },
    { key: "estado", label: "Estado", render: (r) => <Badge variant="outline" className={estadoColor[r.estado] ?? ""}>{r.estado}</Badge> },
  ],
  fields: [
    {
      name: "vehiculo_id", label: "Vehículo", type: "select", required: true,
      optionsQuery: { table: "vehiculos", valueKey: "id", labelKey: (r) => `${r.codigo} · ${r.placa}`, select: "id, codigo, placa" },
    },
    {
      name: "cliente_id", label: "Cliente", type: "select",
      optionsQuery: { table: "clientes", valueKey: "id", labelKey: "nombre", select: "id, nombre" },
    },
    {
      name: "renta_id", label: "Renta (opcional)", type: "select",
      optionsQuery: { table: "rentas", valueKey: "id", labelKey: "folio", select: "id, folio", orderBy: "folio" },
    },
    { name: "fecha", label: "Fecha", type: "date", required: true },
    { name: "descripcion", label: "Descripción", type: "textarea", required: true, span: 2 },
    { name: "monto", label: "Monto", type: "number", step: "0.01", required: true },
    {
      name: "moneda", label: "Moneda", type: "select", defaultValue: "NIO",
      options: [{ value: "NIO", label: "NIO" }, { value: "USD", label: "USD" }],
    },
    {
      name: "estado", label: "Estado", type: "select", defaultValue: "pendiente",
      options: [
        { value: "pendiente", label: "Pendiente" },
        { value: "pagada", label: "Pagada" },
        { value: "disputada", label: "Disputada" },
      ],
    },
  ],
  icon: <AlertTriangle className="size-6 text-gold" />,
};

export const Route = createFileRoute("/_authenticated/multas")({
  head: () => ({ meta: [{ title: "Multas — TM RENT A CAR" }] }),
  component: () => <CrudPage config={config} />,
});