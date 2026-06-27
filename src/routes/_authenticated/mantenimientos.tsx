import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/mantenimientos")({
  head: () => ({ meta: [{ title: "Mantenimientos — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Mantenimientos" description="Registro y programación de servicios mecánicos por vehículo." icon={Wrench} />,
});