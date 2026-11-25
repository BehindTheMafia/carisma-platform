import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Search, Receipt, Download, Trash2, Printer, Pencil, SlidersHorizontal, Eye, Copy, Ban, X,
} from "lucide-react";
import { formatDate, formatCurrencyDual, type Moneda } from "@/lib/format";
import { toast } from "sonner";
import { type NotaDebitoRow, type NotaDebitoEstado, type NotaDebitoFormData } from "@/types/notas-debito";
import { NotaDebitoForm } from "./NotaDebitoForm";
import { NotaDebitoCalibrationMode } from "./NotaDebitoCalibrationMode";
import { generateNotaDebitoPDF } from "@/utils/pdfGeneratorNotaDebito";
import { getNotaDebitoCalibrationOffsets } from "@/utils/calibrationNotaDebitoStorage";

const ESTADO_COLORS: Record<NotaDebitoEstado, string> = {
  borrador: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  emitida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  anulada: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export function NotasDebitoPage({
  initialEditId,
  initialRentaId,
}: {
  initialEditId?: string;
  initialRentaId?: string;
}) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"list" | "form">(
    initialEditId || initialRentaId ? "form" : "list"
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(initialEditId);
  const [filterRentaId, setFilterRentaId] = useState<string | undefined>(initialRentaId);

  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const { data } = await supabase.from("configuracion_empresa").select("tipo_cambio").limit(1).maybeSingle();
      return { tipoCambio: Number(data?.tipo_cambio ?? 36.5) };
    },
    staleTime: 5 * 60 * 1000,
  });
  const tipoCambio = config?.tipoCambio ?? 36.5;

  // List Query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["notas-debito", search, filterEstado, page],
    queryFn: async () => {
      let q = supabase
        .from("notas_debito")
        .select("*, cliente:clientes(nombre, documento)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (search) {
        q = q.or(`numero.ilike.%${search}%,descripcion_general.ilike.%${search}%`);
      }
      if (filterEstado !== "todos") {
        q = q.eq("estado", filterEstado);
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, count, error } = await q;
      if (error) throw error;

      return { data: (data ?? []) as unknown as NotaDebitoRow[], count: count ?? 0 };
    },
  });

  // Delete Mutation
  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notas_debito").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-debito"] });
      queryClient.invalidateQueries({ queryKey: ["reportes"] });
      queryClient.invalidateQueries({ queryKey: ["historial"] });
      toast.success("Nota de Débito eliminada");
      setConfirmDelete(null);
    },
    onError: () => toast.error("No se pudo eliminar la Nota de Débito"),
  });

  // Re-imprimir / Generar PDF desde el listado
  const handlePrintRow = async (row: NotaDebitoRow, download = false) => {
    try {
      // Cargar ítems del detalle
      const { data: items } = await supabase
        .from("nota_debito_detalle")
        .select("*")
        .eq("nota_debito_id", row.id);

      const fullData: NotaDebitoFormData = {
        id: row.id,
        numero: row.numero,
        fecha: row.fecha,
        cliente_id: row.cliente_id || "",
        cliente_nombre: row.cliente?.nombre || "—",
        cliente_ruc: row.cliente?.documento || "",
        condicion_pago: row.condicion_pago || "Contado",
        renta_id: row.renta_id || "",
        factura_id: row.factura_id || "",
        descripcion_general: row.descripcion_general || "",
        observaciones: row.observaciones || "",
        moneda: (row as any).moneda || "NIO",
        estado: row.estado,
        items: (items ?? []).map((it) => ({
          codigo: it.codigo || "",
          descripcion: it.descripcion,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          subtotal: Number(it.subtotal),
        })),
        subtotal: Number(row.subtotal),
        iva: Number(row.iva),
        total: Number(row.total),
      };

      const offsets = getNotaDebitoCalibrationOffsets();
      const doc = await generateNotaDebitoPDF(fullData, offsets);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);

      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${row.numero}.pdf`;
        a.click();
      } else {
        setPdfPreviewUrl(url);
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error al generar PDF");
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));

  if (mode === "form") {
    return (
      <div className="space-y-6">
        <NotaDebitoForm
          editId={selectedId}
          initialRentaId={filterRentaId}
          onBack={() => {
            setMode("list");
            setSelectedId(undefined);
            setFilterRentaId(undefined);
          }}
          onSaved={(id) => {
            setSelectedId(id);
          }}
          onOpenCalibration={() => setCalibrationOpen(true)}
        />
        <NotaDebitoCalibrationMode
          isOpen={calibrationOpen}
          onClose={() => setCalibrationOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2.5">
            <Receipt className="size-6 text-gold" /> Notas de Débito
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestión y emisión de notas de débito independientes para ajustes o cobros adicionales post-renta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCalibrationOpen(true)} className="gap-1.5">
            <SlidersHorizontal className="size-4" /> Calibrar PDF
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setSelectedId(undefined);
              setFilterRentaId(undefined);
              setMode("form");
            }}
            className="gap-1.5 bg-gold hover:bg-gold/90 text-slate-950 font-semibold"
          >
            <Plus className="size-4" /> Nueva Nota de Débito
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número o motivo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="h-9 pl-9"
          />
        </div>
        <Select
          value={filterEstado}
          onValueChange={(v) => {
            setFilterEstado(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="h-9 w-full sm:w-44">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="emitida">Emitida</SelectItem>
            <SelectItem value="anulada">Anulada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table List */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold text-muted-foreground">N.º Nota Débito</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Cliente</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Estado</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Cargando Notas de Débito...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-destructive">
                    Error: {(error as Error)?.message}
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No se encontraron Notas de Débito
                  </td>
                </tr>
              ) : (
                data?.data.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium font-mono">{row.numero}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{row.cliente?.nombre || "—"}</p>
                        {row.descripcion_general && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{row.descripcion_general}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(row.fecha)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrencyDual(Number(row.total || 0), (row as any).moneda || "NIO", tipoCambio)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={ESTADO_COLORS[row.estado] || ""}>
                        {row.estado.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Descargar PDF"
                          onClick={() => handlePrintRow(row, true)}
                        >
                          <Download className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Vista previa / Imprimir"
                          onClick={() => handlePrintRow(row, false)}
                        >
                          <Printer className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Editar"
                          onClick={() => {
                            setSelectedId(row.id);
                            setMode("form");
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          title="Eliminar"
                          onClick={() => setConfirmDelete(row.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}

      {/* Calibration Modal */}
      <NotaDebitoCalibrationMode
        isOpen={calibrationOpen}
        onClose={() => setCalibrationOpen(false)}
      />

      {/* PDF Dialog */}
      <Dialog
        open={!!pdfPreviewUrl}
        onOpenChange={(o) => {
          if (!o) {
            setPdfPreviewUrl(null);
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
          }
        }}
      >
        <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between">
            <DialogTitle className="text-sm font-semibold">Imprimir / Vista Previa Nota de Débito</DialogTitle>
            <Button
              size="sm"
              onClick={() => {
                const iframe = document.getElementById("nd-pdf-iframe-list") as HTMLIFrameElement;
                iframe?.contentWindow?.print();
              }}
              className="gap-1.5 text-xs"
            >
              <Printer className="size-3.5" /> Imprimir
            </Button>
          </DialogHeader>
          <iframe
            id="nd-pdf-iframe-list"
            src={pdfPreviewUrl || ""}
            className="flex-1 w-full bg-slate-100 dark:bg-slate-900"
            title="Vista previa Nota de Débito"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta Nota de Débito?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el registro permanentemente de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteM.mutate(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
