import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateTime, convertCurrency, type Moneda } from "@/lib/format";
import { calcularTotalConceptos, saldoFacturaConceptos, type ConceptoFactura } from "@/lib/factura-conceptos";
import { toast } from "sonner";

type Pago = { id: string; monto: number; moneda: Moneda; metodo: string; fecha: string; referencia: string | null };

export function FacturaConceptosPayments({ id, numero, formData }: {
  id: string;
  numero: string;
  formData: Record<string, unknown>;
}) {
  const queryClient = useQueryClient();
  const monedaFactura: Moneda = formData.monedaConceptos === "NIO" ? "NIO" : "USD";
  const tasa = Number(formData.tasa);
  const total = calcularTotalConceptos((formData.conceptosFactura ?? []) as ConceptoFactura[]);
  const [showForm, setShowForm] = useState(false);
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<Moneda>(monedaFactura);
  const [metodo, setMetodo] = useState("efectivo");
  const [referencia, setReferencia] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Managua" }));

  const { data: pagos = [], isLoading } = useQuery({
    queryKey: ["pagos-factura-conceptos", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagos").select("id,monto,moneda,metodo,fecha,referencia")
        .eq("contrato_id", id).eq("estado", "pagado").is("deleted_at", null).order("fecha", { ascending: false });
      if (error) throw error;
      return data as Pago[];
    },
  });
  const { pagado, saldo } = saldoFacturaConceptos(total, monedaFactura, tasa, pagos);
  const maximo = Math.round(convertCurrency(saldo, monedaFactura, moneda, tasa) * 100) / 100;

  const agregar = useMutation({
    mutationFn: async () => {
      const valor = Number(monto);
      if (!Number.isFinite(valor) || valor <= 0 || !Number.isFinite(tasa) || tasa <= 0) {
        throw new Error("Indicá un monto y una tasa de cambio válidos.");
      }
      if (convertCurrency(valor, moneda, monedaFactura, tasa) > saldo + 0.005) {
        throw new Error("El pago supera el saldo pendiente.");
      }
      const { error } = await supabase.from("pagos").insert({
        contrato_id: id, renta_id: null, monto: valor, moneda, metodo: metodo as "efectivo" | "transferencia" | "tarjeta",
        estado: "pagado", fecha: `${fecha}T12:00:00Z`, referencia: referencia.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMonto(""); setReferencia(""); setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["pagos-factura-conceptos", id] });
      queryClient.invalidateQueries({ queryKey: ["pagos"] });
      queryClient.invalidateQueries({ queryKey: ["reportes-summary-v2"] });
      queryClient.invalidateQueries({ queryKey: ["movements-table"] });
      toast.success("Ingreso registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const eliminar = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.from("pagos").update({ deleted_at: new Date().toISOString() }).eq("id", paymentId).eq("contrato_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pagos-factura-conceptos", id] });
      queryClient.invalidateQueries({ queryKey: ["pagos"] });
      queryClient.invalidateQueries({ queryKey: ["reportes-summary-v2"] });
      queryClient.invalidateQueries({ queryKey: ["movements-table"] });
      toast.success("Pago anulado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Factura {numero} · {String(formData.cliente ?? "Cliente")}</p>
    <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-sm">
      <div><span className="block text-xs text-muted-foreground">Total</span>{formatCurrency(total, monedaFactura)}</div>
      <div><span className="block text-xs text-muted-foreground">Pagado</span>{formatCurrency(pagado, monedaFactura)}</div>
      <div><span className="block text-xs text-muted-foreground">Pendiente</span><strong>{formatCurrency(saldo, monedaFactura)}</strong></div>
    </div>
    <p className="text-xs text-muted-foreground">Estado: {saldo <= 0 ? "Pagada" : pagado > 0 ? "Pago parcial" : "Sin pagar"} · Tasa de la factura: {tasa}</p>
    {isLoading ? <Loader2 className="size-4 animate-spin" /> : pagos.length > 0 && <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Historial de abonos</p>
      {pagos.map((p) => <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
        <div><strong>{formatCurrency(Number(p.monto), p.moneda)}</strong><p className="text-xs text-muted-foreground">{formatDateTime(p.fecha)} · {p.metodo}{p.referencia ? ` · Ref: ${p.referencia}` : ""}</p></div>
        <Button size="icon" variant="ghost" aria-label="Anular pago" disabled={eliminar.isPending} onClick={() => eliminar.mutate(p.id)}><Trash2 className="size-4" /></Button>
      </div>)}
    </div>}
    {saldo > 0 && (showForm ? <div className="rounded-lg border p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs">Monto (máx. {formatCurrency(maximo, moneda)})<Input type="number" min="0.01" max={maximo} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
        <label className="text-xs">Fecha del pago<Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <div className="text-xs">Moneda<Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">Dólares (USD)</SelectItem><SelectItem value="NIO">Córdobas (C$)</SelectItem></SelectContent></Select></div>
        <div className="text-xs">Método<Select value={metodo} onValueChange={setMetodo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="efectivo">Efectivo</SelectItem><SelectItem value="transferencia">Transferencia</SelectItem><SelectItem value="tarjeta">Tarjeta</SelectItem></SelectContent></Select></div>
        <label className="text-xs col-span-2">Referencia / número de transacción<Input value={referencia} onChange={(e) => setReferencia(e.target.value)} /></label>
      </div>
      <div className="flex gap-2"><Button disabled={agregar.isPending || !monto || !fecha} onClick={() => agregar.mutate()}>{agregar.isPending && <Loader2 className="size-4 animate-spin mr-1" />}Guardar abono</Button><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button></div>
    </div> : <Button size="sm" onClick={() => setShowForm(true)}><Plus className="size-4 mr-1" />Registrar pago</Button>)}
  </div>;
}
