import { useState, useEffect } from "react";
import { FileSignature, CreditCard, ClipboardCheck, Clock, User, Car, Play, SquareCheckBig, Ban, Loader2, DollarSign, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { RENTA_ESTADO_COLORS, ESTADO_FINANCIERO_COLORS, ESTADO_FINANCIERO_LABELS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { RentaDetailTabDocumentos } from "./RentaDetailTabDocumentos";
import { RentaDetailTabPayments } from "./RentaDetailTabPayments";
import { RentaDetailTabInspections } from "./RentaDetailTabInspections";
import { RentaDetailTabTimeline } from "./RentaDetailTabTimeline";
import { logRentaEvent } from "@/lib/renta-log";
import { verificarNumerosDisponibles } from "@/lib/document-numbering-query";
import { toast } from "sonner";

type RentaRow = {
  id: string;
  folio: string;
  cliente_id: string;
  vehiculo_id: string;
  fecha_inicio: string;
  fecha_devolucion: string;
  dias: number;
  total: number;
  moneda: string;
  estado: string;
  estado_financiero: string;
  deposito: number;
  descuento: number;
  tarifa: number;
  tarifa_subarriendo?: number;
  clientes?: { nombre: string; telefono?: string; correo?: string };
  vehiculos?: { codigo: string; placa: string; marca: string; modelo: string; clasificacion?: string; costo_subarriendo?: number };
  numero_oficial: string | null;
};

export function RentaDetailPanel({
  rentaId,
  onClose,
  initialTab = "documentos",
}: {
  rentaId: string;
  onClose: () => void;
  initialTab?: string;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [confirmFinalizar, setConfirmFinalizar] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState(false);

  const { data: renta, isLoading } = useQuery({
    queryKey: ["renta-detail", rentaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("rentas")
        .select("*, clientes(nombre, telefono, correo), vehiculos(codigo, placa, marca, modelo, clasificacion, costo_subarriendo)")
        .eq("id", rentaId)
        .is("deleted_at", null)
        .single();
      return data as unknown as RentaRow;
    },
  });

  const estadoM = useMutation({
    mutationFn: async ({ nuevoEstado, fechaDevolucionReal }: { nuevoEstado: string; fechaDevolucionReal?: string }) => {
      const payload: Record<string, unknown> = { estado: nuevoEstado };
      if (fechaDevolucionReal) {
        payload.fecha_devolucion_real = fechaDevolucionReal;
      }
      const { error } = await supabase.from("rentas").update(payload as never).eq("id", rentaId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      const labels: Record<string, string> = {
        activa: "Renta activada",
        finalizada: "Renta finalizada",
        cancelada: "Renta cancelada",
      };
      toast.success(labels[variables.nuevoEstado] ?? "Estado actualizado");
      logRentaEvent(rentaId, "estado_actualizado", `Operativo: ${variables.nuevoEstado}`);
      queryClient.invalidateQueries({ queryKey: ["renta-detail", rentaId] });
      queryClient.invalidateQueries({ queryKey: ["rentas-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [numeroOficial, setNumeroOficial] = useState("");
  const [numeroDirty, setNumeroDirty] = useState(false);

  const fetchNextExpediente = async () => {
    const [rentas, documentos] = await Promise.all([
      supabase.from("rentas").select("numero_oficial").not("numero_oficial", "is", null).limit(1000),
      supabase.from("contratos").select("tipo, numero, form_data").limit(1000),
    ]);
    if (rentas.error || documentos.error) return "";
    const usados = [
      ...(rentas.data ?? []).map((r) => r.numero_oficial),
      ...(documentos.data ?? []).flatMap((d) => {
        const form = d.form_data && typeof d.form_data === "object" && !Array.isArray(d.form_data)
          ? d.form_data as { docNum?: string; facturaNum?: string }
          : {};
        return [form.docNum, d.tipo === "factura" ? form.facturaNum : null, d.tipo === "factura" ? d.numero : null];
      }),
    ];
    const max = usados.reduce((largest, value) => /^\d+$/.test((value ?? "").trim())
      ? Math.max(largest, Number(value)) : largest, 0);
    return String(max + 1).padStart(4, "0");
  };

  useEffect(() => {
    if (!renta) return;
    if (renta.numero_oficial) {
      setNumeroOficial(renta.numero_oficial);
    } else if (!numeroDirty) {
      fetchNextExpediente().then(setNumeroOficial);
    }
  }, [renta?.id]);

  const saveNumeroM = useMutation({
    mutationFn: async (num: string) => {
      const clean = num.trim();
      if (!clean) throw new Error("Escribí un número de expediente");
      const conflict = await verificarNumerosDisponibles([clean], rentaId);
      if (conflict) throw new Error(`El número ${conflict} ya está utilizado por otra factura o expediente`);
      const { error } = await supabase.from("rentas").update({ numero_oficial: clean }).eq("id", rentaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nº de expediente guardado");
      setNumeroDirty(false);
      queryClient.invalidateQueries({ queryKey: ["renta-detail", rentaId] });
      queryClient.invalidateQueries({ queryKey: ["rentas-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <Sheet open onOpenChange={() => onClose()}>
        <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl overflow-y-auto">
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!renta) return null;

  const diffMs = new Date(renta.fecha_devolucion).getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0 && renta.estado !== "finalizada" && renta.estado !== "cancelada";

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl overflow-y-auto">
        <SheetHeader className="border-b pb-4 mb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={RENTA_ESTADO_COLORS[renta.estado]}>
                {renta.estado}
              </Badge>
              <Badge variant="outline" className={ESTADO_FINANCIERO_COLORS[renta.estado_financiero]}>
                {ESTADO_FINANCIERO_LABELS[renta.estado_financiero] ?? renta.estado_financiero}
              </Badge>
            </div>
          </SheetTitle>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground font-medium">Nº Expediente:</span>
            <Input
              value={numeroOficial}
              onChange={(e) => { setNumeroOficial(e.target.value); setNumeroDirty(true); }}
              className="h-7 w-24 font-mono text-xs"
              placeholder="0001"
            />
            {numeroDirty && (
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-gold"
                title="Guardar"
                disabled={saveNumeroM.isPending}
                onClick={() => saveNumeroM.mutate(numeroOficial)}
              >
                {saveNumeroM.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              </Button>
            )}
            <span className="text-xs text-muted-foreground">· Folio: <span className="font-mono">{renta.folio}</span></span>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                <User className="size-3.5" /> Cliente
              </div>
              <p className="text-sm font-medium">{renta.clientes?.nombre ?? "—"}</p>
              {renta.clientes?.telefono && (
                <p className="text-xs text-muted-foreground mt-0.5">{renta.clientes.telefono}</p>
              )}
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                <Car className="size-3.5" /> Vehículo
              </div>
              <p className="text-sm font-medium">
                {renta.vehiculos
                  ? `${renta.vehiculos.marca} ${renta.vehiculos.modelo}`
                  : "—"}
              </p>
              {renta.vehiculos && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {renta.vehiculos.placa} · {renta.vehiculos.codigo}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                <Clock className="size-3.5" /> Tiempo
              </div>
              <p className="text-sm font-medium">
                {renta.estado === "finalizada" || renta.estado === "cancelada" ? (
                  <span className="text-muted-foreground">—</span>
                ) : isOverdue ? (
                  <span className="text-rose-600 font-semibold">
                    {Math.abs(diffDays)} día(s) vencido
                  </span>
                ) : diffDays <= 3 ? (
                  <span className="text-amber-600 font-semibold">
                    {diffDays} día(s) restante(s)
                  </span>
                ) : (
                  <span>{diffDays} día(s) restante(s)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(renta.fecha_inicio)} → {formatDate(renta.fecha_devolucion)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                <DollarSign className="size-3.5" /> Total
              </div>
              <p className="text-sm font-semibold">
                {formatCurrency(renta.total, renta.moneda as "NIO" | "USD")}
              </p>
              {renta.deposito > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Depósito: {formatCurrency(renta.deposito, renta.moneda as "NIO" | "USD")}
                </p>
              )}
              <p className="text-xs mt-0.5">
                <span className="text-muted-foreground">Financiero: </span>
                <span className={ESTADO_FINANCIERO_COLORS[renta.estado_financiero]?.replace("border-", "").replace("bg-", "text-")?.split(" ")[0] ?? "text-muted-foreground"}>
                  {ESTADO_FINANCIERO_LABELS[renta.estado_financiero] ?? renta.estado_financiero}
                </span>
              </p>
            </div>
          </div>

          {renta.estado !== "finalizada" && renta.estado !== "cancelada" && (
            <div className="flex flex-wrap gap-2">
              {renta.estado === "reservada" && (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => estadoM.mutate({ nuevoEstado: "activa" })}
                  disabled={estadoM.isPending}
                >
                  {estadoM.isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Play className="size-3.5 mr-1.5" />}
                  Activar
                </Button>
              )}
              {renta.estado === "activa" && (
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setConfirmFinalizar(true)}
                  disabled={estadoM.isPending}
                >
                  {estadoM.isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <SquareCheckBig className="size-3.5 mr-1.5" />}
                  Finalizar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950"
                onClick={() => setConfirmCancelar(true)}
                disabled={estadoM.isPending}
              >
                {estadoM.isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Ban className="size-3.5 mr-1.5" />}
                Cancelar
              </Button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="documentos" className="flex items-center gap-1.5 text-xs">
                <FileSignature className="size-3.5" /> Documentos
              </TabsTrigger>
              <TabsTrigger value="pagos" className="flex items-center gap-1.5 text-xs">
                <CreditCard className="size-3.5" /> Pagos
              </TabsTrigger>
              <TabsTrigger value="inspecciones" className="flex items-center gap-1.5 text-xs">
                <ClipboardCheck className="size-3.5" /> Inspecciones
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-1.5 text-xs">
                <Clock className="size-3.5" /> Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documentos" className="mt-4">
              <RentaDetailTabDocumentos rentaId={rentaId} numeroOficial={numeroOficial} />
            </TabsContent>
            <TabsContent value="pagos" className="mt-4">
              <RentaDetailTabPayments
                rentaId={rentaId}
                total={renta.total}
                deposito={renta.deposito}
                moneda={renta.moneda as "NIO" | "USD"}
                vehiculo={renta.vehiculos ?? undefined}
                dias={renta.dias}
                tarifaSubarriendo={renta.tarifa_subarriendo}
              />
            </TabsContent>
            <TabsContent value="inspecciones" className="mt-4">
              <RentaDetailTabInspections rentaId={rentaId} />
            </TabsContent>
            <TabsContent value="timeline" className="mt-4">
              <RentaDetailTabTimeline rentaId={rentaId} />
            </TabsContent>
          </Tabs>
        </div>

        <AlertDialog open={confirmFinalizar} onOpenChange={setConfirmFinalizar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Finalizar esta renta?</AlertDialogTitle>
              <AlertDialogDescription>
                Se marcará la fecha de devolución como hoy. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                estadoM.mutate({ nuevoEstado: "finalizada", fechaDevolucionReal: new Date().toISOString() });
                setConfirmFinalizar(false);
              }}>
                Finalizar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmCancelar} onOpenChange={setConfirmCancelar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar esta renta?</AlertDialogTitle>
              <AlertDialogDescription>
                La renta se marcará como cancelada. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                estadoM.mutate({ nuevoEstado: "cancelada" });
                setConfirmCancelar(false);
              }}>
                Cancelar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
