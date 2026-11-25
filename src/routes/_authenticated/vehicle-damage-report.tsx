import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { VehicleDamagePage } from "@/components/vehicle-damage-report/vehicle-damage-page";

export const Route = createFileRoute("/_authenticated/vehicle-damage-report")({
  validateSearch: (search: Record<string, unknown>) => ({
    editId: typeof search.editId === "string" ? search.editId : undefined,
  }),
  head: () => ({ meta: [{ title: "Informe de Daños — TM RENT A CAR" }] }),
  component: VehicleDamageRouteComponent,
});

function VehicleDamageRouteComponent() {
  const { editId } = Route.useSearch();
  return <VehicleDamagePage editId={editId} />;
}
