import { FileText, CheckCircle2, Download, Loader2 } from "lucide-react";
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
}: {
  docType: string;
  blobUrl: string | null;
  onGenerate: () => void;
  isGenerating: boolean;
  fileName: string;
}) {
  return (
    <div className="sticky top-[88px] space-y-4">
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

      {blobUrl ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-[700px]">
          <div className="bg-muted border-b border-border p-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="size-4" /> Documento Listo
            </div>
            <a
              href={blobUrl}
              download={fileName || `Documento_${docType}.pdf`}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Download className="size-4" /> Descargar
            </a>
          </div>
          <iframe
            src={blobUrl}
            className="w-full flex-1 bg-muted/50"
            title="Vista previa del PDF"
          />
        </div>
      ) : (
        <div className="bg-card rounded-xl border-2 border-dashed border-border h-[500px] flex flex-col items-center justify-center text-muted-foreground">
          <FileText className="size-16 mb-3 opacity-40" />
          <p className="font-medium">Completa el formulario y genera el documento</p>
        </div>
      )}
    </div>
  );
}
