import { createFileRoute } from "@tanstack/react-router";
import { Car } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/vehiculos")({
  head: () => ({ meta: [{ title: "Vehículos — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Vehículos" description="Administra la flota completa: códigos, placas, tarifas, fotos y documentación." icon={Car} />,
});