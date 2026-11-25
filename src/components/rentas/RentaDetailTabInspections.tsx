import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardCheck, ArrowRight } from "lucide-react";
import { formatDateTime } from "@/lib/format";

type Inspeccion = {
  id: string;
  tipo: "salida" | "devolucion";
  fecha: string;
  kilometraje: number;
  combustible_porcentaje: number;
  danos: string | null;
  observaciones: string | null;
};

export function RentaDetailTabInspections({ rentaId }: { rentaId: string }) {
  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ["inspecciones-renta", rentaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("inspecciones")
        .select("*")
        .eq("renta_id", rentaId)
        .order("fecha", { ascending: true });
      return (data ?? []) as Inspeccion[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const salida = inspections.find((i) => i.tipo === "salida");
  const devolucion = inspections.find((i) => i.tipo === "devolucion");

  if (inspections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <ClipboardCheck className="size-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Sin inspecciones registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {salida && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="bg-blue-500/15 text-blue-700 border-blue-500/30">
              Salida
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(salida.fecha)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Kilometraje</span>
              <span className="font-medium">{salida.kilometraje.toLocaleString()} km</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Combustible</span>
              <span className="font-medium">{salida.combustible_porcentaje}%</span>
            </div>
          </div>
          {salida.danos && (
            <p className="mt-2 text-xs text-muted-foreground">Daños: {salida.danos}</p>
          )}
          {salida.observaciones && (
            <p className="mt-1 text-xs text-muted-foreground">Obs: {salida.observaciones}</p>
          )}
        </div>
      )}

      {salida && devolucion && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ArrowRight className="size-3" />
          <span>
            Recorridos:{" "}
            <strong>{(devolucion.kilometraje - salida.kilometraje).toLocaleString()} km</strong>
          </span>
          <ArrowRight className="size-3" />
          <span>
            Combustible:{" "}
            <strong>{devolucion.combustible_porcentaje - salida.combustible_porcentaje}%</strong>
          </span>
        </div>
      )}

      {devolucion && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge
              variant="outline"
              className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
            >
              Devolución
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(devolucion.fecha)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Kilometraje</span>
              <span className="font-medium">{devolucion.kilometraje.toLocaleString()} km</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Combustible</span>
              <span className="font-medium">{devolucion.combustible_porcentaje}%</span>
            </div>
          </div>
          {devolucion.danos && (
            <p className="mt-2 text-xs text-muted-foreground">Daños: {devolucion.danos}</p>
          )}
          {devolucion.observaciones && (
            <p className="mt-1 text-xs text-muted-foreground">Obs: {devolucion.observaciones}</p>
          )}
        </div>
      )}
    </div>
  );
}
