import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrudPage, type CrudConfig } from "@/components/crud-page";
import { formatCurrency, formatDateTime, type Moneda } from "@/lib/format";

type Pago = {
  id: string;
  renta_id: string;
  fecha: string;
  monto: number;
  moneda: Moneda;
  metodo: string;
  estado: string;
  referencia: string | null;
  rentas?: { folio: string; clientes?: { nombre: string } };
};

const estadoColor: Record<string, string> = {
  pendiente: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  parcial: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  pagado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

const config: CrudConfig<Pago> = {
  title: "Pagos",
  description: "Cobros, abonos, depósitos y conciliación financiera.",
  table: "pagos",
  select: "*, rentas(folio, clientes(nombre))",
  searchFields: ["referencia"],
  columns: [
    { key: "fecha", label: "Fecha", render: (r) => formatDateTime(r.fecha) },
    { key: "renta", label: "Renta", render: (r) => <span className="font-mono text-xs">{r.rentas?.folio ?? "—"}</span> },
    { key: "cliente", label: "Cliente", render: (r) => r.rentas?.clientes?.nombre ?? "—" },
    { key: "monto", label: "Monto", render: (r) => formatCurrency(r.monto, r.moneda) },
    { key: "metodo", label: "Método", render: (r) => <span className="capitalize">{r.metodo}</span> },
    { key: "referencia", label: "Referencia" },
    { key: "estado", label: "Estado", render: (r) => <Badge variant="outline" className={estadoColor[r.estado] ?? ""}>{r.estado}</Badge> },
  ],
  fields: [
    {
      name: "renta_id", label: "Renta", type: "select", required: true,
      optionsQuery: { table: "rentas", valueKey: "id", labelKey: "folio", select: "id, folio", orderBy: "folio" },
    },
    { name: "fecha", label: "Fecha", type: "datetime", required: true, defaultValue: new Date().toISOString().slice(0, 16) },
    { name: "monto", label: "Monto", type: "number", step: "0.01", required: true },
    {
      name: "moneda", label: "Moneda", type: "select", defaultValue: "NIO",
      options: [{ value: "NIO", label: "NIO" }, { value: "USD", label: "USD" }],
    },
    {
      name: "metodo", label: "Método", type: "select", defaultValue: "efectivo",
      options: [
        { value: "efectivo", label: "Efectivo" },
        { value: "transferencia", label: "Transferencia" },
        { value: "tarjeta", label: "Tarjeta" },
      ],
    },
    {
      name: "estado", label: "Estado", type: "select", defaultValue: "pagado",
      options: [
        { value: "pendiente", label: "Pendiente" },
        { value: "parcial", label: "Parcial" },
        { value: "pagado", label: "Pagado" },
      ],
    },
    { name: "referencia", label: "Referencia / N° transacción", type: "text" },
    { name: "observaciones", label: "Observaciones", type: "textarea", span: 2 },
  ],
  icon: <CreditCard className="size-6 text-gold" />,
};

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => ({ meta: [{ title: "Pagos — TM RENT A CAR" }] }),
  component: () => <CrudPage config={config} />,
});