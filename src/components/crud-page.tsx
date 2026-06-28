import { useMemo, useState, type ReactNode } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
// Dynamic table access — bypass generated table-name typing
const sb = supabaseTyped as unknown as {
  from: (table: string) => {
    select: (cols: string, opts?: { count?: "exact" }) => any;
    insert: (values: unknown) => Promise<{ error: unknown }>;
    update: (values: unknown) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
    delete: () => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
  };
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type FieldType = "text" | "number" | "date" | "datetime" | "select" | "textarea" | "checkbox" | "email" | "tel";

export interface OptionsQuery {
  table: string;
  valueKey: string;
  labelKey: string | ((row: Record<string, unknown>) => string);
  select?: string;
  orderBy?: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  optionsQuery?: OptionsQuery;
  placeholder?: string;
  step?: string;
  defaultValue?: unknown;
  span?: 1 | 2;
  helpText?: string;
}

export interface ColumnDef<Row = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
  className?: string;
}

export interface CrudConfig<Row = Record<string, unknown>> {
  title: string;
  description?: string;
  table: string;
  primaryKey?: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  searchFields?: string[]; // simple ilike OR on these columns
  columns: ColumnDef<Row>[];
  fields: FieldDef[];
  softDelete?: boolean;
  icon?: ReactNode;
  rowKey?: (row: Row) => string;
  toolbar?: ReactNode;
  emptyMessage?: string;
  defaultValues?: Record<string, unknown>;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  pageSize?: number;
}

function useOptions(field: FieldDef) {
  return useQuery({
    queryKey: ["options", field.name, field.optionsQuery?.table],
    enabled: !!field.optionsQuery,
    queryFn: async () => {
      const q = field.optionsQuery!;
      const { data, error } = await sb
        .from(q.table)
        .select(q.select ?? `${q.valueKey}, ${typeof q.labelKey === "string" ? q.labelKey : "*"}`)
        .order(q.orderBy ?? (typeof q.labelKey === "string" ? q.labelKey : q.valueKey));
      if (error) throw error as Error;
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        value: String(r[q.valueKey]),
        label: typeof q.labelKey === "function" ? q.labelKey(r) : String(r[q.labelKey] ?? r[q.valueKey]),
      }));
    },
  });
}

function FieldControl({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const optsQ = useOptions(field);
  const options = field.options ?? optsQ.data ?? [];

  if (field.type === "textarea") {
    return (
      <Textarea
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
      />
    );
  }
  if (field.type === "checkbox") {
    return (
      <div className="flex h-9 items-center">
        <Checkbox checked={!!value} onCheckedChange={(c) => onChange(!!c)} />
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v)}>
        <SelectTrigger>
          <SelectValue placeholder={field.placeholder ?? "Seleccionar..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  const inputType =
    field.type === "number" ? "number" :
    field.type === "date" ? "date" :
    field.type === "datetime" ? "datetime-local" :
    field.type === "email" ? "email" :
    field.type === "tel" ? "tel" : "text";
  return (
    <Input
      type={inputType}
      step={field.step}
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => {
        const v = e.target.value;
        if (field.type === "number") onChange(v === "" ? null : Number(v));
        else onChange(v === "" ? null : v);
      }}
      placeholder={field.placeholder}
    />
  );
}

function CrudForm<Row extends Record<string, unknown>>({
  config, initial, onCancel, onSubmit, submitting,
}: {
  config: CrudConfig<Row>;
  initial: Record<string, unknown> | null;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const defaults = useMemo(() => {
    const base: Record<string, unknown> = {};
    for (const f of config.fields) {
      const v = initial?.[f.name];
      if (v !== undefined && v !== null) {
        if (f.type === "datetime" && typeof v === "string") base[f.name] = v.slice(0, 16);
        else if (f.type === "date" && typeof v === "string") base[f.name] = v.slice(0, 10);
        else base[f.name] = v;
      } else if (f.defaultValue !== undefined) base[f.name] = f.defaultValue;
      else if (config.defaultValues?.[f.name] !== undefined) base[f.name] = config.defaultValues[f.name];
      else base[f.name] = f.type === "checkbox" ? false : "";
    }
    return base;
  }, [config, initial]);

  const form = useForm<FieldValues>({ defaultValues: defaults });
  const values = form.watch();

  function submit(v: FieldValues) {
    // strip empty strings to null for optional fields
    const out: Record<string, unknown> = {};
    for (const f of config.fields) {
      let val = v[f.name];
      if (val === "" || val === undefined) val = null;
      if (f.required && (val === null || val === "")) {
        toast.error(`${f.label} es requerido`);
        return;
      }
      out[f.name] = val;
    }
    onSubmit(out);
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {config.fields.map((f) => (
          <div key={f.name} className={f.span === 2 ? "md:col-span-2" : ""}>
            <Label className="mb-1.5 block text-xs font-medium">
              {f.label}{f.required ? <span className="text-destructive"> *</span> : null}
            </Label>
            <FieldControl
              field={f}
              value={values[f.name]}
              onChange={(val) => form.setValue(f.name, val as never, { shouldDirty: true })}
            />
            {f.helpText ? <p className="mt-1 text-xs text-muted-foreground">{f.helpText}</p> : null}
          </div>
        ))}
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CrudPage<Row extends Record<string, unknown>>({ config }: { config: CrudConfig<Row> }) {
  const queryClient = useQueryClient();
  const pk = config.primaryKey ?? "id";
  const softDelete = config.softDelete ?? true;
  const allowCreate = config.allowCreate ?? true;
  const allowEdit = config.allowEdit ?? true;
  const allowDelete = config.allowDelete ?? true;
  const pageSize = config.pageSize ?? 25;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Row | null | undefined>(undefined); // undefined=closed, null=new
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);

  const queryKey = [config.table, "list", search, page];

  const listQ = useQuery({
    queryKey,
    queryFn: async () => {
      let q = sb
        .from(config.table)
        .select(config.select ?? "*", { count: "exact" });
      if (softDelete) q = q.is("deleted_at", null);
      if (search && config.searchFields?.length) {
        const term = `%${search}%`;
        const or = config.searchFields.map((f) => `${f}.ilike.${term}`).join(",");
        q = q.or(or);
      }
      if (config.orderBy) q = q.order(config.orderBy.column, { ascending: config.orderBy.ascending ?? false });
      else q = q.order("created_at", { ascending: false });
      q = q.range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, error, count } = await q;
      if (error) throw error as Error;
      return { rows: ((data ?? []) as unknown) as Row[], count: count ?? 0 };
    },
  });

  const upsertM = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (editing && (editing as Record<string, unknown>)[pk]) {
        const id = (editing as Record<string, unknown>)[pk];
        const { error } = await sb.from(config.table).update(values).eq(pk, id as string);
        if (error) throw error as Error;
      } else {
        const { error } = await sb.from(config.table).insert(values);
        if (error) throw error as Error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Registro actualizado" : "Registro creado");
      setEditing(undefined);
      queryClient.invalidateQueries({ queryKey: [config.table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: async (row: Row) => {
      const id = (row as Record<string, unknown>)[pk] as string;
      if (softDelete) {
        const { error } = await sb.from(config.table).update({ deleted_at: new Date().toISOString() }).eq(pk, id);
        if (error) throw error as Error;
      } else {
        const { error } = await sb.from(config.table).delete().eq(pk, id);
        if (error) throw error as Error;
      }
    },
    onSuccess: () => {
      toast.success("Eliminado");
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: [config.table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = Math.max(1, Math.ceil((listQ.data?.count ?? 0) / pageSize));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {config.icon}{config.title}
          </h1>
          {config.description ? <p className="mt-1 text-sm text-muted-foreground">{config.description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {config.toolbar}
          <Button variant="outline" size="icon" onClick={() => listQ.refetch()} title="Refrescar">
            <RotateCcw className="size-4" />
          </Button>
          {allowCreate ? (
            <Button onClick={() => setEditing(null)}>
              <Plus className="size-4" /> Nuevo
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {listQ.data?.count ?? 0} registros
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {config.columns.map((c) => (
                <TableHead key={c.key} className={c.className}>{c.label}</TableHead>
              ))}
              {(allowEdit || allowDelete) ? <TableHead className="w-24 text-right">Acciones</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQ.isLoading ? (
              <TableRow><TableCell colSpan={config.columns.length + 1} className="h-24 text-center">
                <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
              </TableCell></TableRow>
            ) : (listQ.data?.rows.length ?? 0) === 0 ? (
              <TableRow><TableCell colSpan={config.columns.length + 1} className="h-24 text-center text-sm text-muted-foreground">
                {config.emptyMessage ?? "Sin resultados."}
              </TableCell></TableRow>
            ) : (
              listQ.data!.rows.map((row, i) => (
                <TableRow key={config.rowKey ? config.rowKey(row) : String((row as Record<string, unknown>)[pk] ?? i)}>
                  {config.columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                    </TableCell>
                  ))}
                  {(allowEdit || allowDelete) ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {allowEdit ? (
                          <Button variant="ghost" size="icon" onClick={() => setEditing(row)}>
                            <Pencil className="size-4" />
                          </Button>
                        ) : null}
                        {allowDelete ? (
                          <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(row)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
          <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
        </div>
      ) : null}

      <Dialog open={editing !== undefined} onOpenChange={(o) => { if (!o) setEditing(undefined); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${config.title}` : `Nuevo ${config.title}`}</DialogTitle>
            {config.description ? <DialogDescription>{config.description}</DialogDescription> : null}
          </DialogHeader>
          {editing !== undefined ? (
            <CrudForm
              config={config}
              initial={(editing ?? null) as Record<string, unknown> | null}
              onCancel={() => setEditing(undefined)}
              onSubmit={(v) => upsertM.mutate(v)}
              submitting={upsertM.isPending}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción {softDelete ? "marcará el registro como eliminado" : "es permanente"}. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteM.mutate(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}