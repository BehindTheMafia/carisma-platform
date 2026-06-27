import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/rentas")({
  head: () => ({ meta: [{ title: "Rentas — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Rentas" description="Flujo completo de renta: reserva, activación, contrato y devolución." icon={FileText} />,
});