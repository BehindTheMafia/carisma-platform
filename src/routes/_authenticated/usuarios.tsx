import { createFileRoute } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrudPage, type CrudConfig } from "@/components/crud-page";
import { formatDate } from "@/lib/format";

type Profile = {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  activo: boolean;
  created_at: string;
};

const config: CrudConfig<Profile> = {
  title: "Usuarios",
  description: "Cuentas del sistema. Nuevas cuentas se crean desde el registro.",
  table: "profiles",
  softDelete: false,
  allowCreate: false,
  allowDelete: false,
  searchFields: ["nombre", "correo", "telefono"],
  columns: [
    { key: "nombre", label: "Nombre", render: (r) => <span className="font-medium">{r.nombre}</span> },
    { key: "correo", label: "Correo" },
    { key: "telefono", label: "Teléfono" },
    {
      key: "activo", label: "Estado", render: (r) => r.activo
        ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Activo</Badge>
        : <Badge variant="outline" className="bg-muted">Inactivo</Badge>,
    },
    { key: "created_at", label: "Registrado", render: (r) => formatDate(r.created_at) },
  ],
  fields: [
    { name: "nombre", label: "Nombre", type: "text", required: true },
    { name: "correo", label: "Correo", type: "email", required: true },
    { name: "telefono", label: "Teléfono", type: "tel" },
    { name: "activo", label: "Activo", type: "checkbox", defaultValue: true },
  ],
  icon: <UserCog className="size-6 text-gold" />,
};

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios — TM RENT A CAR" }] }),
  component: () => <CrudPage config={config} />,
});