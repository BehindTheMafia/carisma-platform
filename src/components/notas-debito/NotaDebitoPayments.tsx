import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateTime, type Moneda } from "@/lib/format";
import { toast } from "sonner";
import type { NotaDebitoRow } from "@/types/notas-debito";

type Pago = { id: string; monto: number; fecha: string; metodo: string; referencia: string | null };

export function NotaDebitoPayments({ nota }: { nota: NotaDebitoRow }) {
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [referencia, setReferencia] = useState("");
  const [fecha, setFecha] = useState(() => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Managua", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value;
    return `${value("year")}-${value("month")}-${value("day")}`;
  });
  const [showForm, setShowForm] = useState(false);
  const moneda = nota.moneda as Moneda;
  const total = Number(nota.total);
  const { data: pagos = [], isLoading } = useQuery({
    queryKey: ["pagos-nota-debito", nota.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagos").select("id,monto,fecha,metodo,referencia")
        .eq("nota_debito_id", nota.id).eq("estado", "pagado").is("deleted_at", null)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data as Pago[];
    },
  });
  const pagado = Math.round(pagos.reduce((sum, p) => sum + Number(p.monto), 0) * 100) / 100;
  const saldo = Math.max(0, Math.round((total - pagado) * 100) / 100);
  const estado = total > 0 && saldo <= 0 ? "Pagada" : pagado > 0 ? "Pago parcial" : "Sin pagar";
  const invalidate = () => {
    for (const key of [["pagos-nota-debito", nota.id], ["pagos-notas-list"], ["pagos"], ["notas-debito"], ["reportes-summary-v2"], ["movements-table"]]) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };
  const add = useMutation({
    mutationFn: async () => {
      const value = Number(monto);
      if (!Number.isFinite(value) || value <= 0 || value > saldo + 0.005 || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        throw new Error("Ingresá un monto válido que no supere el saldo y una fecha de pago.");
      }
      const { error } = await supabase.from("pagos").insert({
        nota_debito_id: nota.id, monto: value, moneda, metodo: metodo as "efectivo" | "transferencia" | "tarjeta",
        estado: "pagado", fecha: `${fecha}T12:00:00Z`, referencia: referencia.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMonto(""); setReferencia(""); setShowForm(false); invalidate();
      toast.success("Abono registrado");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pagos").update({ deleted_at: new Date().toISOString() })
        .eq("id", id).eq("nota_debito_id", nota.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Abono anulado"); },
    onError: (error: Error) => toast.error(error.message),
  });

  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Nota {nota.numero} · {nota.cliente?.nombre ?? "Cliente"}</p>
    <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-sm">
      <div><span className="block text-xs text-muted-foreground">Total</span>{formatCurrency(total, moneda)}</div>
      <div><span className="block text-xs text-muted-foreground">Pagado</span>{formatCurrency(pagado, moneda)}</div>
      <div><span className="block text-xs text-muted-foreground">Pendiente</span><strong>{formatCurrency(saldo, moneda)}</strong></div>
    </div>
    <p className="text-sm font-medium">Estado financiero: {estado}</p>
    {isLoading ? <Loader2 className="size-4 animate-spin" /> : pagos.length > 0 && <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Historial de abonos</p>
      {pagos.map((p) => <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
        <div><strong>{formatCurrency(Number(p.monto), moneda)}</strong><p className="text-xs text-muted-foreground">{formatDateTime(p.fecha)} · {p.metodo}{p.referencia ? ` · Ref: ${p.referencia}` : ""}</p></div>
        <Button size="icon" variant="ghost" aria-label="Anular abono" disabled={remove.isPending} onClick={() => remove.mutate(p.id)}><Trash2 className="size-4" /></Button>
      </div>)}
    </div>}
    {nota.estado !== "emitida" ? <p className="text-sm text-muted-foreground">Solo las notas emitidas admiten pagos.</p> : total > 0 && saldo > 0 && (showForm ? <div className="space-y-3 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs">Monto (máx. {formatCurrency(saldo, moneda)})<Input type="number" min="0.01" max={saldo} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
        <label className="text-xs">Fecha del pago<Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <div className="text-xs">Método<Select value={metodo} onValueChange={setMetodo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="efectivo">Efectivo</SelectItem><SelectItem value="transferencia">Transferencia</SelectItem><SelectItem value="tarjeta">Tarjeta</SelectItem></SelectContent></Select></div>
        <label className="text-xs">Referencia / transacción<Input value={referencia} onChange={(e) => setReferencia(e.target.value)} /></label>
      </div>
      <div className="flex gap-2"><Button disabled={add.isPending || !monto || !fecha} onClick={() => add.mutate()}><Plus className="mr-1 size-4" />Guardar abono</Button><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button></div>
    </div> : <Button size="sm" onClick={() => setShowForm(true)}><Plus className="mr-1 size-4" />Registrar pago</Button>)}
  </div>;
}
