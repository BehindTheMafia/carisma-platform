import { useEffect } from "react";
import { toast } from "sonner";
import { useVehicleDamage } from "./use-vehicle-damage";
import { VehicleDamageForm } from "./index";

export function VehicleDamagePage({ editId }: { editId?: string }) {
  const {
    form,
    isDirty,
    draftState,
    isSaving,
    companyInfo,
    save,
    loadById,
    newReport,
    exportJSON,
    generatePDF,
    print,
  } = useVehicleDamage();

  useEffect(() => {
    if (!editId) return;
    loadById(editId).catch((e) => toast.error((e as Error).message));
  }, [editId, loadById]);

  return (
    <VehicleDamageForm
      form={form}
      isDirty={isDirty}
      draftState={draftState}
      isSaving={isSaving}
      hasId={Boolean(editId)}
      companyInfo={companyInfo}
      onSave={() => save(editId)}
      onNew={newReport}
      onExportJSON={exportJSON}
      onExportPDF={generatePDF}
      onPrint={print}
    />
  );
}
