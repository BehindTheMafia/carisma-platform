import { AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { UseFormReturn } from "react-hook-form";
import type { VehicleDamageFormValues } from "./schema";
import { Section } from "./section";

interface Props {
  form: UseFormReturn<VehicleDamageFormValues>;
}

export function DamageDescription({ form }: Props) {
  return (
    <Section
      icon={AlertTriangle}
      title="Descripción del Daño"
      subtitle="Detalle del daño o desperfecto encontrado"
    >
      <Textarea
        value={form.watch("descripcion")}
        onChange={(e) => form.setValue("descripcion", e.target.value, { shouldDirty: true })}
        rows={4}
        placeholder="Describe con detalle el daño observado, extensión, gravedad y estado general de la pieza afectada…"
        className="rounded-lg border-border/70 text-xs"
      />
    </Section>
  );
}
