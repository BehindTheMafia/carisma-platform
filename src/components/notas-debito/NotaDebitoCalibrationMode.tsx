import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Upload,
  Save,
  RotateCcw,
  Printer,
  Grid3x3,
  Ruler,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  GripVertical,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { generateNotaDebitoPDF } from "@/utils/pdfGeneratorNotaDebito";
import { type NotaDebitoFormData } from "@/types/notas-debito";
import {
  type CalibrationOffsets,
  type OffsetXY,
  DEFAULT_OFFSETS,
  getNotaDebitoCalibrationOffsets,
  saveNotaDebitoCalibrationOffsets,
  resetNotaDebitoCalibrationOffsets,
  getNotaDebitoCalibrationImageURL,
  saveNotaDebitoCalibrationImageURL,
  clearNotaDebitoCalibrationImageURL,
} from "@/utils/calibrationNotaDebitoStorage";

// Half Letter Landscape dimensions in pixels (scaled)
const PAGE_W = 612; // 8.5 in * 72 DPI
const PAGE_H = 396; // 5.5 in * 72 DPI

const BLOCK_META: {
  key: keyof CalibrationOffsets;
  label: string;
  color: string;
  yStartMm: number;
  yEndMm: number;
}[] = [
  { key: "fecha", label: "Fecha y N.º", color: "#f59e0b", yStartMm: 8, yEndMm: 24 },
  { key: "cliente", label: "Datos Cliente", color: "#3b82f6", yStartMm: 24, yEndMm: 50 },
  { key: "tabla", label: "Tabla Ítems", color: "#8b5cf6", yStartMm: 50, yEndMm: 95 },
  { key: "totales", label: "Totales", color: "#10b981", yStartMm: 95, yEndMm: 118 },
  { key: "observaciones", label: "Observaciones", color: "#ec4899", yStartMm: 115, yEndMm: 128 },
  { key: "firmas", label: "Firmas", color: "#06b6d4", yStartMm: 125, yEndMm: 138 },
];

const MM_TO_PX = (mm: number) => (mm / 215.9) * PAGE_W;
const PX_TO_MM = (px: number) => (px / PAGE_W) * 215.9;

async function renderFullPdf(url: string): Promise<HTMLCanvasElement> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
  const resp = await fetch(url);
  const buf = await resp.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const c = document.createElement("canvas");
  c.width = vp.width;
  c.height = vp.height;
  await page.render({ canvasContext: c.getContext("2d")!, viewport: vp, canvas: c }).promise;
  return c;
}

const MOCK_DATA: NotaDebitoFormData = {
  numero: "ND-000001",
  fecha: new Date().toISOString().slice(0, 10),
  cliente_id: "demo",
  cliente_nombre: "CLIENTE DE PRUEBA S.A.",
  cliente_ruc: "J031000012345",
  cliente_direccion: "Km 4.5 Carretera a Masaya, Managua",
  cliente_ciudad: "Managua",
  cliente_giro: "Comercio General",
  condicion_pago: "Contado",
  moneda: "NIO",
  descripcion_general: "Ajuste por consumo de combustible y días adicionales de arrendamiento.",
  observaciones: "Documento emitido conforme a las condiciones del contrato de arrendamiento.",
  estado: "emitida",
  items: [
    { codigo: "COMB-01", cantidad: 1, descripcion: "Reemplazo de combustible (1/2 tanque)", precio_unitario: 45.00, subtotal: 45.00 },
    { codigo: "DIA-ADD", cantidad: 2, descripcion: "Días adicionales de renta (Toyota Hilux)", precio_unitario: 65.00, subtotal: 130.00 },
    { codigo: "LIMP-SP", cantidad: 1, descripcion: "Limpieza especial y sanitización", precio_unitario: 25.00, subtotal: 25.00 },
  ],
  subtotal: 200.00,
  iva: 30.00,
  total: 230.00,
};

export function NotaDebitoCalibrationMode({
  isOpen,
  onClose,
  sampleData,
}: {
  isOpen: boolean;
  onClose: () => void;
  sampleData?: NotaDebitoFormData;
}) {
  const [offsets, setOffsets] = useState<CalibrationOffsets>(getNotaDebitoCalibrationOffsets());
  const [bgImage, setBgImage] = useState<string | null>(getNotaDebitoCalibrationImageURL());
  const [activeBlock, setActiveBlock] = useState<keyof CalibrationOffsets | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<keyof CalibrationOffsets | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = useState<OffsetXY>({ x: 0, y: 0 });
  const [pdfCanvas, setPdfCanvas] = useState<HTMLCanvasElement | null>(null);
  const [rendering, setRendering] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showText, setShowText] = useState(true);
  const [opacity, setOpacity] = useState([70]);
  const [zoom] = useState(100);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeData = sampleData || MOCK_DATA;

  const updatePdfPreview = useCallback(
    async (currentOffsets: CalibrationOffsets) => {
      setRendering(true);
      try {
        const doc = await generateNotaDebitoPDF(activeData, currentOffsets);
        const pdfUrl = doc.output("datauristring");
        const canvas = await renderFullPdf(pdfUrl);
        setPdfCanvas(canvas);
      } catch (err) {
        console.error("PDF Calibration Render Error:", err);
      } finally {
        setRendering(false);
      }
    },
    [activeData]
  );

  useEffect(() => {
    if (isOpen) {
      const current = getNotaDebitoCalibrationOffsets();
      setOffsets(current);
      setBgImage(getNotaDebitoCalibrationImageURL());
      updatePdfPreview(current);
    }
  }, [isOpen, updatePdfPreview]);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent, key: keyof CalibrationOffsets) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    setDraggingBlock(key);
    setActiveBlock(key);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialOffset({ ...offsets[key] });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingBlock) return;
    const dxPx = e.clientX - dragStart.x;
    const dyPx = e.clientY - dragStart.y;
    const dxMm = Math.round(PX_TO_MM(dxPx));
    const dyMm = Math.round(PX_TO_MM(dyPx));

    const newOff: CalibrationOffsets = {
      ...offsets,
      [draggingBlock]: {
        x: initialOffset.x + dxMm,
        y: initialOffset.y + dyMm,
      },
    };
    setOffsets(newOff);
  };

  const handlePointerUp = () => {
    if (draggingBlock) {
      setDraggingBlock(null);
      updatePdfPreview(offsets);
    }
  };

  const handleSave = () => {
    saveNotaDebitoCalibrationOffsets(offsets);
    if (bgImage) saveNotaDebitoCalibrationImageURL(bgImage);
    else clearNotaDebitoCalibrationImageURL();
    toast.success("Calibración de Nota de Débito guardada");
    onClose();
  };

  const handleReset = () => {
    resetNotaDebitoCalibrationOffsets();
    clearNotaDebitoCalibrationImageURL();
    const def = { ...DEFAULT_OFFSETS };
    setOffsets(def);
    setBgImage(null);
    updatePdfPreview(def);
    toast.info("Calibración restablecida");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setBgImage(url);
      saveNotaDebitoCalibrationImageURL(url);
      toast.success("Plantilla de fondo cargada");
    };
    reader.readAsDataURL(file);
  };

  const scale = zoom / 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100">
      {/* Header Bar */}
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-800 bg-slate-900 px-4">
        <div className="flex items-center gap-3">
          <Ruler className="size-5 text-amber-400" />
          <span className="font-semibold text-sm">Calibración — Nota de Débito (Half Letter Horizontal)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 gap-1.5 border-slate-700 text-xs">
            <Upload className="size-3.5" /> Plantilla Fondo
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleImageUpload} />
          {bgImage && (
            <Button variant="ghost" size="sm" onClick={() => { setBgImage(null); clearNotaDebitoCalibrationImageURL(); }} className="h-8 text-xs text-rose-400 hover:bg-rose-950/40">
              <Trash2 className="size-3.5" /> Borrar Fondo
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} className="h-8 gap-1.5 border-slate-700 text-xs text-slate-300">
            <RotateCcw className="size-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs">
            <Save className="size-3.5" /> Guardar Calibración
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="size-8 text-slate-400 hover:text-white">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Sidebar Controls */}
        <div className="order-2 w-full max-h-[45dvh] shrink-0 border-t lg:order-1 lg:max-h-none lg:w-80 lg:border-t-0 lg:border-r border-slate-800 bg-slate-900/60 p-4 space-y-5 overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex flex-wrap items-center gap-2">
              <Layers className="size-4 text-amber-400" /> Ajuste de Bloques (mm)
            </h3>
            <div className="space-y-2">
              {BLOCK_META.map((b) => {
                const offVal = offsets[b.key];
                const isActive = activeBlock === b.key;
                return (
                  <div
                    key={b.key}
                    onClick={() => setActiveBlock(b.key)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isActive ? "border-amber-400 bg-slate-800/80" : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium flex flex-wrap items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                        {b.label}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        X: {offVal.x > 0 ? `+${offVal.x}` : offVal.x}mm | Y: {offVal.y > 0 ? `+${offVal.y}` : offVal.y}mm
                      </span>
                    </div>
                    {isActive && (
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
                        <div>
                          <Label className="text-[10px] text-slate-400">Horizontal X (mm)</Label>
                          <input
                            type="number"
                            value={offVal.x}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const n = { ...offsets, [b.key]: { ...offVal, x: val } };
                              setOffsets(n);
                              updatePdfPreview(n);
                            }}
                            className="w-full h-7 rounded border border-slate-700 bg-slate-950 px-2 text-xs font-mono text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400">Vertical Y (mm)</Label>
                          <input
                            type="number"
                            value={offVal.y}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const n = { ...offsets, [b.key]: { ...offVal, y: val } };
                              setOffsets(n);
                              updatePdfPreview(n);
                            }}
                            className="w-full h-7 rounded border border-slate-700 bg-slate-950 px-2 text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Visualización</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Mostrar Grilla</span>
              <Button variant="ghost" size="icon" onClick={() => setShowGrid(!showGrid)} className="size-7">
                <Grid3x3 className={`size-4 ${showGrid ? "text-amber-400" : "text-slate-500"}`} />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Vista Texto PDF</span>
              <Button variant="ghost" size="icon" onClick={() => setShowText(!showText)} className="size-7">
                {showText ? <Eye className="size-4 text-emerald-400" /> : <EyeOff className="size-4 text-slate-500" />}
              </Button>
            </div>
            {bgImage && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Opacidad Fondo</span>
                  <span className="font-mono text-xs text-slate-400">{opacity[0]}%</span>
                </div>
                <Slider value={opacity} onValueChange={setOpacity} max={100} step={5} />
              </div>
            )}
          </div>
        </div>

        {/* Canvas / Canvas Workspace */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="order-1 min-h-0 min-w-0 flex-1 overflow-auto p-3 sm:p-8 flex items-start justify-start lg:order-2 lg:items-center lg:justify-center bg-slate-950 relative select-none"
        >
          <div
            className="relative bg-white shadow-2xl transition-transform rounded border border-slate-700 overflow-hidden"
            style={{
              width: PAGE_W * scale,
              height: PAGE_H * scale,
            }}
          >
            {/* Background Template Image */}
            {bgImage && (
              <img
                src={bgImage}
                alt="Plantilla de Fondo"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                style={{ opacity: opacity[0] / 100 }}
              />
            )}

            {/* Rendered PDF Preview */}
            {showText && pdfCanvas && (
              <img
                src={pdfCanvas.toDataURL()}
                alt="Vista PDF Calibrada"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
              />
            )}

            {/* Grid Overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
                  backgroundSize: `${MM_TO_PX(10)}px ${MM_TO_PX(10)}px`,
                }}
              />
            )}

            {/* Draggable Calibration Blocks */}
            {BLOCK_META.map((b) => {
              const offVal = offsets[b.key];
              const yStartPx = MM_TO_PX(b.yStartMm) + MM_TO_PX(offVal.y);
              const heightPx = MM_TO_PX(b.yEndMm - b.yStartMm);
              const xPx = MM_TO_PX(offVal.x);

              const isDragging = draggingBlock === b.key;
              const isActive = activeBlock === b.key;

              return (
                <div
                  key={b.key}
                  onPointerDown={(e) => handlePointerDown(e, b.key)}
                  className={`absolute left-0 right-0 z-30 flex items-center justify-between px-3 border-2 transition-colors touch-none cursor-move ${
                    isDragging
                      ? "border-amber-400 bg-amber-500/20"
                      : isActive
                      ? "border-amber-400/80 bg-amber-400/10"
                      : "border-dashed hover:border-solid hover:bg-slate-900/10"
                  }`}
                  style={{
                    top: yStartPx * scale,
                    height: heightPx * scale,
                    transform: `translateX(${xPx * scale}px)`,
                    borderColor: isDragging ? "#f59e0b" : b.color,
                  }}
                >
                  <span className="inline-flex items-center gap-1.5 rounded bg-slate-900/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                    <GripVertical className="size-3 text-slate-400" />
                    {b.label}
                  </span>
                  <span className="rounded bg-slate-900/85 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 shadow">
                    X: {offVal.x > 0 ? `+${offVal.x}` : offVal.x} | Y: {offVal.y > 0 ? `+${offVal.y}` : offVal.y} mm
                  </span>
                </div>
              );
            })}

            {rendering && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center z-40">
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs text-white shadow-xl">
                  <Loader2 className="size-4 animate-spin text-amber-400" /> Actualizando vista previa...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
