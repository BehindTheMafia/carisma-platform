import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrudPage, type CrudConfig } from "@/components/crud-page";
import { formatCurrency, formatDate, type Moneda } from "@/lib/format";

type Seguro = {
  id: string;
  vehiculo_id: string;
  aseguradora: string;
  numero_poliza: string;
  cobertura: string | null;
  costo: number;
  moneda: Moneda;
  fecha_inicio: string;
  fecha_vencimiento: string;
  activo: boolean;
  vehiculos?: { codigo: string; placa: string };
};

const config: CrudConfig<Seguro> = {
  title: "Seguros",
  description: "Pólizas vigentes y por vencer.",
  table: "seguros",
  select: "*, vehiculos(codigo, placa)",
  searchFields: ["aseguradora", "numero_poliza"],
  columns: [
    { key: "vehiculo", label: "Vehículo", render: (r) => r.vehiculos ? `${r.vehiculos.codigo} · ${r.vehiculos.placa}` : "—" },
    { key: "aseguradora", label: "Aseguradora" },
    { key: "numero_poliza", label: "Póliza", render: (r) => <span className="font-mono text-xs">{r.numero_poliza}</span> },
    { key: "cobertura", label: "Cobertura" },
    { key: "vence", label: "Vence", render: (r) => formatDate(r.fecha_vencimiento) },
    { key: "costo", label: "Costo", render: (r) => formatCurrency(r.costo, r.moneda) },
    {
      key: "activo", label: "Estado", render: (r) => r.activo
        ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Activo</Badge>
        : <Badge variant="outline" className="bg-muted">Inactivo</Badge>,
    },
  ],
  fields: [
    {
      name: "vehiculo_id", label: "Vehículo", type: "select", required: true,
      optionsQuery: { table: "vehiculos", valueKey: "id", labelKey: (r) => `${r.codigo} · ${r.placa}`, select: "id, codigo, placa" },
    },
    { name: "aseguradora", label: "Aseguradora", type: "text", required: true },
    { name: "numero_poliza", label: "N° Póliza", type: "text", required: true },
    { name: "cobertura", label: "Cobertura", type: "text" },
    { name: "costo", label: "Costo", type: "number", step: "0.01", defaultValue: 0 },
    {
      name: "moneda", label: "Moneda", type: "select", defaultValue: "NIO",
      options: [{ value: "NIO", label: "NIO" }, { value: "USD", label: "USD" }],
    },
    { name: "fecha_inicio", label: "Fecha inicio", type: "date", required: true },
    { name: "fecha_vencimiento", label: "Vencimiento", type: "date", required: true },
    { name: "activo", label: "Activo", type: "checkbox", defaultValue: true },
  ],
  icon: <ShieldCheck className="size-6 text-gold" />,
};

export const Route = createFileRoute("/_authenticated/seguros")({
  head: () => ({ meta: [{ title: "Seguros — TM RENT A CAR" }] }),
  component: () => <CrudPage config={config} />,
});