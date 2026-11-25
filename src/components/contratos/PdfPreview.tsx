import {
  FileText,
  CheckCircle2,
  Download,
  Loader2,
  Database,
  Eraser,
  Stamp,
  Wrench,
  FileCheck2,
  FileText as FileTextIcon,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  proforma: "Generar Proforma PDF",
  confirmacion: "Generar Confirmación PDF",
  factura: "Generar Factura PDF",
  contrato: "Generar Contrato PDF",
};

export function PdfPreview({
  docType,
  blobUrl,
  onGenerate,
  isGenerating,
  fileName,
  onSave,
  isSaving,
  saved,
  onViewHistory,
  onClear,
  sinFirma,
  onToggleSinFirma,
  onCalibrate,
  preprintedMode,
  onTogglePreprinted,
  sinNotaCredito,
  onToggleSinNotaCredito,
}: {
  docType: string;
  blobUrl: string | null;
  onGenerate: () => void;
  isGenerating: boolean;
  fileName: string;
  onSave?: () => void;
  isSaving?: boolean;
  saved?: boolean;
  onViewHistory?: () => void;
  onClear?: () => void;
  sinFirma?: boolean;
  onToggleSinFirma?: () => void;
  onCalibrate?: () => void;
  preprintedMode?: boolean;
  onTogglePreprinted?: () => void;
  sinNotaCredito?: boolean;
  onToggleSinNotaCredito?: () => void;
}) {
  return (
    <div className="min-w-0 lg:sticky lg:top-[88px] space-y-4">
      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full h-auto py-4 px-6 text-base font-bold shadow-md hover:shadow-lg transition-all gap-3"
      >
        {isGenerating ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <FileText className="size-5" />
        )}
        <span>{isGenerating ? "Generando..." : labels[docType]}</span>
      </Button>

      {onClear && (
        <Button onClick={onClear} variant="outline" className="w-full gap-2 border-dashed">
          <Eraser className="size-4" />
          Documento en blanco
        </Button>
      )}

      {onToggleSinFirma && (
        <Button
          onClick={onToggleSinFirma}
          variant={sinFirma ? "secondary" : "outline"}
          className="w-full gap-2"
        >
          <Stamp className="size-4" />
          {sinFirma ? "Sin firma y sello" : "Con firma y sello"}
        </Button>
      )}

      {docType === "confirmacion" && onToggleSinNotaCredito && (
        <Button
          onClick={onToggleSinNotaCredito}
          variant={sinNotaCredito ? "secondary" : "outline"}
          className="w-full gap-2 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950"
        >
          <Ban className="size-4" />
          {sinNotaCredito ? "Sin Nota de Crédito" : "Con Nota de Crédito"}
        </Button>
      )}

      {docType === "factura" && onTogglePreprinted !== undefined && (
        <Button
          onClick={onTogglePreprinted}
          variant={preprintedMode ? "secondary" : "outline"}
          className="w-full gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          {preprintedMode ? <FileCheck2 className="size-4" /> : <FileTextIcon className="size-4" />}
          {preprintedMode ? "Modo preimpreso (solo texto)" : "Factura normal (con diseño)"}
        </Button>
      )}


      {blobUrl ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-[70dvh] min-h-80 lg:h-[700px]">
          <div className="bg-muted border-b border-border p-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="size-4" /> Documento Listo
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onSave && (
                <Button
                  onClick={onSave}
                  disabled={isSaving || saved}
                  variant="default"
                  size="sm"
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Database className="size-3.5" />
                  )}
                  {isSaving ? "Guardando..." : saved ? "Guardado en sistema" : "Guardar en sistema"}
                </Button>
              )}
              {saved && onViewHistory && (
                <Button onClick={onViewHistory} variant="outline" size="sm">
                  Ver historial
                </Button>
              )}
              <a
                href={blobUrl}
                download={fileName || `Documento_${docType}.pdf`}
                className="inline-flex flex-wrap items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
              >
                <Download className="size-4" /> Descargar
              </a>
            </div>
          </div>
          <iframe
            src={blobUrl}
            className="w-full flex-1 bg-muted/50"
            title="Vista previa del PDF"
          />
          {!saved && onSave && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              Para que aparezca en el historial, pulsá «Guardar en sistema».
            </p>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border-2 border-dashed border-border min-h-60 sm:h-[500px] flex flex-col items-center justify-center text-muted-foreground">
          <FileText className="size-16 mb-3 opacity-40" />
          <p className="font-medium">Completa el formulario y genera el documento</p>
        </div>
      )}
    </div>
  );
}
