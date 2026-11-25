import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Plus, Pencil, Trash2, Search, RotateCcw, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInCalendarDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, type Moneda } from "@/lib/format";
import { RENTA_ESTADO_COLORS } from "@/lib/constants";
import { RentaDetailPanel } from "@/components/rentas/RentaDetailPanel";
import { RentaForm } from "@/components/rentas/RentaForm";
import { logRentaEvent } from "@/lib/renta-log";

type Renta = {
  id: string;
  folio: string;
  cliente_id: string;
  vehiculo_id: string;
  fecha_inicio: string;
  fecha_devolucion: string;
  fecha_devolucion_real: string | null;
  dias: number;
  tarifa: number;
  subtotal: number;
  descuento: number;
  extras: number;
  impuesto: number;
  deposito: number;
  total: number;
  moneda: string;
  estado: string;
  observaciones: string | null;
  numero_oficial: string | null;
  clientes?: { nombre: string; documento?: string | null };
  vehiculos?: { codigo: string; placa: string; marca: string; modelo: string; clasificacion: string; tarifa_diaria: number };
};

export const Route = createFileRoute("/_authenticated/rentas")({
  validateSearch: (search: Record<string, unknown>) => ({
    clienteId: typeof search.clienteId === "string" ? search.clienteId : undefined,
    pagarRentaId: typeof search.pagarRentaId === "string" ? search.pagarRentaId : undefined,
  }),
  head: () => ({ meta: [{ title: "Rentas — TM RENT A CAR" }] }),
  component: RentasPage,
});

type SortField = "folio" | "fecha_inicio" | "fecha_devolucion" | "total";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;

