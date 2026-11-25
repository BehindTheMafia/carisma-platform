import { MessageSquareText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { UseFormReturn } from "react-hook-form";
import type { VehicleDamageFormValues } from "./schema";
import { Section } from "./section";

interface Props {
  form: UseFormReturn<VehicleDamageFormValues>;
}

export function Observations({ form }: Props) {
  return (
    <Section
      icon={MessageSquareText}
      title="Observaciones"
      subtitle="Comentarios adicionales del estado del vehículo"
    >
      <Textarea
        value={form.watch("observaciones")}
        onChange={(e) => form.setValue("observaciones", e.target.value, { shouldDirty: true })}
        rows={3}
        placeholder="Observaciones generales, acuerdos, condiciones de entrega…"
        className="rounded-lg border-border/70 text-xs"
      />
    </Section>
  );
}
