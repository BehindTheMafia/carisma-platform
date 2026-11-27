import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { differenceInCalendarDays, addDays } from "date-fns";
import { logRentaEvent } from "@/lib/renta-log";
import { formatCurrency, type Moneda } from "@/lib/format";

type ClienteOption = { id: string; nombre: string; documento: string };
type VehiculoOption = { id: string; codigo: string; placa: string; marca: string; modelo: string; estado: string; tarifa_diaria: number; clasificacion: string; costo_subarriendo: number };
type RentaOcupada = { id: string; folio: string; fecha_inicio: string; fecha_devolucion: string };

export type RentaFormData = {
  cliente_id: string;
  vehiculo_id: string;
  fecha_inicio: string;
  fecha_devolucion: string;
  dias: number;
  tarifa: number;
  tarifa_subarriendo: number;
  moneda: "NIO" | "USD";
  deposito: number;
  descuento: number;
  estado: "cotizacion" | "reservada" | "activa" | "finalizada" | "cancelada";
  observaciones: string;
};

interface RentaFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (rentaId: string) => void;
  defaultClienteId?: string;
  rentaId?: string;
}

const emptyForm: RentaFormData = {
  cliente_id: "",
  vehiculo_id: "",
  fecha_inicio: new Date().toISOString().slice(0, 10),
  fecha_devolucion: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  dias: 1,
  tarifa: 0,
  tarifa_subarriendo: 0,
  moneda: "NIO",
  deposito: 0,
  descuento: 0,
  estado: "reservada",
  observaciones: "",
};

export function RentaForm({ open, onClose, onSuccess, defaultClienteId, rentaId }: RentaFormProps) {
  const [form, setForm] = useState<RentaFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editVehiculo, setEditVehiculo] = useState<VehiculoOption | null>(null);
  const prevVehiculoId = useRef("");

  const isEdit = !!rentaId;
  const reservaVehiculo = form.estado === "reservada" || form.estado === "activa";
  const fechasValidas = !!form.fecha_inicio && !!form.fecha_devolucion && form.fecha_devolucion > form.fecha_inicio;

  const toDateInput = (iso: string): string => {
    // Use UTC methods to avoid local timezone shifting the date
    const d = new Date(iso);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const dateInputFromDate = (d: Date): string => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleDiasChange = (value: string) => {
    if (value === "") {
      setForm((prev) => ({ ...prev, dias: 0 }));
      return;
    }
    const n = Math.max(1, Math.floor(Number(value)));
    const inicio = form.fecha_inicio ? new Date(form.fecha_inicio) : null;
    setForm((prev) => ({
      ...prev,
      dias: n,
      // 1 día desde 12/07 → 13/07 | 15 días desde 25/06 → 10/07
      fecha_devolucion: inicio ? dateInputFromDate(addDays(inicio, n)) : prev.fecha_devolucion,
    }));
  };

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-renta-form"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nombre, documento")
        .is("deleted_at", null)
        .order("nombre");
      return (data ?? []) as ClienteOption[];
    },
    enabled: open,
  });

  const { data: vehiculos = [] } = useQuery({
    queryKey: ["vehiculos-renta-form"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehiculos")
        .select("id, codigo, placa, marca, modelo, estado, tarifa_diaria, clasificacion, costo_subarriendo")
        .is("deleted_at", null)
        .in("estado", ["disponible", "reservado", "rentado"])
        .order("marca");
      return (data ?? []) as VehiculoOption[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      prevVehiculoId.current = "";
      setForm({
        ...emptyForm,
        cliente_id: defaultClienteId ?? "",
      });
      setEditVehiculo(null);
      setLoadingEdit(false);
    }
  }, [open, defaultClienteId]);

  useEffect(() => {
    if (!open || !rentaId) return;
    setLoadingEdit(true);
    supabase
      .from("rentas")
      .select(
        "cliente_id, vehiculo_id, fecha_inicio, fecha_devolucion, dias, tarifa, tarifa_subarriendo, moneda, deposito, descuento, estado, observaciones, vehiculos(tarifa_diaria, clasificacion, costo_subarriendo, codigo, placa, marca, modelo, estado)",
      )
      .eq("id", rentaId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("No se pudo cargar la renta");
          setLoadingEdit(false);
          return;
        }
        const v = data.vehiculos as unknown as {
          tarifa_diaria: number;
          clasificacion: string;
          costo_subarriendo: number;
          codigo: string;
          placa: string;
          marca: string;
          modelo: string;
          estado: string;
        } | null;
        // Mark vehiculo as already processed so the vehicle-change effect
        // does NOT fire and overwrite the saved tarifa with the vehicle's
        // current tarifa_diaria (which may differ from what was agreed at
        // the time the renta was created).
        prevVehiculoId.current = data.vehiculo_id;
        setForm((prev) => ({
          ...prev,
          cliente_id: data.cliente_id,
          vehiculo_id: data.vehiculo_id,
          fecha_inicio: toDateInput(data.fecha_inicio),
          fecha_devolucion: toDateInput(data.fecha_devolucion),
          dias: data.dias,
          tarifa: data.tarifa,
          tarifa_subarriendo: data.tarifa_subarriendo,
          moneda: data.moneda,
          deposito: data.deposito,
          descuento: data.descuento,
          estado: data.estado,
          observaciones: data.observaciones ?? "",
        }));
        if (v) {
          setEditVehiculo({
            id: data.vehiculo_id,
            codigo: v.codigo,
            placa: v.placa,
            marca: v.marca,
            modelo: v.modelo,
            estado: v.estado,
            tarifa_diaria: v.tarifa_diaria,
            clasificacion: v.clasificacion,
            costo_subarriendo: v.costo_subarriendo,
          });
        }
        setLoadingEdit(false);
      });
  }, [open, rentaId]);

  useEffect(() => {
    const d1 = form.fecha_inicio ? new Date(form.fecha_inicio) : null;
    const d2 = form.fecha_devolucion ? new Date(form.fecha_devolucion) : null;
    if (d1 && d2 && d2 >= d1) {
      // 12 jul a 13 jul = 1 día | 25 jun a 10 jul = 15 días
      const diff = differenceInCalendarDays(d2, d1);
      setForm((prev) => ({ ...prev, dias: Math.max(1, diff) }));
    }
  }, [form.fecha_inicio, form.fecha_devolucion]);

  const allVehiculos = useMemo(() => {
    if (!editVehiculo) return vehiculos;
    return vehiculos.some((v) => v.id === editVehiculo.id) ? vehiculos : [...vehiculos, editVehiculo];
  }, [vehiculos, editVehiculo]);

  const disponibilidad = useQuery({
    queryKey: ["disponibilidad-renta", form.vehiculo_id, form.fecha_inicio, form.fecha_devolucion, rentaId],
    queryFn: async (): Promise<RentaOcupada | null> => {
      let query = supabase.from("rentas")
        .select("id, folio, fecha_inicio, fecha_devolucion")
        .eq("vehiculo_id", form.vehiculo_id)
        .is("deleted_at", null)
        .in("estado", ["reservada", "activa"])
        .lt("fecha_inicio", form.fecha_devolucion)
        .gt("fecha_devolucion", form.fecha_inicio)
        .limit(1);
      if (rentaId) query = query.neq("id", rentaId);
      const { data, error } = await query;
      if (error) throw error;
      return (data?.[0] as RentaOcupada | undefined) ?? null;
    },
    enabled: open && !!form.vehiculo_id && fechasValidas && reservaVehiculo,
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (!form.vehiculo_id || prevVehiculoId.current === form.vehiculo_id) return;
    prevVehiculoId.current = form.vehiculo_id;
    const v = allVehiculos.find((x) => x.id === form.vehiculo_id);
    if (!v) return;
    setForm((prev) => {
      const next = { ...prev };
      if (v.tarifa_diaria > 0) next.tarifa = v.tarifa_diaria;
      if (v.clasificacion === "subrentado") next.tarifa_subarriendo = v.costo_subarriendo;
      return next;
    });
  }, [form.vehiculo_id, allVehiculos]);

  const update = (field: keyof RentaFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.cliente_id) { toast.error("Seleccioná un cliente"); return; }
    if (!form.vehiculo_id) { toast.error("Seleccioná un vehículo"); return; }
    if (!form.fecha_inicio || !form.fecha_devolucion) { toast.error("Completá las fechas"); return; }
    if (!fechasValidas) { toast.error("La devolución debe ser posterior al inicio"); return; }
    if (reservaVehiculo) {
      const { data: ocupada, error: disponibilidadError } = await disponibilidad.refetch();
      if (disponibilidadError) { toast.error("No se pudo comprobar la disponibilidad. Intentá de nuevo."); return; }
      if (ocupada) { toast.error(`El vehículo ya tiene la renta ${ocupada.folio} en esas fechas`); return; }
    }

    const subtotal = form.dias * form.tarifa;
    // Depósito is a separate guarantee field, not added to the rental total
    const total = subtotal - form.descuento;

    const payload = {
      cliente_id: form.cliente_id,
      vehiculo_id: form.vehiculo_id,
      // Store as YYYY-MM-DD strings to avoid UTC offset shifting the date
      fecha_inicio: form.fecha_inicio,
      fecha_devolucion: form.fecha_devolucion,
      dias: form.dias,
      tarifa: form.tarifa,
      tarifa_subarriendo: form.tarifa_subarriendo,
      subtotal,
      descuento: form.descuento,
      deposito: form.deposito,
      total,
      moneda: form.moneda,
      estado: form.estado,
      observaciones: form.observaciones || null,
    };

    setSaving(true);

    if (isEdit && rentaId) {
      const { error } = await supabase.from("rentas").update(payload).eq("id", rentaId);
      setSaving(false);
      if (error) {
        toast.error(`Error al actualizar renta: ${error.message}`);
        return;
      }
      await logRentaEvent(rentaId, "renta_editada", "Datos de la renta actualizados");
      toast.success("Renta actualizada exitosamente");
      onSuccess(rentaId);
      return;
    }

    const { data, error } = await supabase
      .from("rentas")
      .insert(payload)
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      toast.error(`Error al crear renta: ${error.message}`);
      return;
    }

    toast.success("Renta creada exitosamente");
    onSuccess(data!.id);
  };

  const clienteOptions = clientes.map((c) => ({
    value: c.id,
    label: `${c.nombre} (${c.documento})`,
  }));

  const vehiculoOptions = allVehiculos.map((v) => ({
    value: v.id,
    label: `${v.marca} ${v.modelo} — ${v.placa} (${v.estado === "rentado" ? "rentado actualmente" : v.estado === "reservado" ? "reservado" : "disponible"})`,
  }));

  const selectedVehiculo = allVehiculos.find((v) => v.id === form.vehiculo_id);
  const isSubrentado = selectedVehiculo?.clasificacion === "subrentado";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Renta" : "Nueva Renta"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Cliente</Label>
            <Combobox
              options={clienteOptions}
              value={form.cliente_id}
              onSelect={(v) => update("cliente_id", v)}
              placeholder="Buscar cliente..."
              searchPlaceholder="Buscar por nombre o documento..."
              emptyText="Sin resultados"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Vehículo</Label>
            <Combobox
              options={vehiculoOptions}
              value={form.vehiculo_id}
              onSelect={(v) => update("vehiculo_id", v)}
              placeholder="Buscar vehículo..."
              searchPlaceholder="Buscar por marca, modelo o placa..."
              emptyText="Sin resultados"
            />
            {selectedVehiculo?.estado === "rentado" && (
              <p className="text-xs text-muted-foreground">Este vehículo está rentado ahora. Podés programar otra renta para fechas posteriores si no se cruzan.</p>
            )}
            {reservaVehiculo && form.vehiculo_id && fechasValidas && disponibilidad.isPending && (
              <p className="text-xs text-muted-foreground" role="status">Comprobando disponibilidad...</p>
            )}
            {reservaVehiculo && form.vehiculo_id && fechasValidas && disponibilidad.isError && (
              <p className="text-xs text-destructive" role="alert">No se pudo consultar la disponibilidad. Intentá de nuevo.</p>
            )}
            {reservaVehiculo && disponibilidad.data && (
              <p className="text-xs text-destructive" role="alert">
                No disponible: renta {disponibilidad.data.folio} del {toDateInput(disponibilidad.data.fecha_inicio)} al {toDateInput(disponibilidad.data.fecha_devolucion)}. Elegí otras fechas.
              </p>
            )}
            {isSubrentado && (
              <p className="rounded-md border border-gold/30 bg-gold/10 px-2.5 py-1.5 text-xs">
                Vehículo <span className="font-medium">subrentado</span> — Tarifa diaria:{" "}
                <span className="font-semibold">{formatCurrency(selectedVehiculo.tarifa_diaria, form.moneda)}</span>
              </p>
            )}
          </div>

          {isSubrentado && (
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Tarifa subrenta (diaria)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={form.tarifa_subarriendo || ""}
                onChange={(e) => update("tarifa_subarriendo", Number(e.target.value))}
                placeholder="Costo diario pagado al dueño del vehículo"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Fecha inicio</Label>
            <Input
              type="date"
              value={form.fecha_inicio}
              onChange={(e) => update("fecha_inicio", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fecha devolución</Label>
            <Input
              type="date"
              value={form.fecha_devolucion}
              onChange={(e) => update("fecha_devolucion", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Días</Label>
            <Input
              type="number"
              min={1}
              value={form.dias || ""}
              onChange={(e) => handleDiasChange(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tarifa diaria</Label>
            <Input
              type="number"
              step="0.01"
              value={form.tarifa || ""}
              onChange={(e) => update("tarifa", Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={form.moneda} onValueChange={(v) => update("moneda", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NIO">NIO (Córdobas)</SelectItem>
                <SelectItem value="USD">USD (Dólares)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Depósito</Label>
            <Input
              type="number"
              step="0.01"
              value={form.deposito || ""}
              onChange={(e) => update("deposito", Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descuento</Label>
            <Input
              type="number"
              step="0.01"
              value={form.descuento || ""}
              onChange={(e) => update("descuento", Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={form.estado} onValueChange={(v) => update("estado", v as RentaFormData["estado"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cotizacion">Cotización</SelectItem>
                <SelectItem value="reservada">Reservada</SelectItem>
                <SelectItem value="activa">Activa</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea
              value={form.observaciones}
              onChange={(e) => update("observaciones", e.target.value)}
              rows={3}
              placeholder="Notas adicionales..."
            />
          </div>

          {form.cliente_id && form.vehiculo_id && form.dias > 0 && (
            <div className="sm:col-span-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <span className="text-muted-foreground">Subtotal: </span>
              <span className="font-medium">
                {(form.dias * form.tarifa).toLocaleString("es-NI", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-muted-foreground mx-2">|</span>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold">
                {(form.dias * form.tarifa - form.descuento).toLocaleString("es-NI", { minimumFractionDigits: 2 })}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">{form.moneda}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loadingEdit || (reservaVehiculo && !!form.vehiculo_id && fechasValidas && (disponibilidad.isPending || disponibilidad.isError || !!disponibilidad.data))}>
            {(saving || loadingEdit) && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            {isEdit ? "Guardar Cambios" : "Crear Renta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
