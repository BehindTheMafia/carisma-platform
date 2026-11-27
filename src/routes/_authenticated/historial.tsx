import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generatePDF } from "@/utils/pdfGenerator";
import { generateNotaDebitoPDF } from "@/utils/pdfGeneratorNotaDebito";
import { getNotaDebitoCalibrationOffsets } from "@/utils/calibrationNotaDebitoStorage";
import {
  History, Search, Download, Trash2, Printer, Pencil, X, CreditCard,
  Link2, Unlink, Car,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { type NotaDebitoFormData, type NotaDebitoEstado } from "@/types/notas-debito";
import { FacturaConceptosPayments } from "@/components/contratos/FacturaConceptosPayments";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type ContratoRow = {
  id: string;
  numero: string;
  tipo: string;
  created_at: string;
  fecha?: string | null;
  pdf_url: string | null;
  form_data: Record<string, unknown> | null;
  renta_id: string | null;
  rentas?: {
    folio: string;
    numero_oficial: string | null;
    clientes?: { nombre: string } | null;
    vehiculos?: { codigo: string; marca: string; modelo: string } | null;
  } | null;
};

type NotaDebitoHistorialRow = {
  id: string;
  numero: string;
  created_at: string;
  cliente_id: string | null;
  renta_id: string | null;
  descripcion_general: string | null;
  subtotal: number;
  iva: number;
  total: number;
  estado: string;
  cliente?: { nombre: string; documento?: string | null } | null;
};

type HistorialDoc = ContratoRow | NotaDebitoHistorialRow;

type RentaOption = {
  id: string;
  folio: string;
  fecha_inicio: string;
  fecha_devolucion: string;
  estado: string;
  clientes?: { nombre: string } | null;
  vehiculos?: { codigo: string; marca: string; modelo: string; placa: string } | null;
};

// ── Helpers visuales ──────────────────────────────────────────────────────────
const tipoLabel: Record<string, string> = {
  proforma: "Proforma",
  confirmacion: "Confirmación",
  factura: "Factura",
  contrato: "Contrato",
  nota_debito: "Nota Débito",
};

const tipoColor: Record<string, string> = {
  proforma: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  confirmacion: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  factura: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  contrato: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  nota_debito: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

const estadoColor: Record<string, string> = {
  activa: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  completada: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  cancelada: "bg-red-500/15 text-red-700 border-red-500/30",
  pendiente: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};

// ── Componente principal ──────────────────────────────────────────────────────
function Page() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Estado de historial
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [reprinting, setReprinting] = useState<string | null>(null);
  const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Estado del modal de vinculación
  const [linkModalDoc, setLinkModalDoc] = useState<ContratoRow | null>(null);
  const [payModalDoc, setPayModalDoc] = useState<ContratoRow | null>(null);
  const [rentaSearch, setRentaSearch] = useState("");

  // ── Query: historial ──────────────────────────────────────────────────────
  const { data, isLoading, isError, error: histError } = useQuery({
    queryKey: ["historial", search, filterTipo, page],
    queryFn: async () => {
      if (filterTipo === "nota_debito") {
        let q = supabase
          .from("notas_debito")
          .select(
            "id, numero, fecha, cliente_id, renta_id, descripcion_general, subtotal, iva, total, estado, cliente:clientes(nombre, documento)",
            { count: "exact" },
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (search) q = q.ilike("numero", `%${search}%`);

        const from = page * pageSize;
        const to = from + pageSize - 1;
        q = q.range(from, to);

        const { data, count, error } = await q;
        if (error) throw error;
        const mapped = (data ?? []).map((d: Record<string, unknown>) => ({
          ...d,
          created_at: d.fecha,
          fecha: undefined,
        })) as unknown as NotaDebitoHistorialRow[];
        return { data: mapped, count: count ?? 0 };
      }

      let q = supabase
        .from("contratos")
        .select(
          `*, rentas(folio, numero_oficial, clientes(nombre), vehiculos(codigo, marca, modelo))`,
          { count: "exact" },
        )
        .order("created_at", { ascending: false });

      if (search) {
        const pattern = JSON.stringify(`%${search}%`);
        q = q.or(`numero.ilike.${pattern},form_data->>facturaNum.ilike.${pattern}`);
      }
      if (filterTipo !== "todos") q = q.eq("tipo", filterTipo);

      const from = page * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, count, error } = await q;
      if (error) throw error;
      return { data: (data ?? []) as ContratoRow[], count: count ?? 0 };
    },
  });

  // ── Query: rentas disponibles para vincular ────────────────────────────────
  const { data: rentasData, isLoading: rentasLoading } = useQuery({
    queryKey: ["rentas-para-vincular", rentaSearch],
    queryFn: async () => {
      let q = supabase
        .from("rentas")
        .select("id, folio, fecha_inicio, fecha_devolucion, estado, clientes(nombre), vehiculos(codigo, marca, modelo, placa)")
        .is("deleted_at", null)
        .order("fecha_inicio", { ascending: false })
        .limit(50);

      if (rentaSearch) {
        q = q.or(`folio.ilike.%${rentaSearch}%`);
      }

      const { data } = await q;
      return (data ?? []) as RentaOption[];
    },
    enabled: !!linkModalDoc, // solo carga cuando el modal está abierto
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contratos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historial"] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Documento eliminado");
      setConfirmDelete(null);
    },
    onError: (error: Error) => toast.error(error.message.includes("foreign key") ? "No se puede eliminar una factura con pagos registrados. Anulá primero sus pagos." : "No se pudo eliminar el documento"),
  });

  const vincularM = useMutation({
    mutationFn: async ({ docId, rentaId }: { docId: string; rentaId: string | null }) => {
      const { error } = await supabase
        .from("contratos")
        .update({ renta_id: rentaId })
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: (_, { rentaId }) => {
      queryClient.invalidateQueries({ queryKey: ["historial"] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success(rentaId ? "Documento vinculado a la renta" : "Vínculo eliminado");
      setLinkModalDoc(null);
      setRentaSearch("");
    },
    onError: () => toast.error("No se pudo actualizar el vínculo"),
  });

  // ── Reimprimir (contratos) ─────────────────────────────────────────────────
  const handleReprint = async (c: ContratoRow, download = false) => {
    if (!c.form_data) {
      toast.error("No hay datos guardados para reimprimir. Guardá un nuevo documento primero.");
      return;
    }
    setReprinting(c.id);
    try {
      const fechaDocClean = c.form_data.fechaDoc
        ? String(c.form_data.fechaDoc).slice(0, 10)
        : (c.fecha ? c.fecha.slice(0, 10) : undefined);
      const doc = await generatePDF({
        ...c.form_data,
        fechaDoc: fechaDocClean,
        docType: c.tipo,
      } as never);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${c.numero}.pdf`;
        a.click();
      } else {
        setPrintPreviewUrl(url);
      }
    } catch (e) {
      console.error("Reprint error:", e);
      toast.error("No se pudo reimprimir el documento");
    } finally {
      setReprinting(null);
    }
  };

  // ── Descargar PDF de Nota de Débito ──────────────────────────────────────
  const handlePrintND = async (row: NotaDebitoHistorialRow, download = false) => {
    try {
      const { data: items } = await supabase
        .from("nota_debito_detalle")
        .select("*")
        .eq("nota_debito_id", row.id);

      const fullData: NotaDebitoFormData = {
        id: row.id,
        numero: row.numero,
        fecha: row.created_at,
        cliente_id: row.cliente_id || "",
        cliente_nombre: row.cliente?.nombre || "—",
        cliente_ruc: row.cliente?.documento || "",
        condicion_pago: "Contado",
        renta_id: row.renta_id || "",
        descripcion_general: row.descripcion_general || "",
        observaciones: "",
        moneda: "NIO",
        estado: row.estado as NotaDebitoEstado,
        items: (items ?? []).map((it) => ({
          codigo: it.codigo || "",
          descripcion: it.descripcion,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          subtotal: Number(it.subtotal),
        })),
        subtotal: Number(row.subtotal ?? 0),
        iva: Number(row.iva ?? 0),
        total: Number(row.total ?? 0),
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
        setPrintPreviewUrl(url);
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "No se pudo generar el PDF de la Nota de Débito");
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));

  // Filtrar rentas por búsqueda local de nombre de cliente también
  const rentasFiltradas = (rentasData ?? []).filter((r) => {
    if (!rentaSearch) return true;
    const q = rentaSearch.toLowerCase();
    return (
      r.folio.toLowerCase().includes(q) ||
      (r.clientes?.nombre ?? "").toLowerCase().includes(q)
    );
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <History className="size-6 text-gold" /> Historial de Documentos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos los documentos generados y guardados en el sistema.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de documento..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 pl-9"
          />
        </div>
        <Select
          value={filterTipo}
          onValueChange={(v) => { setFilterTipo(v); setPage(0); }}
        >
          <SelectTrigger className="h-9 w-full sm:w-44">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="proforma">Proforma</SelectItem>
            <SelectItem value="confirmacion">Confirmación</SelectItem>
            <SelectItem value="factura">Factura</SelectItem>
            <SelectItem value="contrato">Contrato</SelectItem>
            <SelectItem value="nota_debito">Nota Débito</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold text-muted-foreground">N.º Documento</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Cliente</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Renta</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Fecha</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-destructive">
                    Error: {(histError as Error)?.message}
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No se encontraron documentos
                  </td>
                </tr>
              ) : (
                data?.data.map((doc) => {
                  if ("tipo" in doc) {
                    const c = doc as ContratoRow;
                    const esConceptos = c.tipo === "factura" && c.form_data?.facturaModo === "conceptos";
                    const numeroVisible = c.tipo === "factura" && c.form_data?.facturaNum
                      ? String(c.form_data.facturaNum)
                      : c.numero;
                    return (
                      <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{numeroVisible}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.form_data && typeof c.form_data === "object" && "cliente" in c.form_data
                            ? String(c.form_data.cliente)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={tipoColor[c.tipo] ?? ""}>
                            {esConceptos ? "Factura por conceptos" : tipoLabel[c.tipo] ?? c.tipo}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {c.rentas ? (
                            <div className="flex items-center gap-1.5">
                              <Car className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium text-foreground text-xs">{c.rentas.numero_oficial || c.rentas.folio}</span>
                              {c.rentas.clientes?.nombre && (
                                <span className="text-muted-foreground text-xs truncate max-w-[100px]">
                                  · {c.rentas.clientes.nombre}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {formatDate(c.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Descargar"
                              disabled={reprinting === c.id}
                              onClick={() => {
                                if (c.pdf_url) {
                                  const a = document.createElement("a");
                                  a.href = c.pdf_url;
                                  a.download = `${c.numero}.pdf`;
                                  a.click();
                                  return;
                                }
                                handleReprint(c, true);
                              }}
                            >
                              <Download className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Editar"
                              onClick={() => navigate({ to: "/documentos", search: { editId: c.id, rentaId: undefined } })}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Reimprimir"
                              disabled={reprinting === c.id}
                              onClick={() => handleReprint(c)}
                            >
                              <Printer className="size-4" />
                            </Button>
                            {esConceptos && <Button variant="ghost" size="icon" className="size-8 text-emerald-600"
                              title="Registrar y consultar pagos" aria-label={`Registrar pagos de factura ${numeroVisible}`}
                              onClick={() => setPayModalDoc(c)}><CreditCard className="size-4" /></Button>}
                            {!esConceptos && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`size-8 ${c.renta_id ? "text-primary" : "text-muted-foreground"}`}
                                title={c.renta_id ? "Cambiar / Desvincular renta" : "Vincular a Renta"}
                                onClick={() => { setLinkModalDoc(c); setRentaSearch(""); }}
                              >
                                <Link2 className="size-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              title="Eliminar"
                              onClick={() => setConfirmDelete(c.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  const nd = doc as NotaDebitoHistorialRow;
                  return (
                    <tr key={nd.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{nd.numero}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {nd.cliente?.nombre ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={tipoColor.nota_debito}>
                          {tipoLabel.nota_debito}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {nd.renta_id ? (
                          <span className="text-xs text-muted-foreground">Vinculado</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {formatDate(nd.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="Descargar"
                            onClick={() => handlePrintND(nd, true)}
                          >
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
        </div>
      ) : null}

      {/* ── Modal: Vincular a Renta ──────────────────────────────────────────── */}
      <Dialog
        open={!!linkModalDoc}
        onOpenChange={(o) => { if (!o) { setLinkModalDoc(null); setRentaSearch(""); } }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="size-4 text-primary" />
              Vincular documento a una Renta
            </DialogTitle>
            {linkModalDoc && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Documento: <span className="font-medium text-foreground">{linkModalDoc.numero}</span>
                {linkModalDoc.rentas && (
                  <> · Vinculado actualmente a <span className="font-medium text-primary">{linkModalDoc.rentas.folio}</span></>
                )}
              </p>
            )}
          </DialogHeader>

          <div className="px-5 py-3 border-b border-border">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio o nombre de cliente..."
                value={rentaSearch}
                onChange={(e) => setRentaSearch(e.target.value)}
                className="h-9 pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="min-h-0 min-w-0 overflow-auto flex-1">
            {rentasLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Cargando rentas...</div>
            ) : rentasFiltradas.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No se encontraron rentas</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted/80 backdrop-blur text-left">
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-xs">Folio</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-xs">Cliente</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-xs hidden sm:table-cell">Vehículo</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-xs hidden sm:table-cell">Fechas</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-xs">Estado</th>
                    <th className="px-4 py-2.5 text-xs"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rentasFiltradas.map((r) => {
                    const isCurrentlyLinked = linkModalDoc?.renta_id === r.id;
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-muted/40 transition-colors ${isCurrentlyLinked ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-4 py-2.5 font-medium">
                          {r.folio}
                          {isCurrentlyLinked && (
                            <span className="ml-1.5 text-[10px] text-primary font-semibold">● actual</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{r.clientes?.nombre ?? "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                          {r.vehiculos ? `${r.vehiculos.marca} ${r.vehiculos.modelo}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell text-xs">
                          {formatDate(r.fecha_inicio)} → {formatDate(r.fecha_devolucion)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className={`text-[10px] ${estadoColor[r.estado] ?? ""}`}>
                            {r.estado}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            size="sm"
                            variant={isCurrentlyLinked ? "outline" : "default"}
                            className="h-7 text-xs"
                            disabled={vincularM.isPending}
                            onClick={() =>
                              vincularM.mutate({ docId: linkModalDoc!.id, rentaId: r.id })
                            }
                          >
                            {isCurrentlyLinked ? "Seleccionada" : "Vincular"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer con opción de desvincular */}
          {linkModalDoc?.renta_id && (
            <div className="px-4 sm:px-5 py-3 border-t border-border flex flex-wrap gap-2 items-center justify-between bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Vinculado a <span className="font-medium text-foreground">{linkModalDoc.rentas?.folio}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive gap-1.5"
                disabled={vincularM.isPending}
                onClick={() => vincularM.mutate({ docId: linkModalDoc.id, rentaId: null })}
              >
                <Unlink className="size-3.5" />
                Desvincular
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: vista previa impresión */}
      <Dialog open={!!printPreviewUrl} onOpenChange={(o) => { if (!o) { setPrintPreviewUrl(null); URL.revokeObjectURL(printPreviewUrl ?? ""); } }}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col gap-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Vista previa del documento</span>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => iframeRef.current?.contentWindow?.print()}
                className="gap-2"
              >
                <Printer className="size-4" /> Imprimir
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => { setPrintPreviewUrl(null); URL.revokeObjectURL(printPreviewUrl ?? ""); }}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
          <iframe
            ref={iframeRef}
            src={printPreviewUrl ?? ""}
            className="flex-1 w-full bg-muted/50"
            title="Vista previa para imprimir"
          />
        </DialogContent>
      </Dialog>

      {/* AlertDialog: confirmar eliminación */}
      <Dialog open={!!payModalDoc} onOpenChange={(open) => { if (!open) setPayModalDoc(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ingresos de factura por conceptos</DialogTitle></DialogHeader>
          {payModalDoc?.form_data && <FacturaConceptosPayments id={payModalDoc.id}
            numero={String(payModalDoc.form_data.facturaNum ?? payModalDoc.numero)} formData={payModalDoc.form_data} />}
        </DialogContent>
      </Dialog>

      {/* AlertDialog: confirmar eliminación */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. El documento se eliminará de la base de datos.
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

export const Route = createFileRoute("/_authenticated/historial")({
  head: () => ({ meta: [{ title: "Historial — TM RENT A CAR" }] }),
  component: Page,
});
