import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({ meta: [{ title: "Configuración — TM RENT A CAR" }] }),
  component: () => <ModulePlaceholder title="Configuración" description="Datos de la empresa, tarifas, métodos de pago, moneda e impuestos." icon={Settings} />,
});