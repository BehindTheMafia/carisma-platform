import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/multas")({
  head: () => ({ meta: [{ title: "Multas — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Multas" description="Registro y seguimiento de multas con evidencias y responsables." icon={AlertTriangle} />,
});