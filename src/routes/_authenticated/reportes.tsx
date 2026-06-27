import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({ meta: [{ title: "Reportes — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Reportes" description="Reportes financieros y operativos exportables a PDF y Excel." icon={BarChart3} />,
});