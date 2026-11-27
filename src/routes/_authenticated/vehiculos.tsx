import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { VEHICLE_TYPE_OPTIONS, TRUCK_TONNAGE_OPTIONS, getTruckStorageType, getTruckTonnage, getVehicleTypeLabel } from "@/lib/vehicle-types";
import { motion } from "framer-motion";
import {
  Car,
  Plus,
  Search,
  RotateCcw,
  LayoutGrid,
  List,
  Download,
  Fuel,
  Gauge,
  TrendingUp,
  Settings2,
  CheckCircle2,
  Camera,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm, type FieldValues } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, type Moneda } from "@/lib/format";
import { ALL_ACCESORIOS } from "@/constants/accesorios";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GOLD = "#C89B3C";
const BLUE = "#2563EB";
const GREEN = "#22C55E";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const PURPLE = "#8B5CF6";

type Vehiculo = {
  id: string;
  codigo: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string | null;
  tipo_vehiculo: string | null;
  estado: string;
  tarifa_diaria: number;
  tarifa_semanal: number;
  tarifa_mensual: number;
  moneda: Moneda;
  kilometraje: number;
  clasificacion: string;
  transmision: string | null;
  combustible: string | null;
  capacidad: number | null;
  costo_subarriendo: number;
  costo_subarriendo_semanal: number;
  costo_subarriendo_mensual: number;
  accesorios: string[] | null;
  fotos: { id: string; path: string; url: string; name: string }[];
};

type ViewMode = "grid" | "table";

function exportVehiculosExcel(vehicles: Vehiculo[]) {
  const data = vehicles.map((v) => ({
    Código: v.codigo ?? "",
    Placa: v.placa ?? "",
    Marca: v.marca ?? "",
    Modelo: v.modelo ?? "",
    Año: v.anio ?? "",
    Color: v.color ?? "",
    Tipo: getVehicleTypeLabel(v.tipo_vehiculo),
    Clasificación: v.clasificacion ?? "",
    Transmisión: v.transmision ?? "",
    Combustible: v.combustible ?? "",
    Capacidad: v.capacidad ?? "",
    Estado: STATUS_COLORS[v.estado]?.label ?? v.estado,
    "Tarifa Diaria": v.tarifa_diaria ?? 0,
    Moneda: v.moneda ?? "",
    Kilometraje: v.kilometraje ?? 0,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vehículos");
  XLSX.writeFile(wb, `vehiculos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const STATUS_COLORS: Record<string, { dot: string; bg: string; label: string }> = {
  disponible: {
    dot: GREEN,
    bg: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
    label: "Disponible",
  },
  rentado: {
    dot: BLUE,
    bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    label: "Rentado",
  },
  reservado: {
    dot: PURPLE,
    bg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    label: "Reservado",
  },
  mantenimiento: {
    dot: AMBER,
    bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    label: "Mantenimiento",
  },
  fuera_servicio: {
    dot: RED,
    bg: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    label: "Fuera de servicio",
  },
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 56;
  const h = 20;
  const pts = data
    .map(
      (v, i) =>
        `${((i / (data.length - 1)) * w).toFixed(0)},${(h - ((v - min) / range) * (h - 3) - 1).toFixed(0)}`,
    )
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
  sparkline,
  className = "",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  trend?: { value: string; up: boolean };
  sparkline?: number[];
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-2xl border border-[#E5E7EB]/80 dark:border-[#1F2937]/80 bg-white dark:bg-[#0F0F1A] p-4 transition-shadow duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] ${className}`}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-[var(--kpi-color)]/5 to-transparent opacity-60 dark:opacity-30"
        style={{ "--kpi-color": color } as React.CSSProperties}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
              {label}
            </p>
            <p className="text-xl font-bold tracking-tight text-[#111827] dark:text-white tabular-nums">
              {value}
            </p>
          </div>
          <div
            className="grid size-9 shrink-0 place-items-center rounded-xl"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="size-4.5" style={{ color }} />
          </div>
        </div>
        {(trend || sparkline) && (
          <div className="mt-2 flex items-center gap-1.5">
            {trend && (
              <>
                {trend.up ? (
                  <TrendingUp className="size-3 text-green-500" />
                ) : (
                  <TrendingDown className="size-3 text-red-500" />
                )}
                <span
                  className={`text-[10px] font-medium ${trend.up ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {trend.value}
                </span>
              </>
            )}
            {sparkline && <MiniSparkline data={sparkline} color={color} />}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TrendingDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}

const FORM_FIELDS: Array<{
  name: string;
  label: string;
  type: string;
  required?: boolean;
  span?: number;
  defaultValue?: unknown;
  step?: string;
  options?: Array<{ value: string; label: string }>;
  showWhen?: (values: Record<string, unknown>) => boolean;
}> = [
  { name: "codigo", label: "Código interno", type: "text", required: true, span: 1 },
  { name: "placa", label: "Placa", type: "text", required: true, span: 1 },
  { name: "marca", label: "Marca", type: "text", required: true, span: 1 },
  { name: "modelo", label: "Modelo", type: "text", required: true, span: 1 },
  {
    name: "anio",
    label: "Año",
    type: "number",
    required: true,
    defaultValue: new Date().getFullYear(),
    span: 1,
  },
  { name: "color", label: "Color", type: "text", span: 1 },
  { name: "vin", label: "VIN / Chasis", type: "text", span: 1 },
  {
    name: "tipo_vehiculo",
    label: "Tipo",
    type: "select",
    defaultValue: "sedan",
    options: VEHICLE_TYPE_OPTIONS,
    span: 1,
  },
  {
    name: "toneladas",
    label: "Capacidad de carga",
    type: "select",
    options: TRUCK_TONNAGE_OPTIONS,
    required: true,
    span: 1,
    showWhen: (v) => v.tipo_vehiculo === "camion",
  },
  {
    name: "clasificacion",
    label: "Clasificación",
    type: "select",
    defaultValue: "propio",
    options: [
      { value: "propio", label: "Propio" },
      { value: "subrentado", label: "Subrentado" },
    ],
    span: 1,
  },
  {
    name: "transmision",
    label: "Transmisión",
    type: "select",
    options: [
      { value: "manual", label: "Manual" },
      { value: "automatica", label: "Automática" },
    ],
    span: 1,
  },
  {
    name: "combustible",
    label: "Combustible",
    type: "select",
    options: [
      { value: "gasolina", label: "Gasolina" },
      { value: "diesel", label: "Diésel" },
      { value: "hibrido", label: "Híbrido" },
      { value: "electrico", label: "Eléctrico" },
      { value: "gas", label: "Gas" },
    ],
    span: 1,
  },
  { name: "capacidad", label: "Capacidad (pasajeros)", type: "number", span: 1 },
  { name: "kilometraje", label: "Kilometraje", type: "number", defaultValue: 0, span: 1 },
  {
    name: "estado",
    label: "Estado",
    type: "select",
    defaultValue: "disponible",
    options: [
      { value: "disponible", label: "Disponible" },
      { value: "rentado", label: "Rentado" },
      { value: "reservado", label: "Reservado" },
      { value: "mantenimiento", label: "Mantenimiento" },
      { value: "fuera_servicio", label: "Fuera de servicio" },
    ],
    span: 1,
  },
  {
    name: "moneda",
    label: "Moneda",
    type: "select",
    defaultValue: "NIO",
    options: [
      { value: "NIO", label: "Córdobas (NIO)" },
      { value: "USD", label: "Dólares (USD)" },
    ],
    span: 1,
  },
  {
    name: "tarifa_diaria",
    label: "Tarifa diaria",
    type: "number",
    step: "0.01",
    defaultValue: 0,
    span: 1,
  },
  {
    name: "tarifa_semanal",
    label: "Tarifa semanal",
    type: "number",
    step: "0.01",
    defaultValue: 0,
    span: 1,
  },
  {
    name: "tarifa_mensual",
    label: "Tarifa mensual",
    type: "number",
    step: "0.01",
    defaultValue: 0,
    span: 1,
  },
  {
    name: "costo_subarriendo",
    label: "Costo subarriendo (diario)",
    type: "number",
    step: "0.01",
    defaultValue: 0,
    span: 1,
    required: true,
    showWhen: (v) => v.clasificacion === "subrentado",
  },
  {
    name: "costo_subarriendo_semanal",
    label: "Costo subarriendo (semanal)",
    type: "number",
    step: "0.01",
    defaultValue: 0,
    span: 1,
    showWhen: (v) => v.clasificacion === "subrentado",
  },
  {
    name: "costo_subarriendo_mensual",
    label: "Costo subarriendo (mensual)",
    type: "number",
    step: "0.01",
    defaultValue: 0,
    span: 1,
    showWhen: (v) => v.clasificacion === "subrentado",
  },
  {
    name: "deposito",
    label: "Depósito sugerido",
    type: "number",
    step: "0.01",
    defaultValue: 0,
    span: 1,
  },
  { name: "seguro_vencimiento", label: "Vence seguro", type: "date", span: 1 },
  { name: "circulacion_vencimiento", label: "Vence circulación", type: "date", span: 1 },
  { name: "notas", label: "Notas", type: "textarea", span: 2 },
  { name: "fotos", label: "Fotos", type: "images", span: 2 },
  { name: "accesorios", label: "Accesorios incluidos", type: "checkboxes", span: 2, defaultValue: [] },
];

function VehicleForm({
  initial,
  onCancel,
  onSubmit,
  submitting,
}: {
  initial: Record<string, unknown> | null;
  onCancel: () => void;
  onSubmit: (v: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const defaults = useMemo(() => {
    const base: Record<string, unknown> = {};
    for (const f of FORM_FIELDS) {
      const v = initial?.[f.name];
      if (v !== undefined && v !== null) {
        if (f.type === "date" && typeof v === "string") base[f.name] = v.slice(0, 10);
        else base[f.name] = v;
      } else if (f.defaultValue !== undefined) base[f.name] = f.defaultValue;
      else if (f.type === "images") base[f.name] = [];
      else base[f.name] = "";
    }
    const truckTonnage = getTruckTonnage(initial?.tipo_vehiculo as string | null);
    if (truckTonnage) {
      base.tipo_vehiculo = "camion";
      base.toneladas = String(truckTonnage);
    }
    return base;
  }, [initial]);

  const form = useForm<FieldValues>({ defaultValues: defaults });
  const watchedValues = form.watch();
  const isSubrentado = watchedValues.clasificacion === "subrentado";

  const visibleFields = useMemo(
    () => FORM_FIELDS.filter((f) => !f.showWhen || f.showWhen(watchedValues)),
    [watchedValues.clasificacion, watchedValues.tipo_vehiculo],
  );

  function submit(v: FieldValues) {
    const out: Record<string, unknown> = {};
    for (const f of FORM_FIELDS) {
      if (f.name === "toneladas") continue;
      let val = v[f.name];
      if (val === "" || val === undefined) val = null;
      if (f.required && !f.name.startsWith("tarifa_") && (val === null || val === "")) {
        toast.error(`${f.label} es requerido`);
        return;
      }
      out[f.name] = val;
    }
    if (v.tipo_vehiculo === "camion") {
      const truckType = getTruckStorageType(v.toneladas as string);
      if (!truckType) {
        toast.error("Seleccioná la capacidad del camión: 2, 3, 5 u 8 toneladas.");
        return;
      }
      out.tipo_vehiculo = truckType;
    }

    if (isSubrentado) {
      const costoDiario = Number(out.costo_subarriendo ?? 0);
      const tarifaDiaria = Number(out.tarifa_diaria ?? 0);
      if (tarifaDiaria < costoDiario) {
        toast.error("La tarifa diaria no puede ser menor al costo de subarriendo");
        return;
      }
    }

    onSubmit(out);
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visibleFields.map((f) => (
          <div key={f.name} className={f.span === 2 ? "md:col-span-2" : ""}>
            <Label className="mb-1.5 block text-xs font-medium text-[#111827] dark:text-white">
              {f.label}
              {f.required ? <span className="text-red-500"> *</span> : null}
            </Label>
            {f.type === "textarea" ? (
              <Textarea
                value={(form.watch(f.name) as string) ?? ""}
                onChange={(e) => form.setValue(f.name, e.target.value, { shouldDirty: true })}
                rows={3}
                className="border-[#E5E7EB]/70 dark:border-[#1F2937]/70 rounded-lg text-xs"
              />
            ) : f.type === "select" ? (
              <Select
                value={(form.watch(f.name) as string) ?? ""}
                onValueChange={(v) => form.setValue(f.name, v, { shouldDirty: true })}
              >
                <SelectTrigger className="h-9 border-[#E5E7EB]/70 dark:border-[#1F2937]/70 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.options?.map((o: { value: string; label: string }) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : f.type === "images" ? (
              <ImageUpload
                value={
                  (Array.isArray(form.watch(f.name)) ? form.watch(f.name) : []) as {
                    id: string;
                    path: string;
                    url: string;
                    name: string;
                  }[]
                }
                onChange={(v: unknown) => form.setValue(f.name, v, { shouldDirty: true })}
              />
            ) : f.type === "checkboxes" ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {ALL_ACCESORIOS.map(({ key, label }) => {
                  const vals = (form.watch(f.name) as string[]) ?? [];
                  return (
                    <label key={key} className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                      <input
                        type="checkbox"
                        checked={vals.includes(key)}
                        onChange={(e) => {
                          const current = (form.watch(f.name) as string[]) ?? [];
                          if (e.target.checked) {
                            form.setValue(f.name, [...current, key], { shouldDirty: true });
                          } else {
                            form.setValue(f.name, current.filter((k) => k !== key), { shouldDirty: true });
                          }
                        }}
                        className="size-3.5 rounded border-muted-foreground/30 text-primary focus:ring-primary"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            ) : (
              <Input
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                step={f.step}
                value={(form.watch(f.name) as string | number) ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (f.type === "number")
                    form.setValue(f.name, val === "" ? null : Number(val), { shouldDirty: true });
                  else form.setValue(f.name, val === "" ? null : val, { shouldDirty: true });
                }}
                className="h-9 border-[#E5E7EB]/70 dark:border-[#1F2937]/70 rounded-lg text-xs"
              />
            )}
          </div>
        ))}
      </div>
      <DialogFooter className="gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="bg-[#111827] text-white hover:bg-[#1F2937] dark:bg-white dark:text-[#111827]"
        >
          {submitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "disponible", label: "Disponible" },
  { value: "rentado", label: "Rentado" },
  { value: "reservado", label: "Reservado" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "fuera_servicio", label: "Fuera de servicio" },
];

const sortOptions = [
  { value: "newest", label: "Más recientes" },
  { value: "oldest", label: "Más antiguos" },
  { value: "price_desc", label: "Tarifa: mayor a menor" },
  { value: "price_asc", label: "Tarifa: menor a mayor" },
  { value: "mileage_desc", label: "Kilometraje: mayor" },
  { value: "mileage_asc", label: "Kilometraje: menor" },
  { value: "alpha", label: "A-Z" },
];

function Page() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [editing, setEditing] = useState<Vehiculo | null | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<Vehiculo | null>(null);

  const vehiclesQ = useQuery({
    queryKey: ["vehiculos-fleet", search, statusFilter, sortBy],
    queryFn: async () => {
      let q = supabase
        .from("vehiculos")
        .select(
          "id, codigo, placa, marca, modelo, anio, color, tipo_vehiculo, estado, tarifa_diaria, tarifa_semanal, tarifa_mensual, moneda, kilometraje, clasificacion, transmision, combustible, capacidad, costo_subarriendo, costo_subarriendo_semanal, costo_subarriendo_mensual, deposito, seguro_vencimiento, circulacion_vencimiento, vin, notas, accesorios, fotos",
        )
        .is("deleted_at", null);

      if (search) {
        const term = `%${search}%`;
        q = q.or(
          `codigo.ilike.${term},placa.ilike.${term},marca.ilike.${term},modelo.ilike.${term}`,
        );
      }
      if (statusFilter)
        q = q.eq(
          "estado",
          statusFilter as
            "disponible" | "rentado" | "reservado" | "mantenimiento" | "fuera_servicio",
        );

      switch (sortBy) {
        case "oldest":
          q = q.order("created_at", { ascending: true });
          break;
        case "price_desc":
          q = q.order("tarifa_diaria", { ascending: false });
          break;
        case "price_asc":
          q = q.order("tarifa_diaria", { ascending: true });
          break;
        case "mileage_desc":
          q = q.order("kilometraje", { ascending: false });
          break;
        case "mileage_asc":
          q = q.order("kilometraje", { ascending: true });
          break;
        case "alpha":
          q = q.order("marca", { ascending: true }).order("modelo", { ascending: true });
          break;
        default:
          q = q.order("created_at", { ascending: false });
      }

      const { data, error } = await q;
      if (error) throw error as Error;
      return (data ?? []) as unknown as Vehiculo[];
    },
  });

  const upsertM = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (editing && editing.id) {
        const { error } = await supabase
          .from("vehiculos")
          .update(values as never)
          .eq("id", editing.id);
        if (error) throw error as Error;
      } else {
        const { error } = await supabase.from("vehiculos").insert(values as never);
        if (error) throw error as Error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Vehículo actualizado" : "Vehículo creado");
      setEditing(undefined);
      queryClient.invalidateQueries({ queryKey: ["vehiculos-fleet"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { data: active, error: lookupError } = await supabase.from("rentas")
        .select("id").eq("vehiculo_id", id).in("estado", ["activa", "reservada"])
        .is("deleted_at", null).limit(1);
      if (lookupError) throw lookupError;
      if (active?.length) throw new Error("El vehículo tiene una renta activa o reservada. Cerrá esa renta antes de eliminarlo.");
      const { error } = await supabase.from("vehiculos")
        .update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null)
        .select("id").single();
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["vehiculos-fleet"] });
      queryClient.invalidateQueries({ queryKey: ["options"] });
      queryClient.invalidateQueries({ queryKey: ["reportes-summary-v2"] });
      toast.success("Vehículo eliminado de la flota; sus rentas anteriores se conservan.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const vehicles = useMemo(() => vehiclesQ.data ?? [], [vehiclesQ.data]);
  const isLoading = vehiclesQ.isLoading;

  const stats = useMemo(() => {
    const total = vehicles.length;
    const disponibles = vehicles.filter((v) => v.estado === "disponible").length;
    const rentados = vehicles.filter((v) => v.estado === "rentado").length;
    const mantenimiento = vehicles.filter((v) => v.estado === "mantenimiento").length;
    const reservados = vehicles.filter((v) => v.estado === "reservado").length;
    const avgRate = total > 0 ? vehicles.reduce((s, v) => s + v.tarifa_diaria, 0) / total : 0;
    const occupancy = total > 0 ? Math.round((rentados / total) * 100) : 0;
    const sparklineGen = () => Array.from({ length: 7 }, () => Math.floor(Math.random() * 5) + 1);
    return {
      total,
      disponibles,
      rentados,
      mantenimiento,
      reservados,
      avgRate,
      occupancy,
      sparkline: sparklineGen(),
    };
  }, [vehicles]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827] dark:text-white">
            Flota
          </h1>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Administra disponibilidad, tarifas, mantenimiento y rendimiento de vehículos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg text-[#6B7280] hover:text-[#111827] dark:hover:text-white"
            onClick={() => vehiclesQ.refetch()}
          >
            <RotateCcw className={`size-4 ${vehiclesQ.isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg text-[#6B7280] hover:text-[#111827] dark:hover:text-white"
            onClick={() => exportVehiculosExcel(vehicles)}
          >
            <Download className="size-4" />
          </Button>
          <Button
            onClick={() => setEditing(null)}
            className="bg-[#111827] text-white hover:bg-[#1F2937] dark:bg-white dark:text-[#111827] dark:hover:bg-[#E5E7EB]"
          >
            <Plus className="size-4 mr-1.5" /> Agregar Vehículo
          </Button>
        </div>
      </motion.div>

      {/* KPI Summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="grid gap-3 sm:grid-cols-2"
      >
        {isLoading ? (
          <>
            {[1, 2].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <KpiCard
              label="Total Vehículos"
              value={String(stats.total)}
              icon={Car}
              color={GOLD}
              sparkline={stats.sparkline}
            />
            <KpiCard
              label="Disponibles"
              value={String(stats.disponibles)}
              icon={CheckCircle2}
              color={GREEN}
              className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-[#0F0F1A]"
              trend={{
                value: `${Math.round((stats.disponibles / Math.max(stats.total, 1)) * 100)}%`,
                up: true,
              }}
            />
          </>
        )}
      </motion.div>

      {/* Filters & Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="flex flex-wrap items-center gap-3"
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40 border-[#E5E7EB]/70 dark:border-[#1F2937]/70 bg-white dark:bg-[#0F0F1A] text-xs rounded-lg">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-9 w-44 border-[#E5E7EB]/70 dark:border-[#1F2937]/70 bg-white dark:bg-[#0F0F1A] text-xs rounded-lg">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center rounded-lg border border-[#E5E7EB]/70 dark:border-[#1F2937]/70 bg-white dark:bg-[#0F0F1A] p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-[#111827] text-white dark:bg-white dark:text-[#111827]" : "text-[#6B7280] hover:text-[#111827] dark:hover:text-white"}`}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`rounded-md p-1.5 transition-colors ${viewMode === "table" ? "bg-[#111827] text-white dark:bg-white dark:text-[#111827]" : "text-[#6B7280] hover:text-[#111827] dark:hover:text-white"}`}
          >
            <List className="size-4" />
          </button>
        </div>
        <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] ml-auto tabular-nums">
          {vehicles.length} vehicles
        </span>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border-border/50 overflow-hidden">
              <Skeleton className="h-44 w-full rounded-none" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && vehicles.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-4 grid size-20 place-items-center rounded-2xl bg-[#F3F4F6] dark:bg-[#1F2937]">
            <Car className="size-10 text-[#9CA3AF]" />
          </div>
          <h3 className="text-lg font-semibold text-[#111827] dark:text-white">
            No se encontraron vehículos
          </h3>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF] max-w-sm">
            {search || statusFilter
              ? "Ajusta los filtros o la búsqueda."
              : "Agrega tu primer vehículo a la flota."}
          </p>
          {!search && !statusFilter && (
            <Button
              onClick={() => setEditing(null)}
              className="mt-6 bg-[#111827] text-white hover:bg-[#1F2937] dark:bg-white dark:text-[#111827]"
            >
              <Plus className="size-4 mr-1.5" /> Add First Vehicle
            </Button>
          )}
        </motion.div>
      )}

      {/* Grid View */}
      {!isLoading && vehicles.length > 0 && viewMode === "grid" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {vehicles.map((v, i) => {
            const fotos = v.fotos as Vehiculo["fotos"] | null;
            const foto = fotos?.[0]?.url;
            const sc = STATUS_COLORS[v.estado] ?? STATUS_COLORS.fuera_servicio;
            const fuelLabel =
              v.combustible === "gasolina"
                ? "Gasolina"
                : v.combustible === "diesel"
                  ? "Diésel"
                  : v.combustible === "hibrido"
                    ? "Híbrido"
                    : v.combustible === "electrico"
                      ? "Eléctrico"
                      : (v.combustible ?? "");
            const tipoLabel = getVehicleTypeLabel(v.tipo_vehiculo);
            const transLabel =
              v.transmision === "manual"
                ? "Manual"
                : v.transmision === "automatica"
                  ? "Automática"
                  : (v.transmision ?? "");

            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 * i, ease: [0.25, 0.1, 0.25, 1] as const }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                onClick={() => setEditing(v)}
                className="group relative overflow-hidden rounded-2xl border border-[#E5E7EB]/80 dark:border-[#1F2937]/80 bg-white dark:bg-[#0F0F1A] transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] cursor-pointer"
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden bg-[#F3F4F6] dark:bg-[#1F2937]">
                  {foto ? (
                    <img
                      src={foto}
                      alt={`${v.marca} ${v.modelo}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Camera className="size-10 text-[#D1D5DB] dark:text-[#374151]" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 top-0 p-3">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium bg-white/90 dark:bg-[#1F2937]/90 backdrop-blur-sm border-0"
                      style={{ color: sc.dot }}
                    >
                      {sc.label}
                    </Badge>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent h-12" />
                  <div className="absolute bottom-3 left-3 text-white text-xs font-semibold drop-shadow-sm">
                    {v.codigo}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#111827] dark:text-white truncate">
                        {v.marca} {v.modelo}
                      </p>
                      <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                        {v.anio} · {v.placa}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-[#C89B3C] tabular-nums">
                      {formatCurrency(v.tarifa_diaria, v.moneda)}
                    </p>
                  </div>

                  {/* Specs */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">
                    {tipoLabel && (
                      <span className="flex items-center gap-1">
                        <Car className="size-3" /> {tipoLabel}
                      </span>
                    )}
                    {v.clasificacion && (
                      <span className="flex items-center gap-1">
                        <Car className="size-3" />{" "}
                        {v.clasificacion === "propio" ? "Propio" : "Subrentado"}
                      </span>
                    )}
                    {transLabel && (
                      <span className="flex items-center gap-1">
                        <Settings2 className="size-3" /> {transLabel}
                      </span>
                    )}
                    {fuelLabel && (
                      <span className="flex items-center gap-1">
                        <Fuel className="size-3" /> {fuelLabel}
                      </span>
                    )}
                    {v.kilometraje != null && (
                      <span className="flex items-center gap-1">
                        <Gauge className="size-3" /> {v.kilometraje.toLocaleString("es-NI")} km
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-3" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => setEditing(v)}><Pencil className="mr-1 size-3.5" /> Editar</Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirmDelete(v)}><Trash2 className="mr-1 size-3.5" /> Eliminar</Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Table View */}
      {!isLoading && vehicles.length > 0 && viewMode === "table" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-[#E5E7EB]/70 dark:border-[#1F2937]/70 bg-white dark:bg-[#0F0F1A]"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB]/70 dark:border-[#1F2937]/70 bg-[#F9FAFB] dark:bg-[#1A1A2E]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                  Vehículo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                  Placa
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                  Tarifa
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                  Kilometraje
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                  Trans.
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                  Combustible
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, i) => {
                const sc = STATUS_COLORS[v.estado] ?? STATUS_COLORS.fuera_servicio;
                return (
                  <motion.tr
                    key={v.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.02 * i }}
                    className="border-b border-[#E5E7EB]/50 dark:border-[#1F2937]/50 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#1A1A2E] cursor-pointer"
                    onClick={() => setEditing(v)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 shrink-0 rounded-lg bg-[#F3F4F6] dark:bg-[#1F2937] overflow-hidden">
                          {v.fotos?.[0]?.url ? (
                            <img
                              src={v.fotos[0].url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Car className="size-4 text-[#9CA3AF]" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#111827] dark:text-white">
                            {v.marca} {v.modelo}
                          </p>
                          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                            {v.anio} · {v.codigo}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF]">
                      {v.placa}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.bg}`}
                      >
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#C89B3C] tabular-nums">
                      {formatCurrency(v.tarifa_diaria, v.moneda)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                      {v.kilometraje?.toLocaleString("es-NI") ?? "—"} km
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280] dark:text-[#9CA3AF] capitalize">
                      {v.transmision ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280] dark:text-[#9CA3AF] capitalize">
                      {v.combustible ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Editar vehículo" onClick={() => setEditing(v)}><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon" title="Eliminar vehículo" className="text-destructive" onClick={() => setConfirmDelete(v)}><Trash2 className="size-4" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={editing !== undefined}
        onOpenChange={(o) => {
          if (!o) setEditing(undefined);
        }}
      >
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#111827] dark:text-white">
              {editing ? "Editar vehículo" : "Nuevo vehículo"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              {editing
                ? "Actualiza los datos del vehículo."
                : "Registra un nuevo vehículo en la flota."}
            </DialogDescription>
          </DialogHeader>
          {editing !== undefined && (
            <VehicleForm
              initial={editing ?? null}
              onCancel={() => setEditing(undefined)}
              onSubmit={(v) => upsertM.mutate(v)}
              submitting={upsertM.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {confirmDelete?.marca} {confirmDelete?.modelo}?</AlertDialogTitle>
            <AlertDialogDescription>El vehículo dejará de aparecer en la flota. Las rentas y documentos anteriores se conservarán.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleteM.isPending} className="bg-destructive text-destructive-foreground" onClick={() => confirmDelete && deleteM.mutate(confirmDelete.id)}>Eliminar vehículo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/vehiculos")({
  head: () => ({ meta: [{ title: "Flota — TM RENT A CAR" }] }),
  component: Page,
});
