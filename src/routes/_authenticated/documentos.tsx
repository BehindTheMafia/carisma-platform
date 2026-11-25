import { createFileRoute } from "@tanstack/react-router";
import { ContratosPage } from "@/components/contratos/ContratosPage";

export const Route = createFileRoute("/_authenticated/documentos")({
  validateSearch: (search: Record<string, unknown>) => ({
    editId: typeof search.editId === "string" ? search.editId : undefined,
    rentaId: typeof search.rentaId === "string" ? search.rentaId : undefined,
  }),
  head: () => ({ meta: [{ title: "Documentos — TM RENT A CAR" }] }),
  component: () => {
    const { editId, rentaId } = Route.useSearch();
    return <ContratosPage editId={editId} rentaId={rentaId} />;
  },
});