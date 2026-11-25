import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Car,
  Wrench,
  Shield,
  Wallet,
  RefreshCw,
  Download,
  Printer,
  Activity,
  Award,
  Gauge,
  Search,
  Pencil,
  Trash2,
  Plus,
  FileText,
} from "lucide-react";
import { FinancialReportsModal } from "@/components/reportes/FinancialReportsModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart as RechartPie,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { fetchReportesSummary } from "@/lib/reportes-query";
import { desglosarCobros, enPeriodo } from "@/lib/contabilidad-rentas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, convertCurrency, type Moneda } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { EGRESO_CATEGORIA_LABELS, EGRESO_CATEGORIA_COLORS } from "@/lib/constants";

type MovementRow = {
  id: string;
  fecha: string;
  tipo: "ingreso" | "egreso";
  categoria: string;
  descripcion: string;
  referencia: string;
  cliente: string;
  factura: string;
  metodo: string;
  moneda: string;
  monto: number;
  estado: string;
  rawId: string;
  rawRecord: any;
  // Vehicle classification — populated for ingresos linked to a renta
  vehiculoId?: string;
  vehiculoClasificacion?: "propio" | "subrentado";
  vehiculoNombre?: string;
  vehiculoPlaca?: string;
  // Subrental cost data — mirrors exactly what RentaDetailTabPayments uses
  rentaDias?: number;            // renta.dias
  rentaTotal?: number;           // renta.total
  vehiculoCostoSubarriendo?: number; // vehiculo.costo_subarriendo (daily cost)
  costoSubrenta?: number;        // calculated split cost
  garantia?: number;
  costoProveedorUSD?: number;
  utilidadSubrenta?: number;     // calculated split utility
};

const GOLD = "#C89B3C";
const BLUE = "#2563EB";
const GREEN = "#22C55E";
const RED = "#EF4444";
const AMBER = "#F59E0B";

const CHART_COLORS = [GOLD, BLUE, GREEN, AMBER, RED, "#8B5CF6", "#06B6D4", "#EC4899"];

const now = new Date();
const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
const defaultEnd = now.toISOString().slice(0, 10);

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 24;
  const pts = data
    .map(
      (v, i) =>
        `${((i / (data.length - 1)) * w).toFixed(0)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(0)}`,
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

function SkeletonCard() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-1 h-7 w-32" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-1 h-3 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const display = useMemo(() => {
    if (decimals > 0) return value.toFixed(decimals);
    return Math.round(value).toLocaleString();
  }, [value, decimals]);
  return (
    <span className="tabular-nums">
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

type PeriodPreset = "this_month" | "last_month" | "3_months" | "6_months" | "year" | "custom_month" | "custom_dates";

const getMonthStartEnd = (yearMonth: string) => {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
};

function Page() {
  const initialNow = new Date();
  const initialYM = `${initialNow.getFullYear()}-${String(initialNow.getMonth() + 1).padStart(2, "0")}`;

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("this_month");
  const [startMonth, setStartMonth] = useState(initialYM);
  const [endMonth, setEndMonth] = useState(initialYM);
  const [dateFrom, setDateFrom] = useState(() => getMonthStartEnd(initialYM).start);
  const [dateTo, setDateTo] = useState(() => getMonthStartEnd(initialYM).end);
  const [chartTab, setChartTab] = useState("revenue");
  const [displayCurrency, setDisplayCurrency] = useState<Moneda>("NIO");
  const [financialPdfModalOpen, setFinancialPdfModalOpen] = useState(false);

  const [movementFilter, setMovementFilter] = useState<
    "todos" | "ingresos" | "egresos_todos" | "egresos_operativos" | "egresos_subrentas"
  >("todos");
  const [movementSearch, setMovementSearch] = useState("");
  const [movementCategory, setMovementCategory] = useState("todos");
  const [movementPage, setMovementPage] = useState(1);
  const MOVEMENT_PAGE_SIZE = 25;

  const applyPeriodPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const currentYM = `${y}-${String(m).padStart(2, "0")}`;

    if (preset === "this_month") {
      setStartMonth(currentYM);
      setEndMonth(currentYM);
      const se = getMonthStartEnd(currentYM);
      setDateFrom(se.start);
      setDateTo(se.end);
    } else if (preset === "last_month") {
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? y - 1 : y;
      const ym = `${prevY}-${String(prevM).padStart(2, "0")}`;
      setStartMonth(ym);
      setEndMonth(ym);
      const se = getMonthStartEnd(ym);
      setDateFrom(se.start);
      setDateTo(se.end);
    } else if (preset === "3_months") {
      const startMDate = new Date(y, m - 3, 1);
      const startYM = `${startMDate.getFullYear()}-${String(startMDate.getMonth() + 1).padStart(2, "0")}`;
      setStartMonth(startYM);
      setEndMonth(currentYM);
      setDateFrom(`${startYM}-01`);
      setDateTo(getMonthStartEnd(currentYM).end);
    } else if (preset === "6_months") {
      const startMDate = new Date(y, m - 6, 1);
      const startYM = `${startMDate.getFullYear()}-${String(startMDate.getMonth() + 1).padStart(2, "0")}`;
      setStartMonth(startYM);
      setEndMonth(currentYM);
      setDateFrom(`${startYM}-01`);
      setDateTo(getMonthStartEnd(currentYM).end);
    } else if (preset === "year") {
      const startYM = `${y}-01`;
      setStartMonth(startYM);
      setEndMonth(currentYM);
      setDateFrom(`${y}-01-01`);
      setDateTo(getMonthStartEnd(currentYM).end);
    }
  };

  const handleMonthRangeChange = (newStartM?: string, newEndM?: string) => {
    const s = newStartM ?? startMonth;
    const e = newEndM ?? endMonth;
    setStartMonth(s);
    setEndMonth(e);
    setPeriodPreset("custom_month");
    const startSe = getMonthStartEnd(s);
    const endSe = getMonthStartEnd(e);
    setDateFrom(startSe.start);
    setDateTo(endSe.end);
  };

  const queryClient = useQueryClient();

  // CRUD state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalType, setModalType] = useState<"ingreso" | "egreso">("ingreso");
  const [editingItem, setEditingItem] = useState<MovementRow | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<MovementRow | null>(null);

  // Form fields state
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    monto: "",
    moneda: "NIO",
    metodo: "efectivo",
    estado: "pagado",
    referencia: "",
    concepto: "",
    categoria: "otros",
    responsable: "",
    descripcion: "",
  });

  const vehiculosQ = useQuery({
    queryKey: ["vehiculos-list-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehiculos")
        .select("id, marca, modelo, anio, placa")
        .is("deleted_at", null);
      return (data || []).map((v: any) => ({
        id: v.id,
        nombre: `${v.marca || ""} ${v.modelo || ""} ${v.anio || ""} (${v.placa || ""})`.trim(),
      }));
    },
  });

  const configQ = useQuery({
    queryKey: ["configuracion_empresa"],
    queryFn: async () => {
      const { data } = await supabase
        .from("configuracion_empresa")
        .select("moneda_principal, tipo_cambio")
        .limit(1)
        .maybeSingle();
      return {
        moneda: (data?.moneda_principal ?? "NIO") as Moneda,
        tipoCambio: Number(data?.tipo_cambio ?? 36.5),
      };
    },
  });

  useEffect(() => {
    if (configQ.data) {
      setDisplayCurrency(configQ.data.moneda);
    }
  }, [configQ.data]);

  const reportQ = useQuery({
    queryKey: ["reportes-summary-v2", dateFrom, dateTo],
    enabled: !!dateFrom && !!dateTo && dateFrom <= dateTo,
    staleTime: 30_000,
    queryFn: () => fetchReportesSummary(dateFrom, dateTo, configQ.data?.moneda ?? "NIO"),
  });

  const d = reportQ.data;
  const isLoading = reportQ.isLoading;
  const tipoCambio = configQ.data?.tipoCambio ?? 36.5;
  const monedaPrincipal = configQ.data?.moneda ?? "NIO";

  const c = useMemo(() => {
    if (!d) return null;
    const convert = (amount: number, fromMoneda: Record<string, number> | undefined) => {
      if (!fromMoneda) return convertCurrency(amount, "NIO", displayCurrency, tipoCambio);
      let total = 0;
      for (const [m, val] of Object.entries(fromMoneda)) {
        total += convertCurrency(val, m as Moneda, displayCurrency, tipoCambio);
      }
      return total;
    };

    const ingresosConv = convert(d.ingresos, d.ingresosByMoneda);
    const ingresosPropiosConv = convert(d.ingresosPropios, d.ingresosPropiosByMoneda);
    const ingresosSubrentadosConv = convert(d.ingresosSubrentados, d.ingresosSubrentadosByMoneda);
    const costoSubarriendoConv = convert(d.costoSubarriendoTotal, d.costoSubarriendoByMoneda);
    const gananciaBrutaConv = ingresosConv - costoSubarriendoConv;
    const ingresosPrevConv = convert(d.ingresosPrev, d.ingresosPrevByMoneda);
    const avgRentalValueConv = d.rentasFinalizadas > 0 ? ingresosConv / d.rentasFinalizadas : 0;
    const ingresosChangeConv =
      ingresosPrevConv > 0 ? ((ingresosConv - ingresosPrevConv) / ingresosPrevConv) * 100 : 0;

    const ingresosSeriesConv = d.ingresosSeries.map((s) => ({
      ...s,
      total: convert(s.total, s.moneda),
    }));

    const sparklineDataConv = ingresosSeriesConv.map((i) => i.total);

    const rentabilidadSeriesConv = d.rentabilidadSeries.map((s) => ({
      ...s,
      propios: convert(s.propios, s.propiosMoneda),
      subrentados: convert(s.subrentados, s.subrentadosMoneda),
      costoSubarriendo: convertCurrency(s.costoSubarriendo, "USD", displayCurrency, tipoCambio),
    }));

    const topVehiculosConv = d.topVehiculos.map((v) => ({
      ...v,
      ingresos: convert(v.ingresos, v.moneda),
    }));

    const metodosPagoConv = d.metodosPago.map((m) => ({
      ...m,
      total: convert(m.total, m.moneda),
    }));

    return {
      ...d,
      ingresos: ingresosConv,
      ingresosPrev: ingresosPrevConv,
      ingresosChange: ingresosChangeConv,
      ingresosPropios: ingresosPropiosConv,
      ingresosSubrentados: ingresosSubrentadosConv,
      costoSubarriendoTotal: costoSubarriendoConv,
      gananciaBruta: gananciaBrutaConv,
      avgRentalValue: avgRentalValueConv,
      ingresosSeries: ingresosSeriesConv,
      sparklineData: sparklineDataConv,
      rentabilidadSeries: rentabilidadSeriesConv,
      topVehiculos: topVehiculosConv,
      metodosPago: metodosPagoConv,
    };
  }, [d, displayCurrency, tipoCambio, monedaPrincipal]);

  const movementsQ = useQuery({
    queryKey: ["movements-table", dateFrom, dateTo, tipoCambio],
    enabled: !!dateFrom && !!dateTo && dateFrom <= dateTo,
    staleTime: 30_000,
    queryFn: async () => {
      const rangeToInclusive = new Date(new Date(dateTo).getTime() + 86400000).toISOString();
      const [pagosResult, egresosResult, pendientesResult] = await Promise.all([
        // Include vehicle classification + subrental cost data via renta → vehiculo JOIN
        // mirrors exactly what RentaDetailTabPayments fetches
        supabase
          .from("pagos")
          .select(`
            id, fecha, monto, moneda, metodo, estado, referencia, renta_id,
            rentas(
              id, numero_oficial, estado, deleted_at, deposito, moneda, tarifa_subarriendo,
              vehiculo_id,
              dias,
              total,
              vehiculos(clasificacion, marca, modelo, placa, costo_subarriendo),
              clientes(nombre)
            )
          `)
          .is("deleted_at", null)
          .eq("estado", "pagado"),
        supabase
          .from("egresos")
          .select("id, fecha, monto, moneda, metodo, concepto, categoria, responsable, descripcion, renta_id, rentas(numero_oficial, clientes(nombre))")
          .is("deleted_at", null),
        supabase
          .from("pagos")
          .select("monto, moneda")
          .is("deleted_at", null)
          .eq("estado", "pendiente"),
      ]);

      for (const result of [pagosResult, egresosResult, pendientesResult]) {
        if (result.error) throw result.error;
      }
      const pagos = (pagosResult.data ?? []) as any[];
      const rentaMap = new Map(pagos.filter(p => p.rentas).map(p => [p.rentas.id, p.rentas]));
      const cobros = desglosarCobros(pagos, [...rentaMap.values()], tipoCambio)
        .filter(p => enPeriodo(p.fecha, dateFrom, dateTo));
      const conPagoProveedor = new Set((egresosResult.data ?? [])
        .filter(e => e.categoria === "subarriendo" && e.renta_id).map(e => e.renta_id));
      const ingresos: MovementRow[] = cobros.map((p: any) => {
        const renta = p.renta;
        const vehiculo = renta?.vehiculos;
        const clasificacion = (vehiculo?.clasificacion ?? "propio") as "propio" | "subrentado";
        const vehiculoNombre = vehiculo ? `${vehiculo.marca ?? ""} ${vehiculo.modelo ?? ""}`.trim() : undefined;
        const rentaDias = Number(renta?.dias ?? 0);
        const rentaTotal = Number(renta?.total ?? 0);
        const costoXDia = Number(renta?.tarifa_subarriendo) > 0
          ? Number(renta.tarifa_subarriendo) : Number(vehiculo?.costo_subarriendo ?? 0);
        const costoProveedorUSD = conPagoProveedor.has(p.renta_id) ? 0 : p.costoProveedorUSD;
        const costoPago = convertCurrency(costoProveedorUSD, "USD", p.moneda as Moneda, tipoCambio);
        return {
          id: `ingreso-${p.id}`,
          fecha: p.fecha,
          tipo: "ingreso" as const,
          categoria: "pago",
          descripcion: p.garantia > 0 ? `Cobro por ${p.metodo}; garantía separada: ${formatCurrency(p.garantia, p.moneda)}` : `Pago por ${p.metodo}`,
          referencia: p.referencia ?? "",
          cliente: renta?.clientes?.nombre ?? "—",
          factura: renta?.numero_oficial ?? "Sin emitir",
          metodo: p.metodo,
          moneda: p.moneda,
          monto: p.ingreso,
          garantia: p.garantia,
          costoProveedorUSD,
          estado: p.estado,
          rawId: p.id,
          rawRecord: p,
          vehiculoId: renta?.vehiculo_id ?? undefined,
          vehiculoClasificacion: clasificacion,
          vehiculoNombre,
          vehiculoPlaca: vehiculo?.placa ?? undefined,
          rentaDias,
          rentaTotal,
          vehiculoCostoSubarriendo: costoXDia,
          costoSubrenta: p.esSubrenta ? costoPago : undefined,
          utilidadSubrenta: p.esSubrenta ? p.ingreso - costoPago : undefined,
        };
      });

      const egresos: MovementRow[] = (egresosResult.data ?? []).filter(e => enPeriodo(e.fecha, dateFrom, dateTo)).map((e: any) => {
        const isSubarriendo = e.categoria === "subarriendo";
        const montoNum = Number(e.monto ?? 0);
        return {
          id: `egreso-${e.id}`,
          fecha: e.fecha,
          tipo: "egreso" as const,
          categoria: e.categoria,
          descripcion: e.concepto,
          referencia: "",
          cliente: (e.rentas as any)?.clientes?.nombre ?? "—",
          factura: (e.rentas as any)?.numero_oficial ?? "Sin emitir",
          metodo: e.metodo,
          moneda: e.moneda,
          monto: montoNum,
          estado: "completado",
          rawId: e.id,
          rawRecord: e,
          costoSubrenta: isSubarriendo ? montoNum : undefined,
        };
      });

      const pendientesByMoneda: Record<string, number> = {};
      for (const p of pendientesResult.data ?? []) {
        const mon = (p.moneda ?? "NIO") as string;
        pendientesByMoneda[mon] = (pendientesByMoneda[mon] ?? 0) + Number(p.monto ?? 0);
      }

      return { ingresos, egresos, pendientesByMoneda };
    },
  });

  // CRUD Mutations
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["movements-table"] });
    queryClient.invalidateQueries({ queryKey: ["reportes-summary-v2"] });
    queryClient.invalidateQueries({ queryKey: ["pagos"] });
    queryClient.invalidateQueries({ queryKey: ["egresos"] });
  };

  const handleOpenCreate = (type: "ingreso" | "egreso") => {
    setModalType(type);
    setModalMode("create");
    setEditingItem(null);
    setFormData({
      fecha: new Date().toISOString().slice(0, 10),
      monto: "",
      moneda: "NIO",
      metodo: "efectivo",
      estado: type === "ingreso" ? "pagado" : "completado",
      referencia: "",
      concepto: "",
      categoria: "otros",
      responsable: "",
      descripcion: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: MovementRow) => {
    setEditingItem(item);
    setModalType(item.tipo);
    setModalMode("edit");
    if (item.tipo === "ingreso") {
      setFormData({
        fecha: item.fecha ? item.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
        monto: String(item.tipo === "ingreso" ? item.rawRecord.monto : item.monto),
        moneda: item.moneda || "NIO",
        metodo: item.metodo || "efectivo",
        estado: item.estado || "pagado",
        referencia: item.referencia || "",
        concepto: "",
        categoria: "otros",
        responsable: "",
        descripcion: "",
      });
    } else {
      setFormData({
        fecha: item.fecha ? item.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
        monto: String(item.monto),
        moneda: item.moneda || "NIO",
        metodo: item.metodo || "efectivo",
        estado: "completado",
        referencia: "",
        concepto: item.descripcion || "",
        categoria: item.categoria || "otros",
        responsable: item.rawRecord?.responsable || "",
        descripcion: item.rawRecord?.descripcion || "",
      });
    }
    setModalOpen(true);
  };

  const handleOpenDelete = (item: MovementRow) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const handleSaveMovement = async () => {
    if (!formData.monto || Number(formData.monto) <= 0) {
      return;
    }

    if (modalType === "ingreso") {
      if (modalMode === "create") {
        const fechaISO = formData.fecha.includes("T")
          ? new Date(formData.fecha).toISOString()
          : new Date(`${formData.fecha}T12:00:00Z`).toISOString();
        const { error } = await supabase.from("pagos").insert({
          fecha: fechaISO,
          monto: Number(formData.monto),
          moneda: formData.moneda,
          metodo: formData.metodo,
          estado: formData.estado,
          referencia: formData.referencia || null,
        } as any);
        if (error) throw error;
      } else if (editingItem) {
        const fechaISO = formData.fecha.includes("T")
          ? new Date(formData.fecha).toISOString()
          : new Date(`${formData.fecha}T12:00:00Z`).toISOString();
        const { error } = await supabase.from("pagos").update({
          fecha: fechaISO,
          monto: Number(formData.monto),
          moneda: formData.moneda,
          metodo: formData.metodo,
          estado: formData.estado,
          referencia: formData.referencia || null,
        } as any).eq("id", editingItem.rawId);
        if (error) throw error;
      }
    } else {
      if (modalMode === "create") {
        const { error } = await supabase.from("egresos").insert({
          fecha: formData.fecha,
          concepto: formData.concepto || "Egreso",
          categoria: formData.categoria,
          monto: Number(formData.monto),
          moneda: formData.moneda,
          metodo: formData.metodo,
          responsable: formData.responsable || "Sistema",
          descripcion: formData.descripcion || null,
        } as any);
        if (error) throw error;
      } else if (editingItem) {
        const { error } = await supabase.from("egresos").update({
          fecha: formData.fecha,
          concepto: formData.concepto || "Egreso",
          categoria: formData.categoria,
          monto: Number(formData.monto),
          moneda: formData.moneda,
          metodo: formData.metodo,
          responsable: formData.responsable || "Sistema",
          descripcion: formData.descripcion || null,
        } as any).eq("id", editingItem.rawId);
        if (error) throw error;
      }
    }

    invalidateQueries();
    setModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    if (deletingItem.tipo === "ingreso") {
      const { error } = await supabase.from("pagos").update({ deleted_at: new Date().toISOString() } as any).eq("id", deletingItem.rawId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("egresos").update({ deleted_at: new Date().toISOString() } as any).eq("id", deletingItem.rawId);
      if (error) throw error;
    }
    invalidateQueries();
    setDeleteDialogOpen(false);
  };

  const movements = useMemo(() => {
    if (!movementsQ.data) return [];
    const all: MovementRow[] = [
      ...movementsQ.data.ingresos,
      ...movementsQ.data.egresos,
    ];
    all.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    let filtered = all;

    if (movementFilter === "ingresos") {
      filtered = filtered.filter((m) => m.tipo === "ingreso");
    } else if (movementFilter === "egresos_todos") {
      filtered = filtered.filter((m) => m.tipo === "egreso");
    } else if (movementFilter === "egresos_operativos") {
      filtered = filtered.filter((m) => m.tipo === "egreso" && m.categoria !== "subarriendo");
    } else if (movementFilter === "egresos_subrentas") {
      filtered = filtered.filter((m) => m.tipo === "egreso" && m.categoria === "subarriendo");
    }

    if (movementCategory !== "todos") {
      filtered = filtered.filter((m) => m.categoria === movementCategory);
    }

    if (movementSearch) {
      const q = movementSearch.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.descripcion.toLowerCase().includes(q) ||
          m.referencia.toLowerCase().includes(q) ||
          m.cliente.toLowerCase().includes(q) ||
          m.factura.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [movementsQ.data, movementFilter, movementSearch, movementCategory]);

  useEffect(() => {
    setMovementPage(1);
  }, [movementFilter, movementSearch, movementCategory]);

  const movementCategories = useMemo(() => {
    if (!movementsQ.data) return [];
    const cats = new Set<string>();
    for (const m of movementsQ.data.ingresos) cats.add("pago");
    for (const m of movementsQ.data.egresos) cats.add(m.categoria);
    return [...cats].sort();
  }, [movementsQ.data]);

  const totalMovementPages = Math.max(1, Math.ceil(movements.length / MOVEMENT_PAGE_SIZE));
  const paginatedMovements = movements.slice(
    (movementPage - 1) * MOVEMENT_PAGE_SIZE,
    movementPage * MOVEMENT_PAGE_SIZE,
  );

  // Resultado de los cobros sin garantías y los costos del proveedor, sin duplicarlos.
  const financialDataset = useMemo(() => {
    const ingresos = movementsQ.data?.ingresos ?? [];
    const egresos = movementsQ.data?.egresos ?? [];

    let totalIngresos = 0;
    let ingresosPropios = 0;
    let ingresosSubrentados = 0;
    let costoSubrentas = 0;
    let utilidadSubrentas = 0;
    const garantiasRecibidas = ingresos.reduce((s, m) => s + convertCurrency(m.garantia ?? 0, m.moneda as Moneda, displayCurrency, tipoCambio), 0);
    let egresosOperativos = 0;
    let egresosSubrentasRegistrados = 0; // egresos table category='subarriendo'
    let pendientes = 0;
    const unclassified: string[] = [];

    // Top vehículos — keyed by vehiculoId, ingresos brutos en displayCurrency
    const vehiculoStatsMap = new Map<string, {
      nombre: string;
      plate: string;
      ingresos: number; // bruto cobrado
      pagos: number;
    }>();

    // ── Ingresos ──────────────────────────────────────────────────────────
    for (const m of ingresos) {
      const converted = convertCurrency(m.monto, m.moneda as Moneda, displayCurrency, tipoCambio);
      totalIngresos += converted;

      const isSubrentado = m.vehiculoClasificacion === "subrentado";

      if (isSubrentado) {
        ingresosSubrentados += converted;

        const costoPago = convertCurrency(m.costoProveedorUSD ?? 0, "USD", displayCurrency, tipoCambio);
        costoSubrentas += costoPago;
        utilidadSubrentas += converted - costoPago;
      } else {
        // Default to "propio" (covers null renta_id orphan payments too)
        ingresosPropios += converted;
        if (!m.vehiculoId && m.vehiculoClasificacion !== "propio") {
          unclassified.push(m.id);
        }
      }

      // Top vehículos accumulation (bruto cobrado)
      if (m.vehiculoId) {
        const existing = vehiculoStatsMap.get(m.vehiculoId) ?? {
          nombre: m.vehiculoNombre ?? "Desconocido",
          plate: m.vehiculoPlaca ?? "",
          ingresos: 0,
          pagos: 0,
        };
        existing.ingresos += converted;
        existing.pagos += 1;
        vehiculoStatsMap.set(m.vehiculoId, existing);
      }
    }

    // ── Egresos ──────────────────────────────────────────────────────────
    for (const m of egresos) {
      const converted = convertCurrency(m.monto, m.moneda as Moneda, displayCurrency, tipoCambio);
      if (m.categoria === "devolucion_garantia") continue;
      if (m.categoria === "subarriendo") {
        egresosSubrentasRegistrados += converted;
      } else {
        egresosOperativos += converted;
      }
    }

    // ── Pendientes ───────────────────────────────────────────────────────
    if (movementsQ.data?.pendientesByMoneda) {
      for (const [mon, val] of Object.entries(movementsQ.data.pendientesByMoneda)) {
        pendientes += convertCurrency(val, mon as Moneda, displayCurrency, tipoCambio);
      }
    }

    // Los pagos registrados al proveedor sustituyen al costo estimado de su renta.
    const totalEgresosSubrentas = costoSubrentas + egresosSubrentasRegistrados;
    utilidadSubrentas = ingresosSubrentados - totalEgresosSubrentas;
    const totalEgresos = egresosOperativos + totalEgresosSubrentas;
    const neto = totalIngresos - totalEgresos;
    const margenNeto = totalIngresos > 0 ? (neto / totalIngresos) * 100 : 0;

    // ── Top Vehículos ────────────────────────────────────────────────────
    const topVehiculos = [...vehiculoStatsMap.entries()]
      .map(([id, v]) => ({ ...v, id }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 5);

    // ── Runtime Validations ──────────────────────────────────────────────
    if (Math.abs(ingresosPropios + ingresosSubrentados - totalIngresos) > 0.01) {
      console.warn("[FINANCIERO] invariant broken: ownIncome + subrentedIncome !== totalIncome", {
        totalIngresos, ingresosPropios, ingresosSubrentados,
        diff: totalIngresos - ingresosPropios - ingresosSubrentados,
        unclassified,
      });
    }
    if (unclassified.length > 0) {
      console.warn("[FINANCIERO] pagos sin vehiculo_id (clasificados como propio):", unclassified);
    }
    console.debug("[FINANCIERO] dataset", {
      totalIngresos, ingresosPropios, ingresosSubrentados,
      costoSubrentas, utilidadSubrentas,
      egresosSubrentasRegistrados, egresosOperativos,
      totalEgresosSubrentas, neto,
    });

    return {
      totalIngresos,
      ingresosPropios,
      ingresosSubrentados,
      costoSubrentas: totalEgresosSubrentas,
      garantiasRecibidas,
      utilidadSubrentas,        // ingresosSubrentados - costoSubrentas
      egresosSubrentasRegistrados, // manual egresos with cat='subarriendo'
      egresosOperativos,
      egresosSubrentas: totalEgresosSubrentas,
      totalEgresos,
      neto,
      margenNeto,
      pendientes,
      topVehiculos,
    };
  }, [movementsQ.data, displayCurrency, tipoCambio]);

  // Alias for backwards-compatibility with parts of UI still using movementSummary
  const movementSummary = financialDataset;

  const exportReportesExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    // Financial summary — all values from the unified financialDataset (real payments)
    const resumen = [
      { Métrica: "Moneda de visualización", Valor: displayCurrency },
      { Métrica: "Tipo de cambio (1 USD = ? NIO)", Valor: tipoCambio },
      { Métrica: "Período", Valor: `${dateFrom} — ${dateTo}` },
      { Métrica: "— INGRESOS (dinero realmente cobrado) —", Valor: "" },
      { Métrica: "Ingresos Totales (sin garantías)", Valor: financialDataset.totalIngresos },
      { Métrica: "Garantías recibidas reembolsables (fuera de ingresos)", Valor: financialDataset.garantiasRecibidas },
      { Métrica: "Ingresos Vehículos Propios", Valor: financialDataset.ingresosPropios },
      { Métrica: "Ingresos Vehículos Subrentados", Valor: financialDataset.ingresosSubrentados },
      { Métrica: "— EGRESOS (pagos realmente realizados) —", Valor: "" },
      { Métrica: "Egresos Operativos", Valor: financialDataset.egresosOperativos },
      { Métrica: "Costo de proveedores (según tarifa o egreso registrado)", Valor: financialDataset.costoSubrentas },
      { Métrica: "Utilidad Subrentas", Valor: financialDataset.utilidadSubrentas },
      { Métrica: "Egresos Subarriendo (manuales)", Valor: financialDataset.egresosSubrentasRegistrados },
      { Métrica: "Total Costo Subrentas", Valor: financialDataset.egresosSubrentas },
      { Métrica: "Total Egresos", Valor: financialDataset.totalEgresos },
      { Métrica: "— RESULTADO —", Valor: "" },
      { Métrica: "Ingreso Neto", Valor: financialDataset.neto },
      { Métrica: "Margen Neto (%)", Valor: `${financialDataset.margenNeto.toFixed(1)}%` },
      { Métrica: "Pagos Pendientes (fuera del período)", Valor: financialDataset.pendientes },
      { Métrica: "— FLOTA (de contratos, no financiero) —", Valor: "" },
      { Métrica: "Total Vehículos", Valor: d?.totalVehiculos ?? 0 },
      { Métrica: "Disponibles", Valor: d?.vehiculosDisponibles ?? 0 },
      { Métrica: "Rentados", Valor: d?.vehiculosRentados ?? 0 },
      { Métrica: "Mantenimiento", Valor: d?.vehiculosMantenimiento ?? 0 },
      { Métrica: "Tasa Ocupación", Valor: `${d?.occupancyRate ?? 0}%` },
      { Métrica: "Total Clientes", Valor: d?.totalClientes ?? 0 },
      { Métrica: "Total Rentas en período", Valor: d?.totalRentas ?? 0 },
      { Métrica: "Rentas Activas", Valor: d?.rentasActivas ?? 0 },
      { Métrica: "Rentas Finalizadas", Valor: d?.rentasFinalizadas ?? 0 },
      { Métrica: "Duración Promedio (días)", Valor: d?.avgDuration?.toFixed(1) ?? 0 },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen");

    // Top vehículos — from real payments
    const topRows = financialDataset.topVehiculos.map((v, i) => ({
      "#": i + 1,
      Vehículo: v.nombre,
      Placa: v.plate,
      "Pagos Recibidos": v.pagos,
      [`Ingresos (${displayCurrency})`]: v.ingresos,
    }));
    if (topRows.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topRows), "Top Vehículos");
    }

    if ((d?.proxMantenimientos ?? []).length > 0) {
      const mantRows = d!.proxMantenimientos.map((m) => ({
        Vehículo: m.vehiculo,
        Placa: m.placa,
        Tipo: m.tipo,
        Fecha: m.fecha,
        Taller: m.taller,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mantRows), "Mantenimientos");
    }

    if ((d?.segurosVencer ?? []).length > 0) {
      const segRows = d!.segurosVencer.map((s) => ({
        Vehículo: s.vehiculo,
        Placa: s.placa,
        Aseguradora: s.aseguradora,
        Vence: s.fechaVencimiento,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(segRows), "Seguros");
    }

    if (movementsQ.data) {
      const allMovements = [...movementsQ.data.ingresos, ...movementsQ.data.egresos];
      allMovements.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const movRows = allMovements.map((m) => ({
        Fecha: m.fecha,
        Tipo: m.tipo === "ingreso" ? "Ingreso" : "Egreso",
        Categoría: m.categoria === "pago" ? "Pago" : (EGRESO_CATEGORIA_LABELS[m.categoria] ?? m.categoria),
        Descripción: m.descripcion,
        Referencia: m.referencia,
        Cliente: m.cliente,
        Factura: m.factura,
        Vehículo: m.vehiculoNombre ?? "—",
        Placa: m.vehiculoPlaca ?? "—",
        Clasificación: m.vehiculoClasificacion ?? "—",
        Método: m.metodo,
        Moneda: m.moneda,
        [`Monto (${m.moneda})`]: m.tipo === "ingreso" ? m.monto : -m.monto,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movRows), "Movimientos");
    }

    XLSX.writeFile(wb, `reporte_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [financialDataset, d, dateFrom, dateTo, displayCurrency, tipoCambio, movementsQ.data]);

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md p-4 shadow-xs"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Reportes y Análisis Financiero
            </h1>
            <Badge variant="outline" className="border-gold/40 text-gold bg-gold/10 text-[10px] uppercase font-semibold tracking-wider">
              Ejecutivo
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ingresos sin garantías reembolsables. Subrentas: cobro al cliente menos costo del proveedor.
            Las devoluciones de garantía quedan fuera de los gastos operativos.
            {financialDataset.garantiasRecibidas > 0 && ` Garantías recibidas en el período: ${formatCurrency(financialDataset.garantiasRecibidas, displayCurrency)} (fuera de ingresos).`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Moneda selector */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 shadow-2xs">
            <button
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                displayCurrency === "NIO"
                  ? "bg-gold text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setDisplayCurrency("NIO")}
            >
              NIO (C$)
            </button>
            <button
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                displayCurrency === "USD"
                  ? "bg-gold text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setDisplayCurrency("USD")}
            >
              USD ($)
            </button>
          </div>

          {/* Selector de Período y Preajustes por Mes */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5 shadow-2xs">
            <button
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                periodPreset === "this_month"
                  ? "bg-gold text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => applyPeriodPreset("this_month")}
            >
              Este Mes
            </button>
            <button
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                periodPreset === "last_month"
                  ? "bg-gold text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => applyPeriodPreset("last_month")}
            >
              Mes Anterior
            </button>
            <button
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                periodPreset === "3_months"
                  ? "bg-gold text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => applyPeriodPreset("3_months")}
            >
              Últimos 3M
            </button>
            <button
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                periodPreset === "year"
                  ? "bg-gold text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => applyPeriodPreset("year")}
            >
              Año Actual
            </button>
            <button
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                periodPreset === "custom_month"
                  ? "bg-gold text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setPeriodPreset("custom_month")}
            >
              Por Meses
            </button>
          </div>

          {periodPreset === "custom_month" ? (
            <div className="flex items-center gap-1">
              <input
                type="month"
                value={startMonth}
                onChange={(e) => handleMonthRangeChange(e.target.value, endMonth)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-gold"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <input
                type="month"
                value={endMonth}
                onChange={(e) => handleMonthRangeChange(startMonth, e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-gold"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPeriodPreset("custom_dates");
                }}
                className="h-8 w-32 rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-gold"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPeriodPreset("custom_dates");
                }}
                className="h-8 w-32 rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-gold"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-8 bg-gold hover:bg-gold-hover text-white text-xs font-semibold gap-1.5 px-3 rounded-lg shadow-xs"
              onClick={() => setFinancialPdfModalOpen(true)}
            >
              <FileText className="size-3.5" /> Estado de Resultados PDF
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg"
              onClick={exportReportesExcel}
              title="Exportar a Excel"
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => reportQ.refetch()}
              className="size-8 rounded-lg"
              title="Actualizar datos"
            >
              <RefreshCw className={`size-3.5 ${reportQ.isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Financial Pillars Executive Summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              {/* KPI 1: Ingresos Totales */}
              <motion.div
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 shadow-xs transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10 hover:border-amber-500/40"
              >
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-amber-500 to-amber-300" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        1. Ingresos Totales (Bruto)
                      </p>
                      <p className="text-2xl font-black tracking-tight text-foreground tabular-nums">
                        {formatCurrency(movementSummary.totalIngresos, displayCurrency)}
                      </p>
                    </div>
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25">
                      <DollarSign className="size-5" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-amber-500/10 pt-2">
                    <span>Cobrado en el período</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">100%</span>
                  </div>
                </div>
              </motion.div>

              {/* KPI 2: Egresos Operativos */}
              <motion.div
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="group relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent p-5 shadow-xs transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-500/40"
              >
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-orange-500 to-amber-400" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                        2. Egresos Operativos
                      </p>
                      <p className="text-2xl font-black tracking-tight text-orange-600 dark:text-orange-400 tabular-nums">
                        {formatCurrency(movementSummary.egresosOperativos, displayCurrency)}
                      </p>
                    </div>
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/25">
                      <Wrench className="size-5" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-orange-500/10 pt-2">
                    <span>Combustible, taller, seguros...</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {movementSummary.totalIngresos > 0
                        ? `${((movementSummary.egresosOperativos / movementSummary.totalIngresos) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* KPI 3: Egresos de Subrentas */}
              <motion.div
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-5 shadow-xs transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-500/40"
              >
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 to-indigo-400" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                        3. Egresos Subrentas
                      </p>
                      <p className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400 tabular-nums">
                        {formatCurrency(movementSummary.egresosSubrentas, displayCurrency)}
                      </p>
                    </div>
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25">
                      <Car className="size-5" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-purple-500/10 pt-2">
                    <span>Pagos por autos subarrendados</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {movementSummary.totalIngresos > 0
                        ? `${((movementSummary.egresosSubrentas / movementSummary.totalIngresos) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* KPI 4: Ingreso Neto Real */}
              <motion.div
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className={`group relative overflow-hidden rounded-2xl border p-5 shadow-xs transition-all duration-300 hover:shadow-lg ${
                  movementSummary.neto >= 0
                    ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent hover:border-emerald-500/50 hover:shadow-emerald-500/10"
                    : "border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent hover:border-rose-500/50 hover:shadow-rose-500/10"
                }`}
              >
                <div className={`absolute top-0 left-0 h-1 w-full ${movementSummary.neto >= 0 ? "bg-gradient-to-r from-emerald-500 to-teal-300" : "bg-gradient-to-r from-rose-500 to-pink-300"}`} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${movementSummary.neto >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                        4. Ingreso Neto Real
                      </p>
                      <p className={`text-2xl font-black tracking-tight tabular-nums ${movementSummary.neto >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {formatCurrency(movementSummary.neto, displayCurrency)}
                      </p>
                    </div>
                    <div className={`grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-md ${
                      movementSummary.neto >= 0
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
                        : "bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25"
                    }`}>
                      {movementSummary.neto >= 0 ? (
                        <TrendingUp className="size-5" />
                      ) : (
                        <TrendingDown className="size-5" />
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2">
                    <span>Margen de Ganancia</span>
                    <span className={`font-bold ${movementSummary.neto >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {movementSummary.margenNeto.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* Visual Financial Flow Breakdown Bar */}
        {!isLoading && movementSummary.totalIngresos > 0 && (
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Distribución del Ingreso Total ({formatCurrency(movementSummary.totalIngresos, displayCurrency)})</span>
              <span className="text-muted-foreground font-normal text-[11px]">Desglose de Costos vs Utilidad Neta</span>
            </div>
            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-muted p-0.5 border border-border/40 gap-0.5">
              {/* Egresos Operativos Bar */}
              <div
                className="h-full rounded-l-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, (movementSummary.egresosOperativos / movementSummary.totalIngresos) * 100))}%`,
                }}
                title={`Egresos Operativos: ${formatCurrency(movementSummary.egresosOperativos, displayCurrency)}`}
              />
              {/* Egresos Subrentas Bar */}
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, (movementSummary.egresosSubrentas / movementSummary.totalIngresos) * 100))}%`,
                }}
                title={`Egresos Subrentas: ${formatCurrency(movementSummary.egresosSubrentas, displayCurrency)}`}
              />
              {/* Utilidad Neta Bar */}
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, (Math.max(0, movementSummary.neto) / movementSummary.totalIngresos) * 100))}%`,
                }}
                title={`Utilidad Neta: ${formatCurrency(movementSummary.neto, displayCurrency)}`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-orange-500" />
                <span>Operativos: <strong className="text-foreground">{formatCurrency(movementSummary.egresosOperativos, displayCurrency)}</strong> ({((movementSummary.egresosOperativos / movementSummary.totalIngresos) * 100).toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-purple-500" />
                <span>Subrentas: <strong className="text-foreground">{formatCurrency(movementSummary.egresosSubrentas, displayCurrency)}</strong> ({((movementSummary.egresosSubrentas / movementSummary.totalIngresos) * 100).toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                <span>Ingreso Neto: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(movementSummary.neto, displayCurrency)}</strong> ({movementSummary.margenNeto.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Revenue Breakdown — all values from financialDataset (real payments only) */}
      {(financialDataset.ingresosSubrentados > 0 || financialDataset.egresosSubrentas > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] as const }}
          className="grid gap-4 sm:grid-cols-3"
        >
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-card/80 backdrop-blur-md px-5 py-4 shadow-2xs hover:border-amber-500/40 transition-all">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Ingresos Vehículos Propios
              </p>
              <p className="mt-0.5 text-xl font-extrabold text-foreground tabular-nums">
                {formatCurrency(financialDataset.ingresosPropios, displayCurrency)}
              </p>
            </div>
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Car className="size-5" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-purple-500/20 bg-card/80 backdrop-blur-md px-5 py-4 shadow-2xs hover:border-purple-500/40 transition-all">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Ingresos Vehículos Subrentados
              </p>
              <p className="mt-0.5 text-xl font-extrabold text-foreground tabular-nums">
                {formatCurrency(financialDataset.ingresosSubrentados, displayCurrency)}
              </p>
            </div>
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Wallet className="size-5" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-card/80 backdrop-blur-md px-5 py-4 shadow-2xs hover:border-rose-500/40 transition-all">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Costo de proveedores
              </p>
              <p className="mt-0.5 text-xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                {formatCurrency(financialDataset.costoSubrentas, displayCurrency)}
              </p>
              {financialDataset.utilidadSubrentas > 0 && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Utilidad: {formatCurrency(financialDataset.utilidadSubrentas, displayCurrency)}
                </p>
              )}
            </div>
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <TrendingDown className="size-5" />
            </div>
          </div>
        </motion.div>
      )}



      {/* Financial Movements Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] as const }}
      >
        <Card className="border border-border/80 bg-card/80 backdrop-blur-md overflow-hidden rounded-2xl shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <div className="grid size-7 place-items-center rounded-lg bg-gold/15 text-gold">
                    <Activity className="size-4" />
                  </div>
                  Movimientos Financieros
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Registro cronológico detallado de todos los ingresos y egresos del período
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 shadow-2xs">
                  {(
                    [
                      { id: "todos", label: "Todos" },
                      { id: "ingresos", label: "Ingresos" },
                      { id: "egresos_todos", label: "Egresos Totales" },
                      { id: "egresos_operativos", label: "Egresos Operativos" },
                      { id: "egresos_subrentas", label: "Solo Subrentas" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                        movementFilter === f.id
                          ? "bg-gold text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setMovementFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Dropdown de Categoría */}
                <select
                  value={movementCategory}
                  onChange={(e) => setMovementCategory(e.target.value)}
                  className="h-8 rounded-xl border border-input bg-background px-2.5 text-xs text-foreground outline-none focus:border-gold transition-colors"
                >
                  <option value="todos">Todas las categorías</option>
                  {movementCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === "pago" ? "Pago" : (EGRESO_CATEGORIA_LABELS[cat] ?? cat)}
                    </option>
                  ))}
                </select>

                {/* Input de Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente, factura, ref..."
                    value={movementSearch}
                    onChange={(e) => setMovementSearch(e.target.value)}
                    className="h-8 w-44 rounded-xl border-input bg-background pl-8 text-xs placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-gold"
                  />
                </div>

                {/* Botones de Acción (+ Ingreso / + Egreso) */}
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1 px-3 rounded-xl shadow-xs"
                    onClick={() => handleOpenCreate("ingreso")}
                  >
                    <Plus className="size-3.5" /> Ingreso
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold gap-1 px-3 rounded-xl shadow-xs"
                    onClick={() => handleOpenCreate("egreso")}
                  >
                    <Plus className="size-3.5" /> Egreso
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {movementsQ.isLoading ? (
              <div className="p-6">
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <Activity className="mb-2 size-10 text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">
                  Sin movimientos financieros registrados
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No se encontraron registros para los filtros seleccionados en este período.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Fecha
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Tipo
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Categoría
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Descripción
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Ref.
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Cliente / Proveedor
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Factura
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Método
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Moneda
                        </TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Monto
                        </TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Costo Subrenta
                        </TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Estado
                        </TableHead>
                        <TableHead className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMovements.map((m) => (
                        <TableRow
                          key={m.id}
                          className="hover:bg-muted/30 transition-colors border-b border-border/40"
                        >
                          <TableCell className="text-xs font-medium text-muted-foreground tabular-nums whitespace-nowrap py-3">
                            {formatDate(m.fecha)}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold rounded-lg ${
                                m.tipo === "ingreso"
                                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                  : "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                              }`}
                            >
                              {m.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {m.categoria === "pago" ? (
                              <Badge variant="outline" className="border-gold/30 text-gold bg-gold/10 text-[10px] font-semibold">
                                Pago
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold ${
                                  EGRESO_CATEGORIA_COLORS[m.categoria] ?? "bg-neutral-500/15 text-neutral-700 dark:text-neutral-300 border-neutral-500/30"
                                }`}
                              >
                                {EGRESO_CATEGORIA_LABELS[m.categoria] ?? m.categoria}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-44 truncate text-xs font-medium text-foreground py-3">
                            {m.descripcion || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-3">
                            {m.referencia ? (
                              <span className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">
                                {m.referencia}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground py-3">
                            {m.cliente || "—"}
                          </TableCell>
                          <TableCell className="py-3">
                            {m.factura ? (
                              <span className="font-mono text-xs text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-md font-semibold">
                                {m.factura}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground capitalize py-3">
                            {m.metodo || "—"}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-muted-foreground tabular-nums py-3">
                            {m.moneda}
                          </TableCell>
                          <TableCell
                            className={`text-right text-xs font-bold tabular-nums whitespace-nowrap py-3 ${
                              m.tipo === "ingreso"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {m.tipo === "ingreso" ? "+" : "-"}
                            {formatCurrency(m.monto, m.moneda as Moneda)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium tabular-nums whitespace-nowrap py-3">
                            {m.costoSubrenta != null && m.costoSubrenta > 0 ? (
                              <div>
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                  {formatCurrency(m.costoSubrenta, m.moneda as Moneda)}
                                </span>
                                {m.utilidadSubrenta != null && (
                                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                                    Util: {formatCurrency(m.utilidadSubrenta, m.moneda as Moneda)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                m.estado === "completado" || m.estado === "pagado"
                                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                  : m.estado === "pendiente"
                                    ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                    : "border-neutral-500/30 text-neutral-600 dark:text-neutral-400 bg-neutral-500/10"
                              }`}
                            >
                              {m.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(m);
                                }}
                                title="Editar"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDelete(m);
                                }}
                                title="Eliminar"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Sub-totales / Summary Footer */}
                <div className="border-t border-border/60 bg-muted/30 px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-muted-foreground">
                      Mostrando <strong className="text-foreground">{paginatedMovements.length}</strong> de <strong className="text-foreground">{movements.length}</strong> movimientos en el período
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Total Ingresos:</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                          +{formatCurrency(movementSummary.totalIngresos, displayCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Total Egresos:</span>
                        <span className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                          -{formatCurrency(movementSummary.totalEgresos, displayCurrency)}
                        </span>
                      </div>
                      {financialDataset.costoSubrentas > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Costo Subrentas:</span>
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                            {formatCurrency(financialDataset.costoSubrentas, displayCurrency)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pl-4 border-l border-border/80">
                        <span className="text-xs font-bold text-foreground">Ganancia Neta:</span>
                        <span
                          className={`text-sm font-black tabular-nums ${
                            movementSummary.neto >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {movementSummary.neto >= 0 ? "+" : ""}
                          {formatCurrency(movementSummary.neto, displayCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pagination */}
                {movements.length > MOVEMENT_PAGE_SIZE && (
                  <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 bg-card">
                    <p className="text-xs text-muted-foreground">
                      Página <strong className="text-foreground">{movementPage}</strong> de <strong className="text-foreground">{totalMovementPages}</strong>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs font-medium rounded-lg"
                        disabled={movementPage <= 1}
                        onClick={() => setMovementPage((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs font-medium rounded-lg"
                        disabled={movementPage >= totalMovementPages}
                        onClick={() => setMovementPage((p) => Math.min(totalMovementPages, p + 1))}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>



      {/* Top Performers + Fleet Status */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="grid gap-6 lg:grid-cols-3"
      >
        {/* Top Vehicles */}
        <Card className="border-[#E5E7EB]/70 dark:border-[#1F2937]/70 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#111827] dark:text-white">
              <Award className="size-4 text-gold" />
              Top Vehículos por Ingresos
            </CardTitle>
            <CardDescription className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Vehículos que generan mayores ingresos en el período
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movementsQ.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : financialDataset.topVehiculos.length > 0 ? (
              <div className="space-y-2">
                {financialDataset.topVehiculos.map((v, i) => {
                  const maxIncome = financialDataset.topVehiculos[0]?.ingresos ?? 1;
                  const barWidth = maxIncome > 0 ? (v.ingresos / maxIncome) * 100 : 0;
                  return (
                    <div
                      key={v.id}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#1A1A2E]"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#F3F4F6] dark:bg-[#1F2937] text-[10px] font-bold text-[#6B7280] dark:text-[#9CA3AF]">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-medium text-[#111827] dark:text-white">
                            {v.nombre}{v.plate ? ` (${v.plate})` : ""}
                          </p>
                          <span className="shrink-0 text-xs font-semibold text-[#111827] dark:text-white tabular-nums">
                            {formatCurrency(v.ingresos, displayCurrency)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#1F2937]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-gold to-gold/60 transition-all duration-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                            {v.pagos} {v.pagos === 1 ? "pago" : "pagos"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                Sin pagos registrados por vehículo en este período
              </p>
            )}
          </CardContent>
        </Card>

        {/* Fleet Status */}
        <Card className="border-[#E5E7EB]/70 dark:border-[#1F2937]/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#111827] dark:text-white">
              <Activity className="size-4 text-blue-500" />
              Estado de Flota
            </CardTitle>
            <CardDescription className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Distribución actual de flota
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full rounded-xl" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-[#F9FAFB] dark:bg-[#1A1A2E] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-green-500" />
                    <span className="text-sm text-[#111827] dark:text-white">Disponibles</span>
                  </div>
                  <span className="text-sm font-bold text-[#111827] dark:text-white tabular-nums">
                    {d?.vehiculosDisponibles ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-[#F9FAFB] dark:bg-[#1A1A2E] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-blue-500" />
                    <span className="text-sm text-[#111827] dark:text-white">Rentados</span>
                  </div>
                  <span className="text-sm font-bold text-[#111827] dark:text-white tabular-nums">
                    {d?.vehiculosRentados ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-[#F9FAFB] dark:bg-[#1A1A2E] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-amber-500" />
                    <span className="text-sm text-[#111827] dark:text-white">Reservados</span>
                  </div>
                  <span className="text-sm font-bold text-[#111827] dark:text-white tabular-nums">
                    {d?.vehiculosReservados ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-[#F9FAFB] dark:bg-[#1A1A2E] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-red-500" />
                    <span className="text-sm text-[#111827] dark:text-white">Mantenimiento</span>
                  </div>
                  <span className="text-sm font-bold text-[#111827] dark:text-white tabular-nums">
                    {d?.vehiculosMantenimiento ?? 0}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-xl bg-gradient-to-r from-gold/5 to-transparent px-4 py-2.5">
                  <span className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                    Flota total
                  </span>
                  <span className="text-sm font-bold text-[#111827] dark:text-white tabular-nums">
                    {d?.totalVehiculos ?? 0}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming Events */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="grid gap-6 lg:grid-cols-2"
      >
        {/* Maintenance */}
        <Card className="border-[#E5E7EB]/70 dark:border-[#1F2937]/70 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#111827] dark:text-white">
              <Wrench className="size-4 text-amber-500" />
              Próximos Mantenimientos
            </CardTitle>
            <CardDescription className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Programados en los próximos 30 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : (d?.proxMantenimientos ?? []).length > 0 ? (
              <div className="space-y-2">
                {d!.proxMantenimientos.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-[#E5E7EB]/60 dark:border-[#1F2937]/60 p-3 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#1A1A2E]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/15">
                        <Wrench className="size-3.5 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111827] dark:text-white truncate">
                          {m.vehiculo}
                        </p>
                        <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                          {m.tipo}
                          {m.taller ? ` · ${m.taller}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20"
                      >
                        {formatDate(m.fecha)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Wrench className="size-8 text-[#D1D5DB] dark:text-[#374151] mb-2" />
                <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                  Sin mantenimientos programados
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insurance */}
        <Card className="border-[#E5E7EB]/70 dark:border-[#1F2937]/70 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#111827] dark:text-white">
              <Shield className="size-4 text-red-500" />
              Seguros por Vencer
            </CardTitle>
            <CardDescription className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Pólizas por vencer en los próximos 60 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : (d?.segurosVencer ?? []).length > 0 ? (
              <div className="space-y-2">
                {d!.segurosVencer.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-[#E5E7EB]/60 dark:border-[#1F2937]/60 p-3 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#1A1A2E]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-red-500/15">
                        <Shield className="size-3.5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111827] dark:text-white truncate">
                          {s.vehiculo}
                        </p>
                        <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                          {s.aseguradora}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20"
                      >
                        {formatDate(s.fechaVencimiento)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="size-8 text-[#D1D5DB] dark:text-[#374151] mb-2" />
                <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                  Sin seguros próximos a vencer
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* CRUD Modal for Create / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#0F0F1A] p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-[#111827] dark:text-white">
              {modalMode === "create" ? "Nuevo Movimiento" : "Editar Movimiento"} ({modalType === "ingreso" ? "Ingreso" : "Egreso"})
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1 text-[#6B7280] dark:text-[#9CA3AF]">Fecha</label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              {modalType === "egreso" && (
                <div>
                  <label className="block font-medium mb-1 text-[#6B7280] dark:text-[#9CA3AF]">Concepto</label>
                  <Input
                    type="text"
                    placeholder="ej. Mantenimiento de vehículo"
                    value={formData.concepto}
                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {modalType === "egreso" && (
                <div>
                  <label className="block font-medium mb-1 text-[#6B7280] dark:text-[#9CA3AF]">Categoría</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="h-9 w-full rounded-lg border border-[#E5E7EB] dark:border-[#1F2937] bg-transparent px-3 text-xs"
                  >
                    {Object.entries(EGRESO_CATEGORIA_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-[#6B7280] dark:text-[#9CA3AF]">Monto</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-[#6B7280] dark:text-[#9CA3AF]">Moneda</label>
                  <select
                    value={formData.moneda}
                    onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                    className="h-9 w-full rounded-lg border border-[#E5E7EB] dark:border-[#1F2937] bg-transparent px-3 text-xs"
                  >
                    <option value="NIO">NIO</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-[#6B7280] dark:text-[#9CA3AF]">Método</label>
                  <select
                    value={formData.metodo}
                    onChange={(e) => setFormData({ ...formData, metodo: e.target.value })}
                    className="h-9 w-full rounded-lg border border-[#E5E7EB] dark:border-[#1F2937] bg-transparent px-3 text-xs"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                {modalType === "ingreso" && (
                  <div>
                    <label className="block font-medium mb-1 text-[#6B7280] dark:text-[#9CA3AF]">Estado</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="h-9 w-full rounded-lg border border-[#E5E7EB] dark:border-[#1F2937] bg-transparent px-3 text-xs"
                    >
                      <option value="pagado">Pagado</option>
                      <option value="parcial">Parcial</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                  </div>
                )}
              </div>

              {modalType === "ingreso" && (
                <div>
                  <label className="block font-medium mb-1 text-[#6B7280] dark:text-[#9CA3AF]">Referencia / N° Transacción</label>
                  <Input
                    type="text"
                    placeholder="ej. TR-98214"
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {modalType === "egreso" && (
                <div>
                  <label className="block font-medium mb-1 text-[#6B7280] dark:text-[#9CA3AF]">Responsable</label>
                  <Input
                    type="text"
                    placeholder="Nombre del responsable"
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="h-8 text-xs">
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveMovement} className="h-8 bg-gold hover:bg-gold/90 text-white text-xs">
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#0F0F1A] p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-[#111827] dark:text-white">¿Eliminar Movimiento?</h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Esta acción marcará el movimiento como eliminado. ¿Deseas continuar?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)} className="h-8 text-xs">
                Cancelar
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteConfirm} className="h-8 text-xs">
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Financial PDF Reports Modal */}
      <FinancialReportsModal
        open={financialPdfModalOpen}
        onOpenChange={setFinancialPdfModalOpen}
        defaultMoneda={displayCurrency}
        vehiculosList={vehiculosQ.data ?? []}
      />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({ meta: [{ title: "Reportes y Análisis — TM RENT A CAR" }] }),
  component: Page,
});
