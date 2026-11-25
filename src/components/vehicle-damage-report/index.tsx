import { useState } from "react";
import { Download, FileDown, Loader2, Printer, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UseFormReturn } from "react-hook-form";
import type { VehicleDamageFormValues } from "./schema";
import { Header } from "./header";
import { ClientInformation } from "./client-information";
import { VehicleInformation } from "./vehicle-information";
import { DamageDescription } from "./damage-description";
import { DamageLocation } from "./damage-location";
import { EvidenceGallery } from "./evidence-gallery";
import { Observations } from "./observations";
import { Conclusion } from "./conclusion";
import { Signatures } from "./signatures";

import type { CompanyInfo } from "./types";

export interface VehicleDamageFormProps {
  form: UseFormReturn<VehicleDamageFormValues>;
  isDirty: boolean;
  draftState: "idle" | "saving" | "saved";
  isSaving: boolean;
  hasId: boolean;
  companyInfo?: CompanyInfo | null;
  onSave: () => void;
  onNew: () => void;
  onExportJSON: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
}

export function VehicleDamageForm({
  form,
  isDirty,
  draftState,
  isSaving,
  hasId,
  companyInfo,
  onSave,
  onNew,
  onExportJSON,
  onExportPDF,
  onPrint,
}: VehicleDamageFormProps) {
  const [confirmNew, setConfirmNew] = useState(false);

  const draftLabel =
    draftState === "saving"
      ? "Guardando borrador…"
      : draftState === "saved"
        ? "Borrador guardado"
        : isDirty
          ? "Cambios sin guardar"
          : "Sin cambios";
  const draftClass =
    draftState === "saved"
      ? "text-emerald-600 dark:text-emerald-400"
      : isDirty
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  const handleNew = () => {
    if (isDirty && !confirmNew) {
      setConfirmNew(true);
      return;
    }
    setConfirmNew(false);
    onNew();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Informe de Daños del Vehículo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasId ? "Edición de informe existente" : "Nuevo informe de constancia"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-medium ${draftClass}`}>{draftLabel}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[11px]"
            onClick={handleNew}
          >
            <Trash2 className="size-3.5" />
            {confirmNew ? "¿Confirmar?" : "Nuevo"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[11px]"
            onClick={onExportJSON}
          >
            <Download className="size-3.5" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[11px]"
            onClick={onExportPDF}
          >
            <FileDown className="size-3.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[11px]" onClick={onPrint}>
            <Printer className="size-3.5" />
            Imprimir
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-[#111827] text-[11px] text-white hover:bg-[#1F2937] dark:bg-white dark:text-[#111827] dark:hover:bg-[#E5E7EB]"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      <div className="space-y-6 print-area">
        <Header
          fecha={form.watch("fecha")}
          hora={form.watch("hora")}
          companyInfo={companyInfo}
          onFechaChange={(v) => form.setValue("fecha", v, { shouldDirty: true })}
          onHoraChange={(v) => form.setValue("hora", v, { shouldDirty: true })}
        />
        <ClientInformation form={form} />
        <VehicleInformation form={form} />
        <DamageDescription form={form} />
        <DamageLocation form={form} />
        <EvidenceGallery form={form} />
        <Observations form={form} />
        <Conclusion form={form} />
        <Signatures form={form} />
      </div>
    </div>
  );
}
