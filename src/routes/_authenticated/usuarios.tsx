import { createFileRoute } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Usuarios" description="Administración de owners y administradores del sistema." icon={UserCog} />,
});