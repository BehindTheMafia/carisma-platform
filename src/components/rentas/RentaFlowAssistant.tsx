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
import { FileText, FileSignature, FileCheck, Receipt, Loader2, Check, Play, CreditCard, SquareCheckBig, CircleDot, Download, ExternalLink } from "lucide-react";
import { logRentaEvent } from "@/lib/renta-log";
import { toast } from "sonner";

type DocFull = { tipo: string; id: string; estado: string; numero: string; pdf_url: string | null };

type FlowCtx = {
  docsByType: Map<string, DocFull>;
  rentaEstado: string;
  hasPayments: boolean;
};

type FlowStep = {
  key: string;
  label: string;
  icon: typeof FileText;
  isCompleted: (ctx: FlowCtx) => boolean;
  actionLabel?: string;
  actionIcon?: typeof FileText;
  showAction?: (ctx: FlowCtx) => boolean;
  onClick?: () => void;
};

const DOC_TIPO_LABELS: Record<string, string> = {
  proforma: "Proforma",
  confirmacion: "Confirmación",
  contrato: "Contrato",
  factura: "Factura",
};

export function RentaFlowAssistant({
  rentaId,
  rentaEstado,
  onSwitchTab,
}: {
  rentaId: string;
  rentaEstado: string;
  onSwitchTab: (tab: string) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmFinalizar, setConfirmFinalizar] = useState(false);

  const { data: docs = [] } = useQuery({
    queryKey: ["documentos-renta-full", rentaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos")
        .select("tipo, id, estado, numero, pdf_url")
        .eq("renta_id", rentaId)
        .order("created_at", { ascending: false });
      return (data ?? []) as DocFull[];
    },
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ["pagos-renta", rentaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pagos")
        .select("id")
        .eq("renta_id", rentaId)
        .is("deleted_at", null);
      return data ?? [];
    },
  });

  const docsByType = new Map(docs.map((d) => [d.tipo, d]));
  const ctx: FlowCtx = { docsByType, rentaEstado, hasPayments: pagos.length > 0 };

  const estadoM = useMutation({
    mutationFn: async ({ nuevoEstado, fechaDevolucionReal }: { nuevoEstado: string; fechaDevolucionReal?: string }) => {
      const payload: Record<string, unknown> = { estado: nuevoEstado };
      if (fechaDevolucionReal) payload.fecha_devolucion_real = fechaDevolucionReal;
      const { error } = await supabase.from("rentas").update(payload as never).eq("id", rentaId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      const msgs: Record<string, string> = {
        reservada: "Reserva confirmada",
        activa: "Renta activada",
        finalizada: "Renta finalizada",
        cancelada: "Renta cancelada",
      };
      toast.success(msgs[variables.nuevoEstado] ?? "Estado actualizado");
      logRentaEvent(rentaId, "estado_actualizado", `Operativo: ${variables.nuevoEstado}`);
      queryClient.invalidateQueries({ queryKey: ["renta-detail", rentaId] });
      queryClient.invalidateQueries({ queryKey: ["rentas-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const STEPS: FlowStep[] = [
    {
      key: "cotizacion", label: "Cotización", icon: CircleDot,
      isCompleted: (c) => c.rentaEstado !== "cotizacion",
    },
    {
      key: "proforma", label: "Proforma", icon: FileText,
      isCompleted: (c) => c.docsByType.has("proforma"),
      showAction: () => true,
      onClick: () => navigate({ to: "/documentos", search: { editId: undefined, rentaId } }),
    },
    {
      key: "confirmacion", label: "Confirmación de Reserva", icon: FileSignature,
      isCompleted: (c) => ["reservada", "activa", "finalizada", "cancelada"].includes(c.rentaEstado),
      showAction: (c) => c.rentaEstado === "cotizacion",
      onClick: () => estadoM.mutate({ nuevoEstado: "reservada" }),
    },
    {
      key: "activar", label: "Activar Renta", icon: Play,
      isCompleted: (c) => ["activa", "finalizada", "cancelada"].includes(c.rentaEstado),
      showAction: (c) => c.rentaEstado === "reservada",
      onClick: () => estadoM.mutate({ nuevoEstado: "activa" }),
    },
    {
      key: "contrato", label: "Contrato", icon: FileCheck,
      isCompleted: (c) => c.docsByType.has("contrato"),
      showAction: () => true,
      onClick: () => navigate({ to: "/documentos", search: { editId: undefined, rentaId } }),
    },
    {
      key: "pagos", label: "Pagos", icon: CreditCard,
      isCompleted: (c) => c.hasPayments,
      showAction: () => true,
      onClick: () => onSwitchTab("pagos"),
    },
    {
      key: "finalizar", label: "Finalizar Renta", icon: SquareCheckBig,
      isCompleted: (c) => ["finalizada", "cancelada"].includes(c.rentaEstado),
      showAction: (c) => c.rentaEstado === "activa",
      onClick: () => setConfirmFinalizar(true),
    },
    {
      key: "factura", label: "Factura", icon: Receipt,
      isCompleted: (c) => c.docsByType.has("factura"),
      showAction: () => true,
      onClick: () => navigate({ to: "/documentos", search: { editId: undefined, rentaId } }),
    },
  ];

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Flujo de Renta
      </p>
      <div className="space-y-0">
        {STEPS.map((step, idx) => {
          const completed = step.isCompleted(ctx);
          const showAction = step.showAction?.(ctx);
          const Icon = step.icon;
          const doc = docsByType.get(step.key);

          const isDocStep = ["proforma", "contrato", "factura"].includes(step.key);
          const isEstadoStep = ["confirmacion", "activar", "finalizar"].includes(step.key);

          const actionLabel = isDocStep
            ? doc
              ? doc.estado === "anulado"
                ? "Reemitir"
                : "Abrir"
              : "Emitir"
            : step.key === "confirmacion"
              ? "Confirmar Reserva"
              : step.key === "activar"
                ? "Activar"
                : step.key === "finalizar"
                  ? "Finalizar"
                  : step.actionLabel;

          const ActionIcon = isDocStep
            ? doc
              ? FileText
              : FileText
            : step.icon;

          return (
            <div key={step.key}>
              {idx > 0 && (
                <div className="flex items-center gap-3 py-0.5">
                  <div className="flex flex-col items-center w-6">
                    <div className={`w-px h-4 ${completed ? "bg-gold/40" : "bg-muted"}`} />
                  </div>
                </div>
              )}
              <div
                className={`flex items-start gap-3 py-2.5 px-2 rounded-lg transition-colors ${
                  !completed ? "bg-gold/5 ring-1 ring-gold/20" : ""
                }`}
              >
                <div className={`flex items-center justify-center size-6 shrink-0 rounded-full mt-0.5 ${completed ? "bg-emerald-500/15" : "bg-muted"}`}>
                  {completed ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Icon className="size-3.5 text-gold" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${completed ? "text-muted-foreground" : "text-foreground"}`}>
                      {step.label}
                    </span>
                    {isDocStep && doc && (
                      <Badge variant="outline" className={`${doc.estado === "anulado" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"} text-[10px] px-1.5 py-0`}>
                        {doc.estado}
                      </Badge>
                    )}
                    {isEstadoStep && completed && (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0">
                        Completado
                      </Badge>
                    )}
                    {step.key === "cotizacion" && completed && (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0">
                        Superada
                      </Badge>
                    )}
                  </div>
                  {isDocStep && doc && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {doc.numero}
                    </p>
                  )}
                  {!completed && isDocStep && !doc && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      No emitida
                    </p>
                  )}
                  {step.key === "pagos" && !completed && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sin pagos registrados
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {isDocStep && doc?.pdf_url && (
                    <>
                      <Button variant="ghost" size="icon" className="size-7" asChild>
                        <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" asChild>
                        <a href={doc.pdf_url} download>
                          <Download className="size-3.5" />
                        </a>
                      </Button>
                    </>
                  )}
                  {showAction && (
                    <Button
                      size="sm"
                      variant={completed ? "outline" : "default"}
                      className="shrink-0 h-7 text-xs gap-1.5"
                      onClick={() => step.onClick?.()}
                      disabled={estadoM.isPending}
                    >
                      {estadoM.isPending && <Loader2 className="size-3 animate-spin" />}
                      {!estadoM.isPending && ActionIcon && <ActionIcon className="size-3" />}
                      {actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
    </div>
  );
}
