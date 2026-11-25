import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";

type RentaEvent = {
  id: string;
  folio: string;
  fecha_inicio: string;
  fecha_devolucion: string;
  estado: string;
  total: number | null;
  moneda: string | null;
  vehiculo_id: string | null;
  clientes?: { nombre: string } | null;
  vehiculos?: { codigo: string; placa: string; marca: string; modelo: string } | null;
};

type VehiculoOption = {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
};

const ALL_STATUSES = ["reservada", "activa", "finalizada", "cancelada"];

const estadoBadge: Record<string, string> = {
  reservada: "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40",
  activa: "bg-blue-500/20 text-blue-900 dark:text-blue-200 border-blue-500/40",
  finalizada: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-emerald-500/40",
  cancelada: "bg-rose-500/15 text-rose-900 dark:text-rose-200 border-rose-500/40",
};

const estadoLabel: Record<string, string> = {
  reservada: "Reservada",
  activa: "Activa",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function Page() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const today = new Date().toISOString().slice(0, 10);

  const vehiclesQ = useQuery({
    queryKey: ["vehiculos-lista"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehiculos")
        .select("id, marca, modelo, placa")
        .is("deleted_at", null)
        .order("marca");
      return (data ?? []) as VehiculoOption[];
    },
  });

  const filterKey = [
    "calendario-v2",
    cursor.toISOString(),
    selectedVehicle || "_all",
    ...(selectedStatuses.size > 0 ? [...selectedStatuses].sort() : ["_all"]),
  ].join("|");

  const q = useQuery({
    queryKey: [filterKey],
    queryFn: async () => {
      let query = supabase
        .from("rentas")
        .select(
          "id, folio, fecha_inicio, fecha_devolucion, estado, total, moneda, vehiculo_id, clientes(nombre), vehiculos(codigo, placa, marca, modelo)",
        )
        .is("deleted_at", null)
        .gte("fecha_inicio", new Date(monthStart.getTime() - 31 * 86400000).toISOString())
        .lte("fecha_inicio", new Date(monthEnd.getTime() + 31 * 86400000).toISOString())
        .order("fecha_inicio");

      if (selectedVehicle) query = query.eq("vehiculo_id", selectedVehicle);
      if (selectedStatuses.size > 0)
        query = query.in("estado", [...selectedStatuses] as unknown as readonly (
          "reservada" | "activa" | "finalizada" | "cancelada"
        )[]);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as RentaEvent[];
    },
  });

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

  const selectedEvents = useMemo(() => eventsByDay[selectedDay] ?? [], [eventsByDay, selectedDay]);

  const monthLabel = cursor.toLocaleDateString("es-NI", { month: "long", year: "numeric" });

  const monthEvents = useMemo(() => {
    const all = q.data ?? [];
    const inMonth = all.filter((e) => {
      const s = new Date(e.fecha_inicio);
      return s >= monthStart && s <= monthEnd;
    });
    const activas = inMonth.filter((e) => e.estado === "activa");
    let ingresoUSD = 0;
    let ingresoNIO = 0;
    for (const e of inMonth) {
      const total = Number(e.total ?? 0);
      if (e.moneda === "USD") ingresoUSD += total;
      else ingresoNIO += total;
    }
    return { total: inMonth.length, activas: activas.length, ingresoUSD, ingresoNIO };
  }, [q.data, monthStart, monthEnd]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const getHeatClass = (count: number) => {
    if (count === 0) return "";
    if (count <= 1) return "bg-blue-50/50 dark:bg-blue-950/30";
    if (count <= 2) return "bg-blue-100/60 dark:bg-blue-900/40";
    if (count <= 3) return "bg-blue-200/60 dark:bg-blue-800/50";
    return "bg-blue-300/60 dark:bg-blue-700/50";
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <CalIcon className="size-6 text-gold" /> Calendario de rentas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Disponibilidad y ocupación de la flota.
          </p>
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes anterior"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1 text-center text-sm font-medium capitalize sm:min-w-40">
            {monthLabel}
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes siguiente"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
            Hoy
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-56">
          <Select value={selectedVehicle || "todos"} onValueChange={(value) => setSelectedVehicle(value === "todos" ? "" : value)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Todos los vehículos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los vehículos</SelectItem>
              {vehiclesQ.data?.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.marca} {v.modelo} ({v.placa})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className={cn(
                "cursor-pointer transition-all select-none",
                estadoBadge[s],
                selectedStatuses.size > 0 && !selectedStatuses.has(s) && "opacity-30",
                selectedStatuses.size === 0 && "opacity-70 hover:opacity-100",
              )}
              onClick={() => toggleStatus(s)}
            >
              {estadoLabel[s]}
            </Badge>
          ))}
          {selectedStatuses.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setSelectedStatuses(new Set())}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{monthEvents.total}</strong> rentas en el mes
        </span>
        <span>
          <strong className="text-blue-600 dark:text-blue-400">{monthEvents.activas}</strong>{" "}
          activas
        </span>
        <span>
          Ingreso estimado:{" "}
          <strong className="text-foreground">
            {monthEvents.ingresoUSD > 0 && monthEvents.ingresoNIO > 0
              ? `${formatCurrency(monthEvents.ingresoUSD, "USD")} + ${formatCurrency(monthEvents.ingresoNIO, "NIO")}`
              : monthEvents.ingresoUSD > 0
                ? formatCurrency(monthEvents.ingresoUSD, "USD")
                : monthEvents.ingresoNIO > 0
                  ? formatCurrency(monthEvents.ingresoNIO, "NIO")
                  : formatCurrency(0, "USD")
            }
          </strong>
        </span>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((day) => {
            const key = day.toISOString().slice(0, 10);
            const inMonth = day.getMonth() === cursor.getMonth();
            const evs = eventsByDay[key] ?? [];
            const heatClass = getHeatClass(evs.length);
            const isToday = key === today;
            const isSelected = key === selectedDay;

            return (
              <div
                key={key}
                className={cn(
                  "relative min-w-0 min-h-16 sm:min-h-[5.5rem] border-b border-r p-1 sm:p-1.5 text-xs cursor-pointer transition-colors",
                  inMonth ? "bg-card" : "bg-muted/20 text-muted-foreground",
                  heatClass,
                  isToday && "ring-1 ring-inset ring-gold/60",
                  isSelected && "ring-2 ring-inset ring-primary/60",
                )}
                onClick={() => setSelectedDay(key)}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className={cn("font-medium", isToday && "text-gold")}>{day.getDate()}</span>
                  {evs.length > 0 && (
                    <span className="rounded bg-primary/10 px-1 text-[0.6rem] font-semibold text-primary">
                      {evs.length}
                    </span>
                  )}
                </div>
                <div className="hidden space-y-0.5 sm:block">
                  {evs.slice(0, 2).map((e) => (
                    <div
                      key={`${e.id}-${key}`}
                      title={`${e.folio} · ${e.clientes?.nombre ?? ""} · ${e.vehiculos ? `${e.vehiculos.marca} ${e.vehiculos.modelo}` : ""}`}
                      className={cn(
                        "truncate rounded border px-1 py-0.5 text-[0.6rem]",
                        estadoBadge[e.estado] ?? "",
                      )}
                    >
                      {e.vehiculos
                        ? `${e.vehiculos.marca} ${e.vehiculos.modelo}`.substring(0, 14)
                        : e.folio}
                    </div>
                  ))}
                  {evs.length > 2 && (
                    <div className="text-[0.6rem] font-medium text-muted-foreground">
                      +{evs.length - 2} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Selected Day Detail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {selectedEvents.length > 0
              ? `Rentas del ${formatDate(selectedDay)}`
              : `Sin rentas el ${formatDate(selectedDay)}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {selectedEvents.length > 0 ? (
            selectedEvents.map((e) => {
              const start = new Date(e.fecha_inicio);
              const end = new Date(e.fecha_devolucion);
              const diffDays = Math.max(
                1,
                Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1,
              );

              const days: string[] = [];
              const cur = new Date(start);
              while (cur <= end) {
                days.push(cur.toLocaleDateString("es-NI", { day: "numeric", month: "short" }));
                cur.setDate(cur.getDate() + 1);
              }

              return (
                <div key={e.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {e.vehiculos
                            ? `${e.vehiculos.marca} ${e.vehiculos.modelo} (${e.vehiculos.placa})`
                            : e.folio}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 text-[0.6rem] px-1.5 py-0",
                            estadoBadge[e.estado],
                          )}
                        >
                          {estadoLabel[e.estado]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {e.clientes?.nombre ?? "Sin cliente"} · {e.folio}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {e.total
                          ? formatCurrency(e.total, (e.moneda as "NIO" | "USD") ?? "NIO")
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-medium text-muted-foreground">Inicia</span>
                    {days.map((d, i) => (
                      <span
                        key={i}
                        className={cn(
                          "rounded px-1.5 py-0.5 tabular-nums",
                          i === 0 &&
                            "bg-blue-100/60 font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
                          i === days.length - 1 &&
                            i !== 0 &&
                            "bg-amber-100/60 font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                          i > 0 && i < days.length - 1 && "text-muted-foreground",
                        )}
                      >
                        {d}
                      </span>
                    ))}
                    <span className="font-medium text-muted-foreground">Finaliza</span>
                    <span className="ml-1 text-muted-foreground">
                      ({diffDays} {diffDays === 1 ? "día" : "días"})
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay rentas registradas para esta fecha.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendario — TM RENT A CAR" }] }),
  component: Page,
});
