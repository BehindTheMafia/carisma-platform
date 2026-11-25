import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  BellRing,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  RefreshCw,
  Loader2,
  Send,
  Car,
  User,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type Recordatorio = {
  id: string;
  renta_id: string | null;
  cliente_id: string | null;
  vehiculo_id: string | null;
  tipo: "devolucion" | "personalizado" | "vencimiento_seguro";
  fecha_programada: string;
  mensaje: string;
  enviado: boolean;
  created_at: string;
  cliente_nombre: string | null;
  cliente_whatsapp: string | null;
  vehiculo_info: string | null;
};

type Group = {
  label: string;
  date: string;
  items: Recordatorio[];
};

function groupReminders(items: Recordatorio[]): Group[] {
  const map = new Map<string, Recordatorio[]>();
  for (const item of items) {
    const key = item.fecha_programada;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));

  return sorted.map(([date, items]) => {
    const d = parseISO(date);
    let label: string;
    if (isToday(d)) label = "Hoy";
    else if (isTomorrow(d)) label = "Mañana";
    else label = format(d, "EEEE d 'de' MMMM", { locale: es });

    return { label, date, items };
  });
}

function formatDisplayDate(dateStr: string): string {
  const d = parseISO(dateStr);
  return format(d, "EEE d MMM", { locale: es });
}

export const Route = createFileRoute("/_authenticated/recordatorios")({
  head: () => ({ meta: [{ title: "Recordatorios — TM RENT A CAR" }] }),
  component: Page,
});

