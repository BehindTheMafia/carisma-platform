import { createFileRoute } from "@tanstack/react-router";
import { ContratosPage } from "@/components/contratos/ContratosPage";

export const Route = createFileRoute("/_authenticated/contratos")({
  head: () => ({ meta: [{ title: "Contratos — TM RENT A CAR" }] }),
  component: () => <ContratosPage />,
});