import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Wallet, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrudPage, type CrudConfig } from "@/components/crud-page";
import { formatCurrency, formatDate, formatDateTime, type Moneda } from "@/lib/format";
import { EGRESO_CATEGORIA_LABELS, EGRESO_CATEGORIA_COLORS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─── */

type Pago = {
  id: string;
  renta_id: string | null;
  contrato_id: string | null;
  nota_debito_id: string | null;
  fecha: string;
  monto: number;
  moneda: Moneda;
  metodo: string;
  estado: string;
  referencia: string | null;
  rentas?: { folio: string; numero_oficial?: string | null; clientes?: { nombre: string } };
  contratos?: { form_data: { facturaNum?: string; cliente?: string; facturaModo?: string } } | null;
  notas_debito?: { numero: string; cliente?: { nombre: string } | null } | null;
};

type Egreso = {
  id: string;
  renta_id: string | null;
  fecha: string;
  concepto: string;
  categoria: string;
  descripcion: string;
  monto: number;
  moneda: Moneda;
  metodo: string;
  responsable: string;
  comprobante_url: string | null;
  observaciones: string | null;
  rentas?: { folio: string; clientes?: { nombre: string } };
};

/* ─── Helpers ─── */

const estadoColor: Record<string, string> = {
  pendiente: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  parcial: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  pagado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

const EGRESO_CATEGORIA_OPTIONS = Object.entries(EGRESO_CATEGORIA_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/* ─── Route ─── */

function PagosPage() {
  const [view, setView] = useState<"pagos" | "egresos">("pagos");
  const { data: notePaymentsReady = false } = useQuery({
    queryKey: ["nota-debito-payments-schema"],
    queryFn: async () => {
      const { error } = await supabase.from("pagos").select("nota_debito_id").limit(0);
      return !error;
    },
  });
  const toggleView = () => setView((v) => (v === "pagos" ? "egresos" : "pagos"));

  const toggleBtn = (
    <Button variant="outline" size="sm" onClick={toggleView} className="h-9 gap-1.5">
      <ArrowLeftRight className="size-3.5" />
      {view === "pagos" ? "Egresos" : "Pagos"}
    </Button>
  );

  const configPagos: CrudConfig<Pago> = {
    title: "Pagos",
    description: "Cobros y abonos recibidos. Las garantías son reembolsables y no forman parte de los ingresos.",
    table: "pagos",
    select: notePaymentsReady
      ? "*, rentas(folio, numero_oficial, clientes(nombre)), contratos(form_data), notas_debito(numero, cliente:clientes(nombre))"
      : "*, rentas(folio, numero_oficial, clientes(nombre)), contratos(form_data)",
    searchFields: ["referencia"],
    monthFilter: { column: "fecha" },
    toolbar: view === "pagos" ? toggleBtn : undefined,
    canEdit: (r) => !!r.renta_id,
    canDelete: (r) => !!r.renta_id,
    columns: [
      { key: "fecha", label: "Fecha", render: (r) => formatDateTime(r.fecha) },
      {
        key: "factura",
        label: "Factura",
        render: (r) => (
          <span className="font-mono text-xs">
            {r.notas_debito?.numero ?? r.contratos?.form_data?.facturaNum ?? r.rentas?.numero_oficial ?? "Sin emitir"}
          </span>
        ),
      },
      { key: "cliente", label: "Cliente", render: (r) => r.notas_debito?.cliente?.nombre ?? r.contratos?.form_data?.cliente ?? r.rentas?.clientes?.nombre ?? "—" },
      { key: "monto", label: "Monto", render: (r) => formatCurrency(r.monto, r.moneda) },
      {
        key: "metodo",
        label: "Método",
        render: (r) => <span className="capitalize">{r.metodo}</span>,
      },
      { key: "referencia", label: "Referencia" },
      {
        key: "estado",
        label: "Estado",
        render: (r) => (
          <Badge variant="outline" className={estadoColor[r.estado] ?? ""}>
            {r.estado}
          </Badge>
        ),
      },
    ],
    fields: [
      {
        name: "renta_id",
        label: "Renta",
        type: "select",
        required: true,
        optionsQuery: {
          table: "rentas",
          valueKey: "id",
          labelKey: (row: Record<string, unknown>) => {
            const v = row.vehiculos as { marca?: string; modelo?: string; placa?: string } | undefined;
            const folio = row.folio as string;
            if (v) return `${v.marca} ${v.modelo} (${v.placa}) · ${folio}`;
            return folio;
          },
          select: "id, folio, vehiculos(marca, modelo, placa)",
          orderBy: "folio",
        },
      },
      {
        name: "fecha",
        label: "Fecha",
        type: "datetime",
        required: true,
        defaultValue: new Date().toISOString().slice(0, 16),
      },
      { name: "monto", label: "Monto", type: "number", step: "0.01", required: true },
      {
        name: "moneda",
        label: "Moneda",
        type: "select",
        defaultValue: "NIO",
        options: [
          { value: "NIO", label: "NIO" },
          { value: "USD", label: "USD" },
        ],
      },
      {
        name: "metodo",
        label: "Método",
        type: "select",
        defaultValue: "efectivo",
        options: [
          { value: "efectivo", label: "Efectivo" },
          { value: "transferencia", label: "Transferencia" },
          { value: "tarjeta", label: "Tarjeta" },
        ],
      },
      { name: "referencia", label: "Referencia / N° transacción", type: "text" },
      { name: "observaciones", label: "Observaciones", type: "textarea", span: 2 },
    ],
    icon: <CreditCard className="size-6 text-gold" />,
  };

  const configEgresos: CrudConfig<Egreso> = {
    title: "Egresos",
    description: "Salidas de dinero relacionadas con la operación.",
    table: "egresos",
    select: "*, rentas(folio, clientes(nombre))",
    searchFields: ["concepto", "responsable", "descripcion"],
    monthFilter: { column: "fecha" },
    toolbar: view === "egresos" ? toggleBtn : undefined,
    columns: [
      { key: "fecha", label: "Fecha", render: (r) => formatDate(r.fecha) },
      { key: "concepto", label: "Concepto" },
      {
        key: "categoria",
        label: "Categoría",
        render: (r) => (
          <Badge variant="outline" className={EGRESO_CATEGORIA_COLORS[r.categoria] ?? ""}>
            {EGRESO_CATEGORIA_LABELS[r.categoria] ?? r.categoria}
          </Badge>
        ),
      },
      { key: "monto", label: "Monto", render: (r) => formatCurrency(r.monto, r.moneda) },
      {
        key: "metodo",
        label: "Método",
        render: (r) => <span className="capitalize">{r.metodo}</span>,
      },
      { key: "responsable", label: "Responsable" },
      {
        key: "renta",
        label: "Renta",
        render: (r) => (r.rentas ? <span className="font-mono text-xs">{r.rentas.folio}</span> : <span className="text-muted-foreground">—</span>),
      },
    ],
    fields: [
      {
        name: "fecha",
        label: "Fecha",
        type: "date",
        required: true,
        defaultValue: new Date().toISOString().slice(0, 10),
      },
      { name: "concepto", label: "Concepto", type: "text", required: true },
      {
        name: "categoria",
        label: "Categoría",
        type: "select",
        required: true,
        defaultValue: "otros",
        options: EGRESO_CATEGORIA_OPTIONS,
      },
      { name: "descripcion", label: "Descripción", type: "textarea" },
      { name: "monto", label: "Monto", type: "number", step: "0.01", required: true },
      {
        name: "moneda",
        label: "Moneda",
        type: "select",
        defaultValue: "NIO",
        options: [
          { value: "NIO", label: "NIO" },
          { value: "USD", label: "USD" },
        ],
      },
      {
        name: "metodo",
        label: "Método",
        type: "select",
        defaultValue: "efectivo",
        options: [
          { value: "efectivo", label: "Efectivo" },
          { value: "transferencia", label: "Transferencia" },
          { value: "tarjeta", label: "Tarjeta" },
        ],
      },
      { name: "responsable", label: "Responsable", type: "text", required: true },
      {
        name: "renta_id",
        label: "Vincular a renta (opcional)",
        type: "select",
        required: false,
        optionsQuery: {
          table: "rentas",
          valueKey: "id",
          labelKey: (row: Record<string, unknown>) => {
            const v = row.vehiculos as { marca?: string; modelo?: string; placa?: string } | undefined;
            const folio = row.folio as string;
            if (v) return `${v.marca} ${v.modelo} (${v.placa}) · ${folio}`;
            return folio;
          },
          select: "id, folio, vehiculos(marca, modelo, placa)",
          orderBy: "folio",
        },
      },
      { name: "comprobante_url", label: "Comprobante (URL)", type: "text", span: 1 },
      { name: "observaciones", label: "Observaciones", type: "textarea", span: 2 },
    ],
    icon: <Wallet className="size-6 text-gold" />,
  };

  return view === "pagos" ? (
    <CrudPage config={configPagos} key={notePaymentsReady ? "pagos-notes" : "pagos"} />
  ) : (
    <CrudPage config={configEgresos} key="egresos" />
  );
}

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => ({ meta: [{ title: "Pagos — TM RENT A CAR" }] }),
  component: PagosPage,
});
