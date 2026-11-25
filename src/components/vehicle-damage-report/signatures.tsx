import { PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseFormReturn } from "react-hook-form";
import type { VehicleDamageFormValues } from "./schema";
import { Section } from "./section";
import { SignaturePad } from "./signature-pad";

interface Props {
  form: UseFormReturn<VehicleDamageFormValues>;
}

type RolFirma = "representante" | "cliente";

function FirmaCard({
  form,
  rol,
  title,
  subtitle,
}: {
  form: UseFormReturn<VehicleDamageFormValues>;
  rol: RolFirma;
  title: string;
  subtitle: string;
}) {
  const base = `firmas.${rol}` as const;
  const firma = form.watch(base);

  return (
    <div className="rounded-xl border border-border bg-background p-4 flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <PenLine className="size-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre completo</Label>
          <Input
            value={firma?.nombre ?? ""}
            onChange={(e) => form.setValue(`${base}.nombre`, e.target.value, { shouldDirty: true })}
            placeholder="Nombre completo"
            className="h-9 rounded-lg border-border/70 text-xs"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs font-medium text-muted-foreground">
            {rol === "representante" ? "Cargo / ID Inspector" : "Cédula / Pasaporte"}
          </Label>
          <Input
            value={firma?.documento ?? ""}
            onChange={(e) => form.setValue(`${base}.documento`, e.target.value, { shouldDirty: true })}
            placeholder={rol === "representante" ? "Ej. Inspector" : "Ej. 001-000000-0000X"}
            className="h-9 rounded-lg border-border/70 text-xs"
          />
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Firma digital
        </Label>
        <SignaturePad
          value={firma?.firmaUrl}
          onChange={(v) => form.setValue(`${base}.firmaUrl`, v, { shouldDirty: true })}
        />
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha de Firma</Label>
        <Input
          type="date"
          value={firma?.fecha ?? ""}
          onChange={(e) => form.setValue(`${base}.fecha`, e.target.value, { shouldDirty: true })}
          className="h-9 rounded-lg border-border/70 text-xs"
        />
      </div>

      {/* Espacio para firma física al imprimir */}
      <div className="pt-4 border-t border-dashed border-border/80 text-center mt-2">
        <div className="h-14 flex items-end justify-center pb-1">
          {firma?.firmaUrl ? (
            <img src={firma.firmaUrl} alt={`Firma ${title}`} className="max-h-12 object-contain" />
          ) : (
            <div className="w-48 border-b-2 border-slate-400"></div>
          )}
        </div>
        <p className="text-xs font-bold text-foreground mt-1">
          {firma?.nombre || `___________________ (${title})`}
        </p>
        {firma?.documento && (
          <p className="text-[10px] text-muted-foreground">Doc: {firma.documento}</p>
        )}
      </div>
    </div>
  );
}

export function Signatures({ form }: Props) {
  return (
    <Section
      icon={PenLine}
      title="Firmas de Conformidad"
      subtitle="Firma del representante de la empresa y del cliente en señal de aceptación"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FirmaCard
          form={form}
          rol="representante"
          title="Representante TM Rent A Car"
          subtitle="Inspector encargado"
        />
        <FirmaCard
          form={form}
          rol="cliente"
          title="Cliente / Arrendatario"
          subtitle="Responsable del vehículo"
        />
      </div>
    </Section>
  );
}
