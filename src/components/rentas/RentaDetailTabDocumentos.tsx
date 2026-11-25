import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Loader2, Ban, RotateCcw, Download, ExternalLink, Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { generatePDF } from "@/utils/pdfGenerator";

type DocumentoRow = {
  id: string;
  numero: string;
  tipo: string;
  pdf_url: string | null;
  estado: string;
  fecha: string | null;
  created_at: string;
  form_data: Record<string, unknown> | null;
};

const DOCUMENTOS = [
  { tipo: "proforma",     label: "Proforma" },
  { tipo: "confirmacion", label: "Confirmación de Reserva" },
  { tipo: "contrato",     label: "Contrato" },
  { tipo: "factura",      label: "Factura" },
] as const;

export function RentaDetailTabDocumentos({ rentaId, numeroOficial }: { rentaId: string; numeroOficial?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [confirmAnular, setConfirmAnular] = useState<{ id: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; numero: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documentos-renta", rentaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, numero, tipo, pdf_url, estado, fecha, created_at, form_data")
        .eq("renta_id", rentaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentoRow[];
    },
  });

  const docsByTipo = new Map(docs.map((d) => [d.tipo, d]));

  const anularM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contratos").update({ estado: "anulado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento anulado");
      queryClient.invalidateQueries({ queryKey: ["documentos-renta", rentaId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminarM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contratos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento eliminado");
      queryClient.invalidateQueries({ queryKey: ["documentos-renta", rentaId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDescargar = async (doc: DocumentoRow) => {
    if (doc.pdf_url) {
      const a = document.createElement("a");
      a.href = doc.pdf_url;
      a.download = `${doc.numero}.pdf`;
      a.click();
      return;
    }
    if (!doc.form_data) {
      toast.error("No hay datos para generar el PDF.");
      return;
    }
    setDownloading(doc.id);
    try {
      const fechaDocClean = doc.form_data.fechaDoc
        ? String(doc.form_data.fechaDoc).slice(0, 10)
        : (doc.fecha ? doc.fecha.slice(0, 10) : undefined);
      const pdf = await generatePDF({
        ...doc.form_data,
        fechaDoc: fechaDocClean,
        docType: doc.tipo,
      } as never);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.numero}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setDownloading(null);
    }
  };

  const docFecha = (doc: DocumentoRow) => {
    if (doc.fecha) return formatDate(doc.fecha);
    if (doc.form_data?.fechaDoc) return formatDate(String(doc.form_data.fechaDoc));
    return formatDate(doc.created_at);
  };

  const displayNumero = numeroOficial || "—";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {DOCUMENTOS.map(({ tipo, label }) => {
        const doc = docsByTipo.get(tipo);
        const existe = !!doc;

        return (
          <div
            key={tipo}
            className="flex items-center justify-between rounded-lg border bg-card p-3 cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => {
              if (existe) {
                navigate({ to: "/documentos", search: { editId: doc.id, rentaId } });
              } else {
                navigate({ to: "/documentos", search: { editId: undefined, rentaId } });
              }
            }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                <FileText className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {`${label} Nº ${displayNumero}`}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      existe
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-muted-foreground/30"
                    }
                  >
                    {existe ? "Emitido" : "Pendiente"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {existe ? (
                    <span className="text-xs text-muted-foreground">{docFecha(doc)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No emitida</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              {existe ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Abrir"
                    onClick={() => navigate({ to: "/documentos", search: { editId: doc.id, rentaId } })}
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Descargar PDF"
                    disabled={downloading === doc.id}
                    onClick={() => handleDescargar(doc)}
                  >
                    {downloading === doc.id
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Download className="size-3.5" />
                    }
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Reimprimir"
                    onClick={() => navigate({ to: "/documentos", search: { editId: doc.id, rentaId } })}
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>

                  {doc.estado !== "anulado" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      title="Anular"
                      onClick={() => setConfirmAnular({ id: doc.id })}
                    >
                      <Ban className="size-3.5" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    title="Eliminar"
                    onClick={() => setConfirmDelete({ id: doc.id, numero: doc.numero })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => navigate({ to: "/documentos", search: { editId: undefined, rentaId } })}
                >
                  <FileText className="size-3" /> Emitir
                </Button>
              )}
            </div>
          </div>
        );
      })}

      <AlertDialog
        open={!!confirmAnular}
        onOpenChange={(o) => { if (!o) setConfirmAnular(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular este documento?</AlertDialogTitle>
            <AlertDialogDescription>
              El documento pasará a estado "anulado" y ya no será válido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAnular) anularM.mutate(confirmAnular.id);
                setConfirmAnular(null);
              }}
            >
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente <span className="font-semibold">{confirmDelete?.numero}</span> de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) eliminarM.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
