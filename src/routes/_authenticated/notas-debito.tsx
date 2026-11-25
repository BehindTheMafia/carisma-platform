import { createFileRoute } from "@tanstack/react-router";
import { NotasDebitoPage } from "@/components/notas-debito/NotasDebitoPage";

export const Route = createFileRoute("/_authenticated/notas-debito")({
  validateSearch: (search: Record<string, unknown>) => ({
    editId: typeof search.editId === "string" ? search.editId : undefined,
    rentaId: typeof search.rentaId === "string" ? search.rentaId : undefined,
  }),
  head: () => ({ meta: [{ title: "Notas de Débito — TM RENT A CAR" }] }),
  component: () => {
    const { editId, rentaId } = Route.useSearch();
    return <NotasDebitoPage initialEditId={editId} initialRentaId={rentaId} />;
  },
});
