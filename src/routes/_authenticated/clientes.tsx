import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { CrudPage, type CrudConfig } from "@/components/crud-page";
import { formatDate } from "@/lib/format";

type Cliente = {
  id: string;
  nombre: string;
  documento: string;
  tipo_documento: string | null;
  telefono: string | null;
  correo: string | null;
  ciudad: string | null;
  licencia: string | null;
  licencia_vencimiento: string | null;
};

const config: CrudConfig<Cliente> = {
  title: "Clientes",
  description: "Registro de clientes con licencias, contactos y observaciones.",
  table: "clientes",
  searchFields: ["nombre", "documento", "telefono", "correo", "licencia"],
  columns: [
    { key: "nombre", label: "Nombre", render: (r) => <span className="font-medium">{r.nombre}</span> },
    { key: "documento", label: "Documento", render: (r) => <span className="font-mono text-xs">{r.documento}</span> },
    { key: "telefono", label: "Teléfono" },
    { key: "correo", label: "Correo" },
    { key: "ciudad", label: "Ciudad" },
    { key: "licencia", label: "Licencia" },
    { key: "venc", label: "Vence", render: (r) => formatDate(r.licencia_vencimiento) },
  ],
  fields: [
    { name: "nombre", label: "Nombre completo", type: "text", required: true, span: 2 },
    {
      name: "tipo_documento", label: "Tipo documento", type: "select", defaultValue: "cedula",
      options: [
        { value: "cedula", label: "Cédula" },
        { value: "pasaporte", label: "Pasaporte" },
        { value: "ruc", label: "RUC" },
        { value: "otro", label: "Otro" },
      ],
    },
    { name: "documento", label: "Número documento", type: "text", required: true },
    { name: "telefono", label: "Teléfono", type: "tel" },
    { name: "whatsapp", label: "WhatsApp", type: "tel" },
    { name: "correo", label: "Correo", type: "email", span: 2 },
    { name: "direccion", label: "Dirección", type: "text", span: 2 },
    { name: "ciudad", label: "Ciudad", type: "text" },
    { name: "pais", label: "País", type: "text", defaultValue: "Nicaragua" },
    { name: "licencia", label: "Licencia de conducir", type: "text" },
    { name: "licencia_vencimiento", label: "Vence licencia", type: "date" },
    { name: "contacto_emergencia_nombre", label: "Contacto emergencia (nombre)", type: "text" },
    { name: "contacto_emergencia_telefono", label: "Contacto emergencia (tel)", type: "tel" },
    { name: "observaciones", label: "Observaciones", type: "textarea", span: 2 },
  ],
  icon: <Users className="size-6 text-gold" />,
};

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — TM RENT A CAR" }] }),
  component: () => <CrudPage config={config} />,
});