import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { formatCurrency, formatDateTime, convertCurrency } from "@/lib/format";
import { desglosarCobros } from "@/lib/contabilidad-rentas";
import { calcularResumenFinanciero, validarMontoPago } from "@/lib/finanzas";
import { logRentaEvent } from "@/lib/renta-log";
import { toast } from "sonner";

type Pago = {
  id: string;
  monto: number;
  metodo: string;
  estado: string;
  referencia: string | null;
  fecha: string;
  deleted_at: string | null;
  moneda: "NIO" | "USD";
  renta_id: string;
};

export function RentaDetailTabPayments({
  rentaId,
  total,
  deposito,
  moneda,
  vehiculo,
  dias,
  tarifaSubarriendo,
}: {
  rentaId: string;
  total: number;
  deposito: number;
  moneda: "NIO" | "USD";
  vehiculo?: { clasificacion?: string; costo_subarriendo?: number };
  dias?: number;
  tarifaSubarriendo?: number;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [referencia, setReferencia] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["pagos-renta", rentaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pagos")
        .select("*")
        .eq("renta_id", rentaId)
        .is("deleted_at", null)
        .order("fecha", { ascending: false });
      return (data ?? []) as Pago[];
    },
  });

  const resumen = calcularResumenFinanciero(payments, total, deposito);
  const { data: tipoCambio = 36.5 } = useQuery({
    queryKey: ["tipo-cambio-pagos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracion_empresa").select("tipo_cambio").limit(1).maybeSingle();
      if (error) throw error;
      return Number(data?.tipo_cambio ?? 36.5);
    },
  });
  const desglose = desglosarCobros(payments, [{ id: rentaId, total, deposito, moneda,
    dias, tarifa_subarriendo: tarifaSubarriendo, vehiculos: vehiculo }], tipoCambio);
  const desgloseMap = new Map(desglose.map(p => [p.id, p]));
  const ingresoRenta = desglose.reduce((s, p) => s + convertCurrency(p.ingreso, p.moneda, moneda, tipoCambio), 0);
  const garantiaRecibida = desglose.reduce((s, p) => s + convertCurrency(p.garantia, p.moneda, moneda, tipoCambio), 0);

  const addPayment = useMutation({
    mutationFn: async () => {
      const montoNum = Number(monto);
      const errorMsg = validarMontoPago(montoNum, resumen.saldoPendiente);
      if (errorMsg) throw new Error(errorMsg);

      const fechaPayload = fecha
        ? new Date(`${fecha}T12:00:00Z`).toISOString()
        : new Date().toISOString();

      const { error } = await (supabase as any).from("pagos").insert({
        renta_id: rentaId,
        monto: montoNum,
        metodo,
        estado: "pagado",
        moneda,
        referencia: referencia || null,
        fecha: fechaPayload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pago registrado");
      setShowForm(false);
      setMonto("");
      setReferencia("");
      setFecha(new Date().toISOString().slice(0, 10));
      logRentaEvent(rentaId, "pago_registrado", `Monto: ${monto}, Método: ${metodo}`);
      queryClient.invalidateQueries({ queryKey: ["pagos-renta", rentaId] });
      queryClient.invalidateQueries({ queryKey: ["renta-detail", rentaId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["rentas-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pagos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pagos-renta", rentaId] });
      queryClient.invalidateQueries({ queryKey: ["renta-detail", rentaId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["rentas-list"] });
      toast.success("Pago eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total a recibir (renta + garantía)</span>
          <span className="font-semibold">{formatCurrency(resumen.totalRequerido, moneda)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pagado</span>
          <span className="font-semibold text-emerald-600">
            {formatCurrency(resumen.totalPagado, moneda)}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className="bg-gold h-2.5 rounded-full transition-all"
            style={{ width: `${resumen.progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pendiente</span>
          <span
            className={`font-semibold ${resumen.saldoPendiente > 0 ? "text-rose-600" : "text-emerald-600"}`}
          >
            {resumen.saldoPendiente > 0
              ? formatCurrency(resumen.saldoPendiente, moneda)
              : "Cancelado"}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Estado financiero</span>
          <Badge
            variant="outline"
            className={
              resumen.estado === "pagado"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                : resumen.estado === "parcial"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
            }
          >
            {resumen.estado === "pagado" ? "Pagada" : resumen.estado === "parcial" ? "Pago parcial" : "Sin pagar"}
          </Badge>
        </div>
        {Number(deposito) > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
            <span>Garantía recibida · reembolsable, fuera de ingresos</span>
            <span>{formatCurrency(garantiaRecibida, moneda)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs border-t pt-2">
          <span>Ingreso por renta (sin garantía)</span>
          <span className="font-semibold">{formatCurrency(ingresoRenta, moneda)}</span>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Historial de pagos
          </p>
          {payments.map((p) => {
            const detalle = desgloseMap.get(p.id);
            const costoPago = convertCurrency(detalle?.costoProveedorUSD ?? 0, "USD", moneda, tipoCambio);
            const split = detalle?.esSubrenta ? { costoSubarriendo: costoPago,
              utilidad: convertCurrency(detalle.ingreso, detalle.moneda, moneda, tipoCambio) - costoPago } : null;
            return (
              <div key={p.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatCurrency(Number(p.monto), moneda)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(p.fecha)} · {p.metodo}
                      {p.referencia && ` · Ref: ${p.referencia}`}
                    </p>
                    {(detalle?.garantia ?? 0) > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Incluye {formatCurrency(detalle!.garantia, p.moneda)} de garantía reembolsable; fuera de ingresos.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deletePayment.mutate(p.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                {split && (
                  <div className="mt-2 flex items-center gap-3 text-[11px] border-t pt-2 text-muted-foreground">
                    <span>
                      Costo subrenta: <span className="font-medium text-amber-600">{formatCurrency(split.costoSubarriendo, moneda)}</span>
                    </span>
                    <span className="text-muted-foreground/50">|</span>
                    <span>
                      Utilidad: <span className="font-medium text-emerald-600">{formatCurrency(split.utilidad, moneda)}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resumen.saldoPendiente <= 0 && !showForm ? (
        <p className="text-xs text-center text-emerald-600 font-medium py-2">
          Esta renta ya se encuentra completamente pagada.
        </p>
      ) : showForm ? (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Monto
                <span className="text-xs text-muted-foreground ml-1">
                  (máx. {formatCurrency(resumen.saldoPendiente, moneda)})
                </span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                max={resumen.saldoPendiente}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fecha de pago</label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Método</label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Referencia</label>
              <Input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="N° transacción"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => addPayment.mutate()}
              disabled={!monto || addPayment.isPending}
            >
              {addPayment.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : null}
              Guardar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="size-3.5 mr-1.5" />
          Agregar Pago
        </Button>
      )}
    </div>
  );
}
