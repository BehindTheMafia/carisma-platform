import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, Save, Send, Eye, Printer, Download, Copy, Ban, Loader2, ArrowLeft, SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { type NotaDebitoFormData, type NotaDebitoItem, type NotaDebitoEstado } from "@/types/notas-debito";
import { generateNotaDebitoPDF } from "@/utils/pdfGeneratorNotaDebito";
import { getNotaDebitoCalibrationOffsets } from "@/utils/calibrationNotaDebitoStorage";

interface CustomerOption {
  id: string;
  nombre: string;
  documento?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
}

interface RentaOption {
  id: string;
  codigo?: string | null;
  vehiculo?: { marca?: string; modelo?: string; placa?: string } | null;
}

interface FacturaOption {
  id: string;
  numero: string;
  tipo: string;
}

const DEFAULT_ITEM: NotaDebitoItem = {
  codigo: "",
  descripcion: "",
  cantidad: 0,
  precio_unitario: 0,
  subtotal: 0,
};

export function NotaDebitoForm({
  editId,
  initialRentaId,
  initialClienteId,
  onBack,
  onSaved,
  onOpenCalibration,
}: {
  editId?: string;
  initialRentaId?: string;
  initialClienteId?: string;
  onBack?: () => void;
  onSaved?: (id: string) => void;
  onOpenCalibration?: () => void;
}) {
  const queryClient = useQueryClient();

  // Form State
  const [formData, setFormData] = useState<NotaDebitoFormData>({
    fecha: new Date().toISOString().slice(0, 10),
    cliente_id: initialClienteId || "",
    cliente_nombre: "",
    cliente_ruc: "",
    cliente_direccion: "",
    cliente_ciudad: "",
    cliente_giro: "",
    condicion_pago: "",
    renta_id: initialRentaId || "",
    factura_id: "",
    moneda: "NIO",
    descripcion_general: "",
    observaciones: "",
    estado: "borrador",
    items: Array.from({ length: 7 }, () => ({ ...DEFAULT_ITEM })),
    subtotal: 0,
    iva: 0,
    total: 0,
  });

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [confirmAnular, setConfirmAnular] = useState(false);

  // Cargar Clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nombre, documento, direccion, ciudad")
        .is("deleted_at", null)
        .order("nombre");
      return (data ?? []) as unknown as CustomerOption[];
    },
  });

  // Cargar Rentas
  const { data: rentas = [] } = useQuery({
    queryKey: ["rentas-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rentas")
        .select("id, codigo, vehiculo:vehiculos(marca, modelo, placa)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as RentaOption[];
    },
  });

  // Cargar Facturas / Documentos
  const { data: facturas = [] } = useQuery({
    queryKey: ["facturas-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos")
        .select("id, numero, tipo")
        .order("created_at", { ascending: false });
      return (data ?? []) as FacturaOption[];
    },
  });

  // Cargar Nota de Débito existente si es editId
  const { isLoading: loadingDoc } = useQuery({
    queryKey: ["nota-debito", editId],
    enabled: !!editId,
    queryFn: async () => {
      const { data: nd, error: ndErr } = await supabase
        .from("notas_debito")
        .select("*, cliente:clientes(*)")
        .eq("id", editId!)
        .single();

      if (ndErr) throw ndErr;

      const { data: items } = await supabase
        .from("nota_debito_detalle")
        .select("*")
        .eq("nota_debito_id", editId!);

      const loadedItems: NotaDebitoItem[] = (items ?? []).map((it) => ({
        id: it.id,
        codigo: it.codigo || "",
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario),
        subtotal: Number(it.subtotal),
      }));

      setFormData({
        id: nd.id,
        numero: nd.numero,
        fecha: nd.fecha,
        cliente_id: nd.cliente_id || "",
        cliente_nombre: nd.cliente?.nombre || "",
        cliente_ruc: (nd.cliente as any)?.documento || "",
        cliente_direccion: nd.cliente?.direccion || "",
        cliente_ciudad: nd.cliente?.ciudad || "",
        cliente_giro: "",
        condicion_pago: nd.condicion_pago || "",
        renta_id: nd.renta_id || "",
        factura_id: nd.factura_id || "",
        descripcion_general: nd.descripcion_general || "",
        observaciones: nd.observaciones || "",
        moneda: (nd as any).moneda || "NIO",
        estado: nd.estado as NotaDebitoEstado,
        items: loadedItems.length > 0 ? loadedItems : [{ ...DEFAULT_ITEM }],
        subtotal: Number(nd.subtotal),
        iva: Number(nd.iva),
        total: Number(nd.total),
      });

      return nd;
    },
  });

  // Recalcular Totales
  useEffect(() => {
    const subtotal = formData.items.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
    const iva = 0;
    const total = subtotal;
    setFormData((prev) => ({ ...prev, subtotal, iva, total }));
  }, [formData.items]);

  // Manejo de cambio de cliente
  const handleSelectCliente = (clienteId: string) => {
    const c = clientes.find((item) => item.id === clienteId);
    if (c) {
      setFormData((prev) => ({
        ...prev,
        cliente_id: c.id,
        cliente_nombre: c.nombre,
        cliente_ruc: c.documento || "",
        cliente_direccion: c.direccion || "",
        cliente_ciudad: c.ciudad || "",
        cliente_giro: "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, cliente_id: clienteId }));
    }
  };

  // Manejo de ítems de la tabla
  const updateItem = (index: number, field: keyof NotaDebitoItem, value: unknown) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const target = { ...newItems[index], [field]: value };

      if (field === "cantidad" || field === "precio_unitario") {
        const qty = Number(field === "cantidad" ? value : target.cantidad) || 0;
        const price = Number(field === "precio_unitario" ? value : target.precio_unitario) || 0;
        target.subtotal = qty * price;
      }

      newItems[index] = target;
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...DEFAULT_ITEM }],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Generar Siguiente Número Correlativo ND-XXXXXX
  const fetchNextNumero = async () => {
    const { data: last } = await supabase
      .from("notas_debito")
      .select("numero")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!last || !last.numero) return "ND-000001";
    const numPart = parseInt(last.numero.replace(/\D/g, ""), 10);
    if (isNaN(numPart)) return "ND-000001";
    return `ND-${String(numPart + 1).padStart(6, "0")}`;
  };

  // Guardar / Emitir Mutation
  const saveMutation = useMutation({
    mutationFn: async (targetEstado?: NotaDebitoEstado) => {
      if (!formData.cliente_id) {
        throw new Error("Seleccioná un cliente para la Nota de Débito.");
      }

      let numeroToSave = formData.numero;
      const estadoToSave = targetEstado || formData.estado;

      if (!numeroToSave || (estadoToSave === "emitida" && numeroToSave.includes("DRAFT"))) {
        numeroToSave = await fetchNextNumero();
      }

      const payload = {
        numero: numeroToSave,
        cliente_id: formData.cliente_id,
        renta_id: formData.renta_id || null,
        factura_id: formData.factura_id || null,
        fecha: formData.fecha,
        condicion_pago: formData.condicion_pago,
        moneda: formData.moneda,
        descripcion_general: formData.descripcion_general,
        subtotal: formData.subtotal,
        iva: formData.iva,
        total: formData.total,
        estado: estadoToSave,
        observaciones: formData.observaciones,
        updated_at: new Date().toISOString(),
      };

      let ndId = formData.id;

      if (ndId) {
        const { error } = await supabase.from("notas_debito").update(payload).eq("id", ndId);
        if (error) throw error;
        await supabase.from("nota_debito_detalle").delete().eq("nota_debito_id", ndId);
      } else {
        const { data: newNd, error } = await supabase
          .from("notas_debito")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select("id")
          .single();
        if (error) throw error;
        ndId = newNd.id;
      }

      const itemsPayload = formData.items.map((it) => ({
        nota_debito_id: ndId,
        codigo: it.codigo || null,
        descripcion: it.descripcion || "Item sin descripción",
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        subtotal: it.subtotal,
      }));

      const { error: itemsErr } = await supabase.from("nota_debito_detalle").insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      return { id: ndId, numero: numeroToSave, estado: estadoToSave };
    },
    onSuccess: (res) => {
      toast.success(res.estado === "emitida" ? "Nota de Débito emitida con éxito" : "Guardado en borrador");
      queryClient.invalidateQueries({ queryKey: ["notas-debito"] });
      queryClient.invalidateQueries({ queryKey: ["reportes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["historial"] });
      if (onSaved) onSaved(res.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Generar PDF para Vista Previa / Descarga
  const handleGeneratePdf = async (download = false) => {
    setGeneratingPdf(true);
    try {
      const offsets = getNotaDebitoCalibrationOffsets();
      const doc = await generateNotaDebitoPDF(formData, offsets);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);

      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${formData.numero || "ND-BORRADOR"}.pdf`;
        a.click();
      } else {
        setPdfPreviewUrl(url);
      }
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error(err instanceof Error ? err.message : "No se pudo generar el PDF de la Nota de Débito");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Duplicar Nota de Débito
  const handleDuplicate = () => {
    setFormData((prev) => ({
      ...prev,
      id: undefined,
      numero: undefined,
      estado: "borrador",
      fecha: new Date().toISOString().slice(0, 10),
    }));
    toast.info("Nota de Débito duplicada. Modificá los datos y guardala.");
  };

  // Anular Nota de Débito
  const handleAnular = async () => {
    if (!formData.id) return;
    try {
      const { error } = await supabase
        .from("notas_debito")
        .update({ estado: "anulada" })
        .eq("id", formData.id);
      if (error) throw error;

      setFormData((prev) => ({ ...prev, estado: "anulada" }));
      toast.success("Nota de Débito anulada");
      queryClient.invalidateQueries({ queryKey: ["notas-debito"] });
      queryClient.invalidateQueries({ queryKey: ["reportes"] });
      setConfirmAnular(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loadingDoc) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAnulada = formData.estado === "anulada";
  const isEmitida = formData.estado === "emitida";

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                {formData.id ? `Nota de Débito ${formData.numero || ""}` : "Nueva Nota de Débito"}
              </h2>
              <Badge
                variant="outline"
                className={
                  isAnulada
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                    : isEmitida
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                }
              >
                {formData.estado.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generación de nota de débito para ajustes o cobros adicionales (Half Letter Horizontal).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCalibration && (
            <Button variant="outline" size="sm" onClick={onOpenCalibration} className="gap-1.5">
              <SlidersHorizontal className="size-3.5" /> Calibrar PDF
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={generatingPdf}
            onClick={() => handleGeneratePdf(false)}
            className="gap-1.5"
          >
            <Eye className="size-3.5" /> Vista previa
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={generatingPdf}
            onClick={() => handleGeneratePdf(true)}
            className="gap-1.5"
          >
            <Download className="size-3.5" /> Descargar PDF
          </Button>
          {formData.id && (
            <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-1.5">
              <Copy className="size-3.5" /> Duplicar
            </Button>
          )}
          {!isAnulada && (
            <Button
              variant="outline"
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate("borrador")}
              className="gap-1.5"
            >
              <Save className="size-3.5" /> Guardar Borrador
            </Button>
          )}
          {!isAnulada && (
            <Button
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate("emitida")}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="size-3.5" /> Guardar
            </Button>
          )}
          {isEmitida && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmAnular(true)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <Ban className="size-3.5 mr-1" /> Anular
            </Button>
          )}
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Cliente *</Label>
          <Select value={formData.cliente_id} onValueChange={handleSelectCliente} disabled={isAnulada}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre} {c.documento ? `(${c.documento})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">RUC / Cédula</Label>
          <Input
            value={formData.cliente_ruc}
            onChange={(e) => setFormData((p) => ({ ...p, cliente_ruc: e.target.value }))}
            disabled={isAnulada}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">N° Nota de Débito</Label>
          <Input
            value={formData.numero || ""}
            onChange={(e) => setFormData((p) => ({ ...p, numero: e.target.value }))}
            disabled={isAnulada}
            placeholder="ND-000001"
            className="h-9 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Fecha</Label>
          <Input
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData((p) => ({ ...p, fecha: e.target.value }))}
            disabled={isAnulada}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Dirección</Label>
          <Input
            value={formData.cliente_direccion}
            onChange={(e) => setFormData((p) => ({ ...p, cliente_direccion: e.target.value }))}
            disabled={isAnulada}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Ciudad / Giro</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Ciudad"
              value={formData.cliente_ciudad}
              onChange={(e) => setFormData((p) => ({ ...p, cliente_ciudad: e.target.value }))}
              disabled={isAnulada}
              className="h-9"
            />
            <Input
              placeholder="Giro"
              value={formData.cliente_giro}
              onChange={(e) => setFormData((p) => ({ ...p, cliente_giro: e.target.value }))}
              disabled={isAnulada}
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Condición de Pago</Label>
          <Select
            value={formData.condicion_pago}
            onValueChange={(v) => setFormData((p) => ({ ...p, condicion_pago: v }))}
            disabled={isAnulada}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Condición" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Ninguna</SelectItem>
              <SelectItem value="Contado">Contado</SelectItem>
              <SelectItem value="Crédito 15 días">Crédito 15 días</SelectItem>
              <SelectItem value="Crédito 30 días">Crédito 30 días</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Moneda</Label>
          <Select
            value={formData.moneda}
            onValueChange={(v) => setFormData((p) => ({ ...p, moneda: v as "NIO" | "USD" }))}
            disabled={isAnulada}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NIO">C$ Córdoba</SelectItem>
              <SelectItem value="USD">$ Dólar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Renta Relacionada (Opcional)</Label>
          <Select
            value={formData.renta_id || "none"}
            onValueChange={(v) => setFormData((p) => ({ ...p, renta_id: v === "none" ? "" : v }))}
            disabled={isAnulada}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sin renta vinculada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin renta vinculada</SelectItem>
              {rentas.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.codigo || `Renta ${r.id.slice(0, 8)}`} {r.vehiculo ? `(${r.vehiculo.marca} ${r.vehiculo.modelo})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Factura Relacionada (Opcional)</Label>
          <Select
            value={formData.factura_id || "none"}
            onValueChange={(v) => setFormData((p) => ({ ...p, factura_id: v === "none" ? "" : v }))}
            disabled={isAnulada}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sin factura vinculada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin factura vinculada</SelectItem>
              {facturas.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.numero} ({f.tipo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-3">
          <Label className="text-xs font-semibold">Motivo / Descripción General</Label>
          <Textarea
            placeholder="Ej. Cobro adicional por combustible, días extra, repuestos o penalidad"
            value={formData.descripcion_general}
            onChange={(e) => setFormData((p) => ({ ...p, descripcion_general: e.target.value }))}
            disabled={isAnulada}
            rows={2}
            className="text-xs resize-none"
          />
        </div>
      </div>

      {/* Editable Table Items */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">Detalle de Cobros y Ajustes</h3>
          {!isAnulada && (
            <Button variant="outline" size="sm" onClick={addItem} className="h-8 gap-1 text-xs">
              <Plus className="size-3.5" /> Agregar Línea
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-semibold w-28">Código</th>
                <th className="px-3 py-2 font-semibold">Descripción *</th>
                <th className="px-3 py-2 font-semibold w-24 text-center">Cantidad</th>
                <th className="px-3 py-2 font-semibold w-32 text-right">Precio Unit.</th>
                <th className="px-3 py-2 font-semibold w-32 text-right">Subtotal</th>
                {!isAnulada && <th className="px-3 py-2 font-semibold w-12 text-center"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {formData.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/20">
                  <td className="p-2">
                    <Input
                      value={item.codigo}
                      onChange={(e) => updateItem(idx, "codigo", e.target.value)}
                      disabled={isAnulada}
                      placeholder="CÓD"
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={item.descripcion}
                      onChange={(e) => updateItem(idx, "descripcion", e.target.value)}
                      disabled={isAnulada}
                      placeholder="Ej. Combustible faltante 1/4 de tanque"
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.cantidad}
                      onChange={(e) => updateItem(idx, "cantidad", e.target.value)}
                      disabled={isAnulada}
                      className="h-8 text-xs text-center font-mono"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.precio_unitario}
                      onChange={(e) => updateItem(idx, "precio_unitario", e.target.value)}
                      disabled={isAnulada}
                      className="h-8 text-xs text-right font-mono"
                    />
                  </td>
                  <td className="p-2 text-right font-mono font-semibold">
                    {formData.moneda === "USD" ? "$" : "C$"}{(item.subtotal || 0).toFixed(2)}
                  </td>
                  {!isAnulada && (
                    <td className="p-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(idx)}
                        disabled={formData.items.length <= 1}
                        className="size-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="p-4 border-t bg-muted/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 w-full max-w-md space-y-1">
            <Label className="text-xs font-semibold">Observaciones</Label>
            <Textarea
              placeholder="Notas internas o aclaraciones del cobro..."
              value={formData.observaciones}
              onChange={(e) => setFormData((p) => ({ ...p, observaciones: e.target.value }))}
              disabled={isAnulada}
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <div className="w-full sm:w-64 space-y-2 rounded-lg border bg-card p-3 font-mono text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span>{formData.moneda === "USD" ? "$" : "C$"}{formData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 font-bold text-sm text-foreground">
              <span>TOTAL:</span>
              <span className="text-gold">{formData.moneda === "USD" ? "$" : "C$"}{formData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Dialog */}
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
            <DialogTitle className="text-sm font-semibold">Vista Previa — Nota de Débito</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const iframe = document.getElementById("nd-pdf-iframe") as HTMLIFrameElement;
                  iframe?.contentWindow?.print();
                }}
                className="gap-1.5 text-xs"
              >
                <Printer className="size-3.5" /> Imprimir
              </Button>
            </div>
          </DialogHeader>
          <iframe
            id="nd-pdf-iframe"
            src={pdfPreviewUrl || ""}
            className="flex-1 w-full bg-slate-100 dark:bg-slate-900"
            title="Vista previa Nota de Débito"
          />
        </DialogContent>
      </Dialog>

      {/* AlertDialog para Anular */}
      <AlertDialog open={confirmAnular} onOpenChange={setConfirmAnular}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular esta Nota de Débito?</AlertDialogTitle>
            <AlertDialogDescription>
              La Nota de Débito pasará a estado "anulada" y ya no sumará en los reportes de ingresos. Esta acción no borra el registro pero desactiva su validez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAnular} className="bg-rose-600 hover:bg-rose-700 text-white">
              Anular Documento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
