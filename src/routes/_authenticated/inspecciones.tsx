import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/inspecciones")({
  head: () => ({ meta: [{ title: "Inspecciones — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Inspecciones" description="Inspecciones de salida y devolución con fotos, daños y firma." icon={ClipboardCheck} />,
});