const escapePostgrestPattern = (value: string) =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`).replace(/[(),]/g, " ");

function RentasPage() {
  const queryClient = useQueryClient();
  const { clienteId, pagarRentaId } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedRentaId, setSelectedRentaId] = useState<string | null>(pagarRentaId ?? null);
  const [pagosTab, setPagosTab] = useState(!!pagarRentaId);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("fecha_inicio");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showCreate, setShowCreate] = useState(!!clienteId);
  const [editRentaId, setEditRentaId] = useState<string | null>(null);

  const queryKey = ["rentas-list", search, page, monthFilter, sortField, sortDir];

  const listQ = useQuery({
    queryKey,
    queryFn: async () => {
      const term = search.trim();
      const searchPattern = escapePostgrestPattern(term);
      let matchingClienteIds: string[] = [];

      if (term) {
        const { data: clientesData, error: clientesError } = await supabase
          .from("clientes")
          .select("id")
          .is("deleted_at", null)
          .or(
            `nombre.ilike.%${searchPattern}%,documento.ilike.%${searchPattern}%,telefono.ilike.%${searchPattern}%,whatsapp.ilike.%${searchPattern}%`,
          )
          .limit(100);

        if (clientesError) throw clientesError;
        matchingClienteIds = (clientesData ?? []).map((cliente) => cliente.id);
      }

      let q = supabase
        .from("rentas")
        .select("*, clientes(nombre, documento), vehiculos(codigo, placa, marca, modelo, clasificacion, tarifa_diaria)", { count: "exact" })
        .is("deleted_at", null);

      if (term) {
        const rentFilters = [
          `folio.ilike.%${searchPattern}%`,
          `numero_oficial.ilike.%${searchPattern}%`,
        ];

        if (matchingClienteIds.length > 0) {
          rentFilters.push(`cliente_id.in.(${matchingClienteIds.join(",")})`);
        }

        q = q.or(rentFilters.join(","));
      }
      if (monthFilter) {
        const [y, m] = monthFilter.split("-").map(Number);
        const start = new Date(y, m - 1, 1).toISOString();
        const end = new Date(y, m, 1).toISOString();
        q = q.gte("fecha_devolucion", start).lt("fecha_devolucion", end);
      }

      const orderCol = sortField === "folio" ? "folio" : sortField === "fecha_inicio" ? "fecha_inicio" : sortField === "fecha_devolucion" ? "fecha_devolucion" : "total";
      q = q.order(orderCol, { ascending: sortDir === "asc" });

      q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as unknown as Renta[], count: count ?? 0 };
    },
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("eliminar_renta_completa", { p_renta_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Renta eliminada");
      queryClient.invalidateQueries({ queryKey: ["rentas-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reportes-summary-v2"] });
      queryClient.invalidateQueries({ queryKey: ["movements-table"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = Math.max(1, Math.ceil((listQ.data?.count ?? 0) / PAGE_SIZE));

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const rowCounts = (listQ.data?.rows ?? []).reduce(
    (acc, r) => {
      acc.total++;
      if (r.estado === "activa") acc.activas++;
      if (r.estado === "reservada") acc.reservadas++;
      return acc;
    },
    { total: 0, activas: 0, reservadas: 0 },
  );

  const handleCreateSuccess = (rentaId: string) => {
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: ["rentas-list"] });
    setSelectedRentaId(rentaId);
    setPagosTab(false);
  };

  const handleEditSuccess = (rentaId: string) => {
    setEditRentaId(null);
    queryClient.invalidateQueries({ queryKey: ["rentas-list"] });
    queryClient.invalidateQueries({ queryKey: ["renta-detail", rentaId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["reportes-summary-v2"] });
    queryClient.invalidateQueries({ queryKey: ["movements-table"] });
    setSelectedRentaId(rentaId);
    setPagosTab(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FileText className="size-6 text-gold" />
            Rentas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Flujo completo: reserva, activación y devolución.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4 mr-1.5" />
            Nueva Renta
          </Button>
          <Button variant="outline" size="icon" onClick={() => listQ.refetch()} title="Refrescar">
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total rentas</p>
          <p className="text-xl font-semibold mt-1">{listQ.data?.count ?? "—"}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Activas</p>
          <p className="text-xl font-semibold text-blue-600 mt-1">
            {listQ.data ? rowCounts.activas : "—"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Reservadas</p>
          <p className="text-xl font-semibold text-amber-600 mt-1">
            {listQ.data ? rowCounts.reservadas : "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-0 sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por folio o cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => {
            setMonthFilter(e.target.value);
            setPage(0);
          }}
          className="w-full sm:w-44"
        />
        <div className="ml-auto text-xs text-muted-foreground">
          {listQ.data?.count ?? 0} registros
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="cursor-pointer" onClick={() => toggleSort("folio")}>
                Folio {sortField === "folio" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("fecha_inicio")}>
                Inicio {sortField === "fecha_inicio" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("fecha_devolucion")}>
                Devolución {sortField === "fecha_devolucion" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead>Tiempo</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Tarifa diaria</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("total")}>
                Total {sortField === "total" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : (listQ.data?.rows.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-sm text-muted-foreground">
                  Sin resultados.
                </TableCell>
              </TableRow>
            ) : (
              listQ.data!.rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => { setSelectedRentaId(r.id); setPagosTab(false); }}
                >
                  <TableCell>
                    <span className="font-mono text-xs">{r.numero_oficial || r.folio}</span>
                  </TableCell>
                  <TableCell>{r.clientes?.nombre ?? "—"}</TableCell>
                  <TableCell>
                    {r.vehiculos ? `${r.vehiculos.codigo} · ${r.vehiculos.placa}` : "—"}
                  </TableCell>
                  <TableCell>{formatDate(r.fecha_inicio)}</TableCell>
                  <TableCell>{formatDate(r.fecha_devolucion)}</TableCell>
                  <TableCell>
                    {(() => {
                      if (r.estado === "finalizada")
                        return <span className="text-muted-foreground">{r.dias} día(s)</span>;
                      if (r.estado === "cancelada")
                        return <span className="text-muted-foreground">—</span>;
                      const diff = differenceInCalendarDays(new Date(r.fecha_devolucion), new Date());
                      if (diff < 0)
                        return (
                          <span className="font-medium text-rose-600 dark:text-rose-400">
                            {Math.abs(diff)} día(s) vencido
                          </span>
                        );
                      if (diff === 0)
                        return <span className="font-semibold text-amber-600 dark:text-amber-400">Hoy</span>;
                      if (diff === 1)
                        return <span className="font-medium text-amber-600 dark:text-amber-400">1 día restante</span>;
                      if (diff <= 3)
                        return <span className="font-medium text-amber-600 dark:text-amber-400">{diff} días restantes</span>;
                      return <span className="text-muted-foreground">{diff} días restantes</span>;
                    })()}
                  </TableCell>
                  <TableCell>{r.dias}</TableCell>
                  <TableCell>
                    {r.tarifa > 0
                      ? formatCurrency(r.tarifa, r.moneda as Moneda)
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{formatCurrency(r.total, r.moneda as Moneda)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={RENTA_ESTADO_COLORS[r.estado] ?? ""}>
                      {r.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditRentaId(r.id)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(r.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      ) : null}

      {selectedRentaId && (
        <RentaDetailPanel
          rentaId={selectedRentaId}
          onClose={() => setSelectedRentaId(null)}
          initialTab={pagosTab ? "pagos" : "contrato"}
        />
      )}

      <RentaForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={handleCreateSuccess}
        defaultClienteId={clienteId}
      />

      <RentaForm
        open={!!editRentaId}
        rentaId={editRentaId ?? undefined}
        onClose={() => setEditRentaId(null)}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta renta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La renta se moverá a la papelera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDelete) { deleteM.mutate(confirmDelete); setConfirmDelete(null); } }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
