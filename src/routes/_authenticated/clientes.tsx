import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Clientes" description="Registro de clientes con licencias, historial de rentas, pagos y multas." icon={Users} />,
});