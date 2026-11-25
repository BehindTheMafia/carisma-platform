import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Printer,
  Share2,
  Mail,
  RefreshCw,
  SlidersHorizontal,
  FileCheck,
  Building2,
} from "lucide-react";
import {
  obtenerDatosReporteFinanciero,
  type ReporteFinancieroFiltros,
  type PeriodoPreset,
  type TipoDocumentoFinanciero,
  type DatosReporteFinancieroCalculados,
} from "@/lib/reportes-pdf-query";
import { generarPDFReporteFinanciero } from "@/utils/pdfGeneratorFinancial";
import { type Moneda } from "@/lib/format";
import { toast } from "sonner";

interface FinancialReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMoneda?: Moneda;
  vehiculosList?: { id: string; nombre: string }[];
}

export const FinancialReportsModal: React.FC<FinancialReportsModalProps> = ({
  open,
  onOpenChange,
  defaultMoneda = "NIO",
  vehiculosList = [],
}) => {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoFinanciero>("operativo_completo");
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>("este_mes");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().slice(0, 10));
  const [moneda, setMoneda] = useState<Moneda>(defaultMoneda);
  const [vehiculoId, setVehiculoId] = useState("todos");
  const [metodoPago, setMetodoPago] = useState("todos");
  const [estadoContrato, setEstadoContrato] = useState("todos");

  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [calculosData, setCalculosData] = useState<DatosReporteFinancieroCalculados | null>(null);

  // Generar reporte en tiempo real al abrir o cambiar filtros
  const cargarYGenerarPDF = async () => {
    setLoading(true);
    try {
      const filtros: ReporteFinancieroFiltros = {
        tipoDocumento,
        periodoPreset,
        fechaInicio,
        fechaFin,
        moneda,
        vehiculoId,
        metodoPago,
        estadoContrato,
        usuario: "Administrador",
      };

      const datosCalculados = await obtenerDatosReporteFinanciero(filtros);
      setCalculosData(datosCalculados);

      const pdfDoc = await generarPDFReporteFinanciero(datosCalculados);
      const pdfBlob = pdfDoc.output("blob");
      const url = URL.createObjectURL(pdfBlob);

      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      setBlobUrl(url);
    } catch (err) {
      console.error("Error al generar reporte financiero:", err);
      toast.error("Ocurrió un error al calcular los datos contables.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      cargarYGenerarPDF();
    } else if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  }, [open, tipoDocumento, periodoPreset, fechaInicio, fechaFin, moneda, vehiculoId, metodoPago, estadoContrato]);

  const handleDownload = async () => {
    if (!calculosData) return;
    try {
      const pdfDoc = await generarPDFReporteFinanciero(calculosData);
      const nombreArchivo = `${tipoDocumento === "operativo_completo" ? "Estado_Resultados_Operativo" : "Estado_Resultados_Flota_Propia"}_${calculosData.filtros.periodoPreset}_${moneda}.pdf`;
      pdfDoc.save(nombreArchivo);
      toast.success("Documento PDF descargado exitosamente.");
    } catch (err) {
      toast.error("Error al descargar el archivo PDF.");
    }
  };

  const handlePrint = () => {
    if (!blobUrl) return;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    };
  };

  const handleShareEmail = () => {
    if (!calculosData) return;
    const subject = encodeURIComponent(
      `Estado de Resultados (${tipoDocumento === "operativo_completo" ? "Operativo General" : "Solo Flota Propia"}) - ${calculosData.periodoLabel}`
    );
    const body = encodeURIComponent(
      `Estimados,\n\nAdjunto resumen del ${subject}:\n\n` +
        `• Ingresos Totales: ${moneda === "USD" ? "US$" : "C$"} ${calculosData.totalIngresos.toLocaleString()}\n` +
        `• Egresos Operativos: ${moneda === "USD" ? "US$" : "C$"} ${calculosData.totalEgresosOperativos.toLocaleString()}\n` +
        `• Utilidad Neta Real: ${moneda === "USD" ? "US$" : "C$"} ${calculosData.utilidadNeta.toLocaleString()} (Margen: ${calculosData.margenNetaPct.toFixed(1)}%)\n\n` +
        `Generado automáticamente desde ERP Carisma Platform.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[92dvh] p-0 overflow-hidden border-border/80 bg-card">
        <div className="flex min-h-0 flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-4 sm:px-6 py-4 pr-10 border-b border-border/60 bg-muted/20 flex-col sm:flex-row items-start sm:items-center justify-between gap-3 space-y-0">
            <div>
              <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
                <FileText className="size-5 text-gold" />
                Módulo de Reportes Financieros (PDF Contable)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Generación y auditoría de Estados de Resultados para presentación ejecutiva e impresión
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs rounded-xl"
                onClick={handlePrint}
                disabled={!blobUrl || loading}
              >
                <Printer className="size-3.5" /> Imprimir
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs rounded-xl"
                onClick={handleShareEmail}
                disabled={!blobUrl || loading}
              >
                <Mail className="size-3.5" /> Enviar por Correo
              </Button>
              <Button
                size="sm"
                className="bg-gold hover:bg-gold-hover text-white gap-1.5 text-xs font-semibold rounded-xl shadow-xs"
                onClick={handleDownload}
                disabled={!blobUrl || loading}
              >
                <Download className="size-3.5" /> Descargar PDF
              </Button>
            </div>
          </DialogHeader>

          {/* Main Grid Content */}
          <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
            {/* Sidebar Filtros (3 cols) */}
            <div className="lg:col-span-4 border-r border-border/60 p-4 sm:p-5 space-y-5 lg:overflow-y-auto bg-muted/10">
              {/* Tipo de Documento */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileCheck className="size-3.5 text-gold" /> Tipo de Estado Financiero
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      tipoDocumento === "operativo_completo"
                        ? "border-gold bg-gold/10 shadow-2xs"
                        : "border-border/60 bg-card hover:bg-muted/40"
                    }`}
                    onClick={() => setTipoDocumento("operativo_completo")}
                  >
                    <span className="text-xs font-bold text-foreground">1. Estado de Resultados Operativo</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      Operación completa: flota propia, subarriendos y egresos categorizados.
                    </span>
                  </button>
                  <button
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      tipoDocumento === "flota_propia"
                        ? "border-gold bg-gold/10 shadow-2xs"
                        : "border-border/60 bg-card hover:bg-muted/40"
                    }`}
                    onClick={() => setTipoDocumento("flota_propia")}
                  >
                    <span className="text-xs font-bold text-foreground">2. Solo Flota Propia</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      Excluye totalmente subarriendos y vehículos de terceros.
                    </span>
                  </button>
                </div>
              </div>

              {/* Período */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="size-3.5 text-gold" /> Período Contable
                </label>
                <select
                  value={periodoPreset}
                  onChange={(e) => setPeriodoPreset(e.target.value as PeriodoPreset)}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-gold"
                >
                  <option value="hoy">Hoy</option>
                  <option value="ayer">Ayer</option>
                  <option value="esta_semana">Esta Semana</option>
                  <option value="semana_anterior">Semana Anterior</option>
                  <option value="este_mes">Este Mes</option>
                  <option value="mes_anterior">Mes Anterior</option>
                  <option value="este_ano">Este Año</option>
                  <option value="ano_anterior">Año Anterior</option>
                  <option value="personalizado">Rango Personalizado</option>
                </select>

                {periodoPreset === "personalizado" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Desde:</span>
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Hasta:</span>
                      <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Moneda */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Moneda de Presentación
                </label>
                <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
                  <button
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                      moneda === "NIO" ? "bg-gold text-white shadow-xs" : "text-muted-foreground"
                    }`}
                    onClick={() => setMoneda("NIO")}
                  >
                    NIO (Córdobas C$)
                  </button>
                  <button
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                      moneda === "USD" ? "bg-gold text-white shadow-xs" : "text-muted-foreground"
                    }`}
                    onClick={() => setMoneda("USD")}
                  >
                    USD (Dólares $)
                  </button>
                </div>
              </div>

              {/* Filtros Opcionales */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Filtros Adicionales
                </label>

                <div>
                  <span className="text-[11px] text-muted-foreground">Vehículo:</span>
                  <select
                    value={vehiculoId}
                    onChange={(e) => setVehiculoId(e.target.value)}
                    className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground mt-0.5"
                  >
                    <option value="todos">Todos los vehículos</option>
                    {vehiculosList.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground">Método de Pago:</span>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground mt-0.5"
                  >
                    <option value="todos">Todos los métodos</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>

              {/* Resumen de Cómputo Auditado */}
              {calculosData && (
                <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-2 text-xs shadow-2xs">
                  <span className="font-bold text-foreground text-xs flex items-center justify-between">
                    <span>Resumen Auditado</span>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px]">
                      OK
                    </Badge>
                  </span>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Ingresos Brutos:</span>
                    <strong className="text-foreground">{moneda === "USD" ? "$" : "C$"} {calculosData.totalIngresos.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Egresos Operativos:</span>
                    <strong className="text-rose-600 dark:text-rose-400">-{moneda === "USD" ? "$" : "C$"} {calculosData.totalEgresosOperativos.toLocaleString()}</strong>
                  </div>
                  {tipoDocumento === "operativo_completo" && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Costo Subarriendos:</span>
                      <strong className="text-purple-600 dark:text-purple-400">-{moneda === "USD" ? "$" : "C$"} {calculosData.totalCostoProveedorSubarriendos.toLocaleString()}</strong>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-border/60 text-foreground font-bold">
                    <span>Utilidad Neta:</span>
                    <span className={calculosData.utilidadNeta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                      {moneda === "USD" ? "$" : "C$"} {calculosData.utilidadNeta.toLocaleString()} ({calculosData.margenNetaPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Main Vista Previa Iframe (8 cols) */}
            <div className="min-h-[60dvh] lg:min-h-0 lg:col-span-8 bg-muted/30 relative flex flex-col items-center justify-center p-4">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="size-8 text-gold animate-spin" />
                  <p className="text-sm font-semibold text-foreground">Calculando estados contables y generando PDF...</p>
                </div>
              ) : blobUrl ? (
                <iframe
                  src={blobUrl}
                  className="w-full h-full rounded-2xl border border-border/80 bg-white shadow-md"
                  title="Vista Previa Estado de Resultados PDF"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="size-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Sin documento generado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
