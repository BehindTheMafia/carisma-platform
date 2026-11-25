import { createFileRoute } from "@tanstack/react-router";
import { Settings, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Config = {
  id?: string;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  correo: string | null;
  sitio_web: string | null;
  direccion: string | null;
  moneda_principal: "NIO" | "USD";
  impuesto_porcentaje: number;
  tipo_cambio: number;
  terminos_contrato: string | null;
  logo_url: string | null;
};

function Page() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Config | null>(null);

  const q = useQuery({
    queryKey: ["configuracion_empresa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracion_empresa")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { nombre: "TM RENT A CAR", moneda_principal: "NIO", impuesto_porcentaje: 15, tipo_cambio: 36.5 }) as Config;
    },
  });

  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);

  const m = useMutation({
    mutationFn: async (v: Config) => {
      const { error } = await supabase.from("configuracion_empresa").upsert(v as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuración guardada");
      queryClient.invalidateQueries({ queryKey: ["configuracion_empresa"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!form) {
    return <div className="grid h-64 place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setForm((f) => f ? { ...f, [k]: v } : f);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Settings className="size-6 text-gold" /> Configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Datos de la empresa, moneda principal y términos de contrato.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la empresa</CardTitle>
            <CardDescription>Información mostrada en contratos y reportes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs">Nombre</Label>
              <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs">RUC</Label>
                <Input value={form.ruc ?? ""} onChange={(e) => set("ruc", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Teléfono</Label>
                <Input value={form.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs">Correo</Label>
                <Input type="email" value={form.correo ?? ""} onChange={(e) => set("correo", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Sitio web</Label>
                <Input value={form.sitio_web ?? ""} onChange={(e) => set("sitio_web", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Dirección</Label>
              <Input value={form.direccion ?? ""} onChange={(e) => set("direccion", e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Logo (URL)</Label>
              <Input value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operación</CardTitle>
            <CardDescription>Moneda principal, impuestos y términos legales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs">Moneda principal</Label>
                <Select value={form.moneda_principal} onValueChange={(v) => set("moneda_principal", v as "NIO" | "USD")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NIO">Córdobas (NIO)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Tipo de cambio (1 USD = ? NIO)</Label>
                <Input
                  type="number" step="0.01" min="0.01" value={form.tipo_cambio}
                  onChange={(e) => set("tipo_cambio", Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Impuesto %</Label>
              <Input
                type="number" step="0.01" value={form.impuesto_porcentaje}
                onChange={(e) => set("impuesto_porcentaje", Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Términos del contrato</Label>
              <Textarea
                value={form.terminos_contrato ?? ""}
                onChange={(e) => set("terminos_contrato", e.target.value)}
                rows={10}
                placeholder="Cláusulas que se imprimirán en cada contrato..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => m.mutate(form)} disabled={m.isPending}>
          {m.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({ meta: [{ title: "Configuración — TM RENT A CAR" }] }),
  component: Page,
});