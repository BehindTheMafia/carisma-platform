import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/seguros")({
  head: () => ({ meta: [{ title: "Seguros — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Seguros" description="Pólizas vigentes, renovaciones y alertas de vencimiento." icon={ShieldCheck} />,
});