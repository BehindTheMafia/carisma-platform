import { Camera } from "lucide-react";
import { ImageUpload, type Foto } from "@/components/image-upload";
import type { UseFormReturn } from "react-hook-form";
import type { VehicleDamageFormValues } from "./schema";
import { Section } from "./section";

interface Props {
  form: UseFormReturn<VehicleDamageFormValues>;
}

export function EvidenceGallery({ form }: Props) {
  const evidencias: Foto[] = form.watch("evidencias") ?? [];

  return (
    <Section icon={Camera} title="Evidencias Fotográficas" subtitle="Fotos del daño (máximo 4)">
      <ImageUpload
        bucket="vehiculo-fotos"
        maxImages={4}
        value={evidencias}
        onChange={(v) => form.setValue("evidencias", v, { shouldDirty: true })}
      />
    </Section>
  );
}