function Page() {
  const [reminders, setReminders] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  const fetchReminders = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("recordatorios")
      .select(
        `
        *,
        clientes!left(nombre, whatsapp),
        vehiculos!left(marca, modelo, placa)
      `,
      )
      .order("fecha_programada", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Error al cargar recordatorios");
      return;
    }

    const mapped: Recordatorio[] = ((data as any[]) ?? []).map((r: any) => ({
      id: r.id,
      renta_id: r.renta_id,
      cliente_id: r.cliente_id,
      vehiculo_id: r.vehiculo_id,
      tipo: r.tipo,
      fecha_programada: r.fecha_programada,
      mensaje: r.mensaje,
      enviado: r.enviado,
      created_at: r.created_at,
      cliente_nombre: r.clientes?.nombre ?? null,
      cliente_whatsapp: r.clientes?.whatsapp ?? null,
      vehiculo_info: r.vehiculos
        ? `${r.vehiculos.marca} ${r.vehiculos.modelo} · ${r.vehiculos.placa}`
        : null,
    }));

    // Also fetch seguros expiring within 7 days (including overdue)
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 7);
    const targetStr = targetDate.toISOString().slice(0, 10);

    const { data: seguros, error: segurosError } = await (supabase as any)
      .from("seguros")
      .select("*, vehiculos!left(marca, modelo, placa)")
      .eq("activo", true)
      .is("deleted_at", null)
      .lte("fecha_vencimiento", targetStr)
      .gte("fecha_vencimiento", todayStr);

    if (!segurosError && seguros) {
      const seguroReminders: Recordatorio[] = ((seguros as any[]) ?? []).map((s: any) => ({
        id: `seguro-${s.id}`,
        renta_id: null,
        cliente_id: null,
        vehiculo_id: s.vehiculo_id,
        tipo: "vencimiento_seguro" as const,
        fecha_programada: today.toISOString().slice(0, 10),
        mensaje: [
          "⚠️ Vencimiento de seguro",
          "",
          `El seguro del vehículo ${s.vehiculos?.marca ?? "—"} ${s.vehiculos?.modelo ?? "—"} (placa: ${s.vehiculos?.placa ?? "—"})`,
          `con ${s.aseguradora} (póliza: ${s.numero_poliza})`,
          `vence el ${new Date(s.fecha_vencimiento).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}.`,
          "",
          "Por favor, gestionar la renovación antes de la fecha de vencimiento para mantener la flota asegurada.",
          "",
          "TM RENT A CAR",
        ].join("\n"),
        enviado: false,
        created_at: today.toISOString(),
        cliente_nombre: null,
        cliente_whatsapp: null,
        vehiculo_info: s.vehiculos
          ? `${s.vehiculos.marca} ${s.vehiculos.modelo} · ${s.vehiculos.placa}`
          : null,
      }));
      setReminders([...mapped, ...seguroReminders]);
    } else {
      setReminders(mapped);
    }
  }, []);

  const sync = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    const { data, error } = await (supabase as any).rpc("sync_recordatorios");
    if (error) {
      console.error(error);
      if (!silent) toast.error("Error al sincronizar");
    } else {
      const count = (data as number) ?? 0;
      if (!silent) {
        if (count > 0) toast.success(`${count} recordatorio(s) generado(s)`);
        else toast.message("Sin novedades");
      }
    }
    if (!silent) setSyncing(false);
  }, []);

  useEffect(() => {
    (async () => {
      await sync(true);
      await fetchReminders();
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkSent = async (id: string) => {
    if (id.startsWith("seguro-")) {
      setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, enviado: true } : r)));
      toast.success("Marcado como revisado");
      return;
    }
    const { error } = await (supabase as any)
      .from("recordatorios")
      .update({ enviado: true })
      .eq("id", id);

    if (error) {
      toast.error("Error al actualizar");
      return;
    }

    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, enviado: true } : r)));
    toast.success("Marcado como enviado");
  };

  const handleMarkPending = async (id: string) => {
    if (id.startsWith("seguro-")) {
      setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, enviado: false } : r)));
      toast.success("Restaurado a pendiente");
      return;
    }
    const { error } = await (supabase as any)
      .from("recordatorios")
      .update({ enviado: false })
      .eq("id", id);

    if (error) {
      toast.error("Error al actualizar");
      return;
    }

    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, enviado: false } : r)));
  };

  const handleCopy = (mensaje: string) => {
    navigator.clipboard.writeText(mensaje);
    toast.success("Mensaje copiado");
  };

  const handleWhatsApp = (whatsapp: string | null, mensaje: string, id: string) => {
    if (!whatsapp) {
      toast.error("El cliente no tiene número de WhatsApp registrado");
      return;
    }
    const url = `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
    handleMarkSent(id);
  };

  const pending = useMemo(() => reminders.filter((r) => !r.enviado), [reminders]);
  const completed = useMemo(() => reminders.filter((r) => r.enviado), [reminders]);
  const pendingGroups = useMemo(() => groupReminders(pending), [pending]);
  const completedGroups = useMemo(() => groupReminders(completed), [completed]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Bell className="size-6 text-gold" />
            Recordatorios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recordatorios agendados para devoluciones y eventos importantes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pending.length > 0 ? (
            <Badge variant="secondary" className="gap-1">
              <BellRing className="size-3.5" />
              {pending.length} pendiente(s)
            </Badge>
          ) : null}
          <Button
            variant="outline"
            onClick={async () => {
              await sync();
              await fetchReminders();
            }}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Sincronizar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending */}
          {pendingGroups.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Bell className="size-10" />
              <p className="text-sm">No hay recordatorios pendientes.</p>
            </div>
          ) : (
            pendingGroups.map((group) => (
              <section key={group.date}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-sm font-semibold capitalize">{group.label}</h2>
                  <span className="text-xs text-muted-foreground">
                    {formatDisplayDate(group.date)}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                  <Badge variant="outline" className="text-xs">
                    {group.items.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {group.items.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {r.cliente_nombre ? (
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <User className="size-3.5 text-muted-foreground" />
                                {r.cliente_nombre}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                                <ShieldAlert className="size-3.5" />
                                Operaciones
                              </div>
                            )}
                            {r.vehiculo_info ? (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Car className="size-3" />
                                {r.vehiculo_info}
                              </div>
                            ) : null}
                            <Badge
                              variant="outline"
                              className={
                                "ml-auto text-[10px] uppercase " +
                                (r.tipo === "vencimiento_seguro"
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                  : "")
                              }
                            >
                              {r.tipo === "devolucion"
                                ? "Devolución"
                                : r.tipo === "vencimiento_seguro"
                                  ? "Seguro"
                                  : r.tipo}
                            </Badge>
                          </div>
                          <div className="relative rounded-lg bg-muted p-3">
                            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground font-sans">
                              {r.mensaje}
                            </pre>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleCopy(r.mensaje)}
                            title="Copiar mensaje"
                          >
                            <ClipboardCopy className="size-4" />
                          </Button>
                          {r.cliente_whatsapp ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-emerald-600"
                              onClick={() => handleWhatsApp(r.cliente_whatsapp, r.mensaje, r.id)}
                              title="Enviar por WhatsApp"
                            >
                              <Send className="size-4" />
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                            onClick={() => handleMarkSent(r.id)}
                            title="Marcar como enviado"
                          >
                            <CheckCheck className="size-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setCompletedOpen((o) => !o)}
                className="flex w-full items-center gap-3 py-2 text-left"
              >
                {completedOpen ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
                <h2 className="text-sm font-semibold">Completados</h2>
                <span className="text-xs text-muted-foreground">{completed.length}</span>
                <div className="h-px flex-1 bg-border" />
              </button>

              {completedOpen && (
                <div className="mt-4 space-y-8">
                  {completedGroups.map((group) => (
                    <section key={group.date}>
                      <div className="mb-3 flex items-center gap-3">
                        <h2 className="text-sm font-semibold capitalize text-muted-foreground">
                          {group.label}
                        </h2>
                        <span className="text-xs text-muted-foreground">
                          {formatDisplayDate(group.date)}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="space-y-3">
                        {group.items.map((r) => (
                          <Card key={r.id} className="opacity-60">
                            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                              <div className="flex-1 space-y-2 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <CheckCheck className="size-3.5 text-emerald-600" />
                                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground line-through">
                                    {r.cliente_nombre ? (
                                      <>
                                        <User className="size-3.5" />
                                        {r.cliente_nombre}
                                      </>
                                    ) : (
                                      <>
                                        <ShieldAlert className="size-3.5" />
                                        Operaciones
                                      </>
                                    )}
                                  </div>
                                  {r.vehiculo_info ? (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Car className="size-3" />
                                      {r.vehiculo_info}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    onClick={() => handleCopy(r.mensaje)}
                                    title="Copiar mensaje"
                                  >
                                    <ClipboardCopy className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground"
                                    onClick={() => handleMarkPending(r.id)}
                                    title="Restaurar a pendiente"
                                  >
                                    <RefreshCw className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
