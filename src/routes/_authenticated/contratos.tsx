import { createFileRoute } from "@tanstack/react-router";
import { FileSignature } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/contratos")({
  head: () => ({ meta: [{ title: "Contratos — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Contratos" description="Generación automática de contratos, proformas y actas de entrega en PDF." icon={FileSignature} />,
});