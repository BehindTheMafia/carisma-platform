import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendario — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Calendario" description="Vista tipo agenda con rentas activas, reservas y devoluciones programadas." icon={Calendar} />,
});