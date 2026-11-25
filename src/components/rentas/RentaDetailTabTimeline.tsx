import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Circle, FileSignature, CreditCard, ClipboardCheck, RefreshCw, Wallet } from "lucide-react";
import { formatDateTime, formatCurrency, type Moneda } from "@/lib/format";

type RentaLog = {
  id: string;
  accion: string;
  descripcion: string | null;
  created_at: string;
};

type Egreso = {
  id: string;
  concepto: string;
  categoria: string;
  monto: number;
  moneda: Moneda;
  created_at: string;
};

const actionIcons: Record<string, typeof Circle> = {
  creada: RefreshCw,
  contrato_generado: FileSignature,
  pago_registrado: CreditCard,
  inspeccion_creada: ClipboardCheck,
  estado_actualizado: RefreshCw,
};

export function RentaDetailTabTimeline({ rentaId }: { rentaId: string }) {
  const { data: events = [], isLoading: logLoading } = useQuery({
    queryKey: ["renta-log", rentaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("renta_log")
        .select("id, accion, descripcion, created_at")
        .eq("renta_id", rentaId)
        .order("created_at", { ascending: false });
      return (data ?? []) as RentaLog[];
    },
  });

  const { data: egresos = [], isLoading: egresosLoading } = useQuery({
    queryKey: ["egresos-renta", rentaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("egresos")
        .select("id, concepto, categoria, monto, moneda, created_at")
        .eq("renta_id", rentaId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return (data ?? []) as Egreso[];
    },
  });

  const isLoading = logLoading || egresosLoading;

  const merged = [
    ...events.map((e) => ({ ...e, _type: "log" as const })),
    ...egresos.map((e) => ({ ...e, _type: "egreso" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (merged.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">No hay eventos registrados</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {merged.map((event) => {
          if (event._type === "log") {
            const Icon = actionIcons[event.accion] ?? Circle;
            return (
              <div key={`log-${event.id}`} className="relative pl-10">
                <div className="absolute left-2.5 top-1 bg-card p-0.5 rounded-full">
                  <Icon className="size-3 text-muted-foreground" />
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-sm font-medium capitalize">
                    {event.accion.replace(/_/g, " ")}
                  </p>
                  {event.descripcion && (
                    <p className="text-xs text-muted-foreground mt-0.5">{event.descripcion}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(event.created_at)}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div key={`egr-${event.id}`} className="relative pl-10">
              <div className="absolute left-2.5 top-1 bg-card p-0.5 rounded-full">
                <Wallet className="size-3 text-rose-500" />
              </div>
              <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{event.concepto}</p>
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                    -{formatCurrency(event.monto, event.moneda)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {event.categoria}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDateTime(event.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
