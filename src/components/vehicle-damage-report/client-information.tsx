import { useState } from "react";
import { User, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
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

type ClienteRow = {
  id: string;
  nombre: string;
  documento: string;
  telefono: string | null;
  direccion: string | null;
};

export function ClientInformation({ form }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const set = (key: keyof VehicleDamageFormValues["cliente"], value: string) =>
    form.setValue(`cliente.${key}`, value, { shouldDirty: true });

  const clientesQ = useQuery({
    queryKey: ["damage-report-clientes", search],
    queryFn: async () => {
      let q = supabase
        .from("clientes")
        .select("id, nombre, documento, telefono, direccion")
        .is("deleted_at", null)
        .order("nombre");
      if (search) {
        const term = `%${search}%`;
        q = q.or(`nombre.ilike.${term},documento.ilike.${term},telefono.ilike.${term}`);
      }
      q = q.limit(30);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ClienteRow[];
    },
    enabled: open,
  });

  const selectedLabel = form.watch("cliente.nombre");

  function handleSelect(c: ClienteRow) {
    set("nombre", c.nombre);
    set("documento", c.documento);
    set("telefono", c.telefono ?? "");
    set("direccion", c.direccion ?? "");
    setOpen(false);
    setSearch("");
  }

  return (
    <Section
      icon={User}
      title="Datos del Cliente"
      subtitle="Selecciona un cliente existente o ingresa los datos manualmente"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Buscar cliente" className="md:col-span-2">
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
                {selectedLabel || "Seleccionar cliente de la base de datos..."}
                <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar por nombre, documento o teléfono..."
                  value={search}
                  onValueChange={setSearch}
                  className="h-9 text-xs"
                />
                <CommandList>
                  {clientesQ.isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" /> Buscando...
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                      <CommandGroup>
                        {(clientesQ.data ?? []).map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.id}
                            onSelect={() => handleSelect(c)}
                            className="flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{c.nombre}</p>
                              <p className="text-muted-foreground truncate">
                                {c.documento}{c.telefono ? ` · ${c.telefono}` : ""}
                              </p>
                            </div>
                            <Check
                              className={cn(
                                "size-3.5 shrink-0",
                                selectedLabel === c.nombre ? "opacity-100" : "opacity-0"
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

        <Field label="Nombre completo" required className="md:col-span-2">
          <Input
            value={form.watch("cliente.nombre")}
            onChange={(e) => set("nombre", e.target.value)}
            placeholder="Nombre y apellidos"
            className="h-9 rounded-lg border-border/70 text-xs"
          />
        </Field>
        <Field label="Cédula / Documento">
          <Input
            value={form.watch("cliente.documento")}
            onChange={(e) => set("documento", e.target.value)}
            placeholder="Nº de cédula o pasaporte"
            className="h-9 rounded-lg border-border/70 text-xs"
          />
        </Field>
        <Field label="Teléfono">
          <Input
            value={form.watch("cliente.telefono")}
            onChange={(e) => set("telefono", e.target.value)}
            placeholder="Número de contacto"
            className="h-9 rounded-lg border-border/70 text-xs"
          />
        </Field>
        <Field label="Dirección" className="md:col-span-2">
          <Input
            value={form.watch("cliente.direccion")}
            onChange={(e) => set("direccion", e.target.value)}
            placeholder="Dirección de residencia"
            className="h-9 rounded-lg border-border/70 text-xs"
          />
        </Field>
      </div>
    </Section>
  );
}
