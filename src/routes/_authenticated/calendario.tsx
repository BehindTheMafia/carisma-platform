import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RentaEvent = {
  id: string;
  folio: string;
  fecha_inicio: string;
  fecha_devolucion: string;
  estado: string;
  clientes?: { nombre: string };
  vehiculos?: { codigo: string; placa: string };
};

const estadoColor: Record<string, string> = {
  reservada: "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40",
  activa: "bg-blue-500/20 text-blue-900 dark:text-blue-200 border-blue-500/40",
  finalizada: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-emerald-500/40",
  cancelada: "bg-rose-500/15 text-rose-900 dark:text-rose-200 border-rose-500/40",
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function Page() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);

  const q = useQuery({
    queryKey: ["calendario", cursor.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentas")
        .select("id, folio, fecha_inicio, fecha_devolucion, estado, clientes(nombre), vehiculos(codigo, placa)")
        .is("deleted_at", null)
        .gte("fecha_inicio", new Date(monthStart.getTime() - 31 * 86400000).toISOString())
        .lte("fecha_inicio", new Date(monthEnd.getTime() + 31 * 86400000).toISOString())
        .order("fecha_inicio");
      if (error) throw error;
      return (data ?? []) as unknown as RentaEvent[];
    },
  });

  // Build day grid (start on Sunday)
  const grid = useMemo(() => {
    const firstDay = new Date(monthStart);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(firstDay);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [monthStart]);

  const eventsByDay = useMemo(() => {
    const m: Record<string, RentaEvent[]> = {};
    for (const e of q.data ?? []) {
      const start = new Date(e.fecha_inicio);
      const end = new Date(e.fecha_devolucion);
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10);
        (m[key] ??= []).push(e);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return m;
  }, [q.data]);

  const monthLabel = cursor.toLocaleDateString("es-NI", { month: "long", year: "numeric" });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <CalIcon className="size-6 text-gold" /> Calendario de rentas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Disponibilidad y ocupación de la flota.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-[10rem] text-center text-sm font-medium capitalize">{monthLabel}</div>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>Hoy</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((day) => {
            const key = day.toISOString().slice(0, 10);
            const inMonth = day.getMonth() === cursor.getMonth();
            const evs = eventsByDay[key] ?? [];
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[6rem] border-b border-r p-1.5 text-xs",
                  inMonth ? "bg-card" : "bg-muted/20 text-muted-foreground",
                  key === today ? "ring-1 ring-inset ring-gold/60" : "",
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className={cn("font-medium", key === today ? "text-gold" : "")}>{day.getDate()}</span>
                  {evs.length > 0 ? <span className="rounded bg-primary/10 px-1 text-[0.6rem] text-primary">{evs.length}</span> : null}
                </div>
                <div className="space-y-0.5">
                  {evs.slice(0, 3).map((e) => (
                    <div
                      key={`${e.id}-${key}`}
                      title={`${e.folio} · ${e.clientes?.nombre ?? ""}`}
                      className={cn("truncate rounded border px-1 py-0.5 text-[0.65rem]", estadoColor[e.estado] ?? "")}
                    >
                      {e.vehiculos?.placa ?? e.folio} · {e.clientes?.nombre?.split(" ")[0] ?? ""}
                    </div>
                  ))}
                  {evs.length > 3 ? <div className="text-[0.6rem] text-muted-foreground">+{evs.length - 3} más</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(estadoColor).map(([k, v]) => (
          <Badge key={k} variant="outline" className={v}>{k}</Badge>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendario — TM RENT A CAR" }] }),
  component: Page,
});