import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => ({ meta: [{ title: "Pagos — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Pagos" description="Adelantos, pagos parciales y pagos finales con múltiples métodos." icon={CreditCard} />,
});