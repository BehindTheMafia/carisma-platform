import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrudPage, type CrudConfig } from "@/components/crud-page";
import { formatCurrency, formatDate, type Moneda } from "@/lib/format";

type Renta = {
  id: string;
  folio: string;
  cliente_id: string;
  vehiculo_id: string;
  fecha_inicio: string;
  fecha_devolucion: string;
  dias: number;
  tarifa: number;
  subtotal: number;
  total: number;
  moneda: Moneda;
  estado: string;
  clientes?: { nombre: string };
  vehiculos?: { codigo: string; placa: string; marca: string; modelo: string };
};

const estadoColor: Record<string, string> = {
  reservada: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  activa: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  finalizada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  cancelada: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

const config: CrudConfig<Renta> = {
  title: "Rentas",
  description: "Flujo completo: reserva, activación y devolución.",
  table: "rentas",
  select: "*, clientes(nombre), vehiculos(codigo, placa, marca, modelo)",
  searchFields: ["folio"],
  columns: [
    { key: "folio", label: "Folio", render: (r) => <span className="font-mono text-xs">{r.folio}</span> },
    { key: "cliente", label: "Cliente", render: (r) => r.clientes?.nombre ?? "—" },
    { key: "vehiculo", label: "Vehículo", render: (r) => r.vehiculos ? `${r.vehiculos.codigo} · ${r.vehiculos.placa}` : "—" },
    { key: "inicio", label: "Inicio", render: (r) => formatDate(r.fecha_inicio) },
    { key: "fin", label: "Devolución", render: (r) => formatDate(r.fecha_devolucion) },
    { key: "dias", label: "Días" },
    { key: "total", label: "Total", render: (r) => formatCurrency(r.total, r.moneda) },
    { key: "estado", label: "Estado", render: (r) => <Badge variant="outline" className={estadoColor[r.estado] ?? ""}>{r.estado}</Badge> },
  ],
  fields: [
    {
      name: "cliente_id", label: "Cliente", type: "select", required: true,
      optionsQuery: { table: "clientes", valueKey: "id", labelKey: "nombre", select: "id, nombre" },
    },
    {
      name: "vehiculo_id", label: "Vehículo", type: "select", required: true,
      optionsQuery: {
        table: "vehiculos", valueKey: "id",
        labelKey: (r) => `${r.codigo} · ${r.placa} — ${r.marca} ${r.modelo}`,
        select: "id, codigo, placa, marca, modelo",
      },
    },
    { name: "fecha_inicio", label: "Fecha inicio", type: "datetime", required: true },
    { name: "fecha_devolucion", label: "Fecha devolución", type: "datetime", required: true },
    { name: "dias", label: "Días", type: "number", defaultValue: 1 },
    { name: "tarifa", label: "Tarifa diaria", type: "number", step: "0.01", defaultValue: 0 },
    { name: "subtotal", label: "Subtotal", type: "number", step: "0.01", defaultValue: 0 },
    { name: "descuento", label: "Descuento", type: "number", step: "0.01", defaultValue: 0 },
    { name: "extras", label: "Extras", type: "number", step: "0.01", defaultValue: 0 },
    { name: "impuesto", label: "Impuesto", type: "number", step: "0.01", defaultValue: 0 },
    { name: "deposito", label: "Depósito", type: "number", step: "0.01", defaultValue: 0 },
    { name: "total", label: "Total", type: "number", step: "0.01", required: true, defaultValue: 0 },
    {
      name: "moneda", label: "Moneda", type: "select", defaultValue: "NIO",
      options: [{ value: "NIO", label: "NIO" }, { value: "USD", label: "USD" }],
    },
    {
      name: "estado", label: "Estado", type: "select", defaultValue: "reservada",
      options: [
        { value: "reservada", label: "Reservada" },
        { value: "activa", label: "Activa" },
        { value: "finalizada", label: "Finalizada" },
        { value: "cancelada", label: "Cancelada" },
      ],
    },
    { name: "fecha_devolucion_real", label: "Devolución real", type: "datetime" },
    { name: "observaciones", label: "Observaciones", type: "textarea", span: 2 },
  ],
  icon: <FileText className="size-6 text-gold" />,
};

export const Route = createFileRoute("/_authenticated/rentas")({
  head: () => ({ meta: [{ title: "Rentas — TM RENT A CAR" }] }),
  component: () => <CrudPage config={config} />,
});