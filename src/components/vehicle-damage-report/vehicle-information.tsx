import { useState } from "react";
import { INSPECTION_VEHICLE_TYPES, getInspectionVehicleType } from "@/lib/vehicle-types";
import { Car, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { UseFormReturn } from "react-hook-form";
import type { VehicleDamageFormValues } from "./schema";
import { Field, Section } from "./section";

interface Props {
  form: UseFormReturn<VehicleDamageFormValues>;
}

const TIPO_OPTIONS = INSPECTION_VEHICLE_TYPES;

type VehiculoRow = {
  id: string;
  codigo: string;
  placa: string;
  marca: string;
  modelo: string;
  color: string | null;
  tipo_vehiculo: string | null;
  kilometraje: number;
  combustible: string | null;
};

const COMBUSTIBLE_MAP: Record<string, "gasolina" | "diesel"> = {
  gasolina: "gasolina",
  diesel: "diesel",
  Gasolina: "gasolina",
  Diésel: "diesel",
};

export function VehicleInformation({ form }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const set = (key: keyof VehicleDamageFormValues["vehiculo"], value: string) =>
    form.setValue(`vehiculo.${key}`, value, { shouldDirty: true });

  const vehiculosQ = useQuery({
    queryKey: ["damage-report-vehiculos", search],
    queryFn: async () => {
      let q = supabase
        .from("vehiculos")
        .select("id, codigo, placa, marca, modelo, color, tipo_vehiculo, kilometraje, combustible")
        .is("deleted_at", null)
        .order("marca");
      if (search) {
        const term = `%${search}%`;
        q = q.or(`codigo.ilike.${term},placa.ilike.${term},marca.ilike.${term},modelo.ilike.${term}`);
      }
      q = q.limit(30);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VehiculoRow[];
    },
    enabled: open,
  });

  const selectedPlaca = form.watch("vehiculo.placa");
  const selectedMarca = form.watch("vehiculo.marca");
  const selectedLabel = selectedMarca && selectedPlaca
    ? `${selectedMarca} ${form.watch("vehiculo.modelo")} — ${selectedPlaca}`
    : "";

  function handleSelect(v: VehiculoRow) {
    set("tipoVehiculo", getInspectionVehicleType(v.tipo_vehiculo));
    set("marca", v.marca);
    set("modelo", v.modelo);
    set("placa", v.placa);
    set("color", v.color ?? "");
    set("combustible", COMBUSTIBLE_MAP[v.combustible ?? ""] ?? "");
    setOpen(false);
    setSearch("");
  }

  return (
    <Section
      icon={Car}
      title="Datos del Vehículo"
      subtitle="Selecciona un vehículo de la flota o ingresa los datos manualmente"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Buscar vehículo" className="md:col-span-2">
          <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                role="combobox"
                aria-expanded={open}
                className={cn(
                  "flex h-9 w-full items-center justify-between rounded-lg border border-border/70 bg-background px-3 text-xs",
                  "hover:bg-accent/50 transition-colors",
                  !selectedLabel && "text-muted-foreground"
                )}
              >
                {selectedLabel || "Seleccionar vehículo de la flota..."}
                <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar por código, placa, marca o modelo..."
                  value={search}
                  onValueChange={setSearch}
                  className="h-9 text-xs"
                />
                <CommandList>
                  {vehiculosQ.isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" /> Buscando...
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>No se encontraron vehículos.</CommandEmpty>
                      <CommandGroup>
                        {(vehiculosQ.data ?? []).map((v) => (
                          <CommandItem
                            key={v.id}
                            value={v.id}
                            onSelect={() => handleSelect(v)}
                            className="flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{v.marca} {v.modelo}</p>
                              <p className="text-muted-foreground truncate">
                                {v.codigo} · {v.placa}{v.color ? ` · ${v.color}` : ""}
                              </p>
                            </div>
                            <Check
                              className={cn(
                                "size-3.5 shrink-0",
                                selectedPlaca === v.placa ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </Field>

        <Field label="Tipo de vehículo" required>
          <Select
            value={form.watch("vehiculo.tipoVehiculo") ?? "SUV"}
            onValueChange={(v) => set("tipoVehiculo", v)}
          >
            <SelectTrigger className="h-9 rounded-lg border-border/70 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPO_OPTIONS.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Marca" required>
          <Input
            value={form.watch("vehiculo.marca")}
            onChange={(e) => set("marca", e.target.value)}
            placeholder="Marca del vehículo"
            className="h-9 rounded-lg border-border/70 text-xs"
          />
        </Field>
        <Field label="Modelo" required>
          <Input
            value={form.watch("vehiculo.modelo")}
            onChange={(e) => set("modelo", e.target.value)}
            placeholder="Modelo del vehículo"
            className="h-9 rounded-lg border-border/70 text-xs"
          />
        </Field>
        <Field label="Placa" required>
          <Input
            value={form.watch("vehiculo.placa")}
            onChange={(e) => set("placa", e.target.value)}
            placeholder="Nº de placa"
            className="h-9 rounded-lg border-border/70 text-xs uppercase"
          />
        </Field>
        <Field label="Color">
          <Input
            value={form.watch("vehiculo.color")}
            onChange={(e) => set("color", e.target.value)}
            placeholder="Color"
            className="h-9 rounded-lg border-border/70 text-xs"
          />
        </Field>
        <Field label="Tipo de combustible" required>
          <RadioGroup
            value={form.watch("vehiculo.combustible")}
            onValueChange={(v) => set("combustible", v)}
            className="flex h-9 items-center gap-6"
          >
            <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
              <RadioGroupItem value="gasolina" />
              Gasolina
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
              <RadioGroupItem value="diesel" />
              Diésel
            </label>
          </RadioGroup>
        </Field>
      </div>
    </Section>
  );
}
