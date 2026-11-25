import { FileCheck2, Wand2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { UseFormReturn } from "react-hook-form";
import type { VehicleDamageFormValues } from "./schema";
import { ZONA_LABEL, CONCLUSION_BASE } from "./types";
import { Section } from "./section";

interface Props {
  form: UseFormReturn<VehicleDamageFormValues>;
}

function buildConclusion(form: UseFormReturn<VehicleDamageFormValues>): string {
  const v = form.getValues();
  const zonas = (v.zonas ?? []).map((z) => ZONA_LABEL[z].toLowerCase()).join(", ");
  const parte = `Se deja constancia de que el vehículo ${v.vehiculo.marca} ${v.vehiculo.modelo} con placa ${v.vehiculo.placa} presenta daños en: ${zonas || "ninguna zona registrada"}.`;
  return `${parte} ${CONCLUSION_BASE}`;
}

export function Conclusion({ form }: Props) {
  return (
    <Section
      icon={FileCheck2}
      title="Conclusión"
      subtitle="Declaración final del estado del vehículo"
    >
      <div className="space-y-2.5">
        <Textarea
          value={form.watch("conclusion")}
          onChange={(e) => form.setValue("conclusion", e.target.value, { shouldDirty: true })}
          rows={4}
          className="rounded-lg border-border/70 text-xs"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[11px]"
            onClick={() =>
              form.setValue("conclusion", buildConclusion(form), { shouldDirty: true })
            }
          >
            <Wand2 className="size-3.5" />
            Generar automáticamente
          </Button>
        </div>
      </div>
    </Section>
  );
}
