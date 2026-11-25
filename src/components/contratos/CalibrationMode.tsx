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
import { generatePDF } from "@/utils/pdfGenerator";
import { type FormData } from "@/components/contratos/ContratoForm";
import {
  type CalibrationOffsets,
  type OffsetXY,
  DEFAULT_OFFSETS,
  getCalibrationOffsets,
  saveCalibrationOffsets,
  resetCalibrationOffsets,
  getCalibrationImageURL,
  saveCalibrationImageURL,
  clearCalibrationImageURL,
} from "@/utils/calibrationStorage";

const PAGE_W = 612;
const PAGE_H = 792;

const ZOOM_LEVELS = [100, 150, 200, 300, 400];

const BLOCK_META: {
  key: keyof CalibrationOffsets;
  label: string;
  color: string;
  yStartMm: number;
  yEndMm: number;
}[] = [
  { key: "fecha", label: "Fecha", color: "#f59e0b", yStartMm: 20, yEndMm: 42 },
  { key: "cliente", label: "Cliente", color: "#3b82f6", yStartMm: 42, yEndMm: 82 },
  { key: "tabla", label: "Tabla", color: "#8b5cf6", yStartMm: 82, yEndMm: 188 },
  { key: "totales", label: "Totales", color: "#10b981", yStartMm: 188, yEndMm: 210 },
  { key: "observaciones", label: "Obs.", color: "#ec4899", yStartMm: 210, yEndMm: 238 },
  { key: "firmas", label: "Firmas", color: "#06b6d4", yStartMm: 238, yEndMm: 275 },
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

function extractBlockCanvas(
  source: HTMLCanvasElement,
  yStartMm: number,
  yEndMm: number,
): HTMLCanvasElement {
  const y0 = Math.round(MM_TO_PX(yStartMm));
  const y1 = Math.round(MM_TO_PX(yEndMm));
  const h = y1 - y0;
  const c = document.createElement("canvas");
  c.width = source.width;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source, 0, y0, source.width, h, 0, 0, source.width, h);
  return c;
}

async function autoCalibrate(pdfBlobUrl: string, bgImageUrl: string): Promise<CalibrationOffsets> {
  const SMALL = 4;
  const SW = PAGE_W / SMALL;
  const SH = PAGE_H / SMALL;

  function loadImageToCanvas(url: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = PAGE_W;
        c.height = PAGE_H;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, PAGE_W, PAGE_H);
        const ratio = Math.min(PAGE_W / img.width, PAGE_H / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, (PAGE_W - w) / 2, (PAGE_H - h) / 2, w, h);
        resolve(c);
      };
      img.src = url;
    });
  }

  function getGray(data: ImageData): Float32Array {
    const d = data.data;
    const g = new Float32Array(d.length / 4);
    for (let i = 0; i < g.length; i++) {
      g[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / (3 * 255);
    }
    return g;
  }

  function downsample(gray: Float32Array, w: number, h: number, factor: number): Float32Array {
    const sw = w / factor;
    const sh = h / factor;
    const out = new Float32Array(sw * sh);
    for (let oy = 0; oy < sh; oy++) {
      for (let ox = 0; ox < sw; ox++) {
        let sum = 0;
        for (let dy = 0; dy < factor; dy++) {
          for (let dx = 0; dx < factor; dx++) {
            sum += gray[(oy * factor + dy) * w + (ox * factor + dx)];
          }
        }
        out[oy * sw + ox] = sum / (factor * factor);
      }
    }
    return out;
  }

  function scoreFull(
    pdfG: Float32Array,
    bgG: Float32Array,
    dxPx: number,
    dyPx: number,
    sw: number,
    sh: number,
  ): number {
    let diff = 0;
    let count = 0;
    for (let y = 0; y < sh; y++) {
      const sy = y + dyPx;
      if (sy < 0 || sy >= sh) continue;
      for (let x = 0; x < sw; x++) {
        const sx = x + dxPx;
        if (sx < 0 || sx >= sw) continue;
        if (pdfG[y * sw + x] < 0.85 || bgG[sy * sw + sx] < 0.85) {
          diff += Math.abs(pdfG[y * sw + x] - bgG[sy * sw + sx]);
          count++;
        }
      }
    }
    return count > 0 ? diff / count : Infinity;
  }

  function scoreStrip(
    pdfStrip: Float32Array,
    bgFull: Float32Array,
    dxPx: number,
    dyPx: number,
    stripW: number,
    stripH: number,
    fullW: number,
    fullH: number,
  ): number {
    let diff = 0;
    let count = 0;
    for (let y = 0; y < stripH; y++) {
      const sy = y + dyPx;
      if (sy < 0 || sy >= fullH) continue;
      for (let x = 0; x < stripW; x++) {
        const sx = x + dxPx;
        if (sx < 0 || sx >= fullW) continue;
        if (pdfStrip[y * stripW + x] < 0.85 || bgFull[sy * fullW + sx] < 0.85) {
          diff += Math.abs(pdfStrip[y * stripW + x] - bgFull[sy * fullW + sx]);
          count++;
        }
      }
    }
    return count > 0 ? diff / count : Infinity;
  }

  const [pdfCanvas, bgCanvas] = await Promise.all([
    renderFullPdf(pdfBlobUrl),
    loadImageToCanvas(bgImageUrl),
  ]);

  const pdfGray = downsample(
    getGray(pdfCanvas.getContext("2d")!.getImageData(0, 0, PAGE_W, PAGE_H)),
    PAGE_W,
    PAGE_H,
    SMALL,
  );
  const bgGray = downsample(
    getGray(bgCanvas.getContext("2d")!.getImageData(0, 0, PAGE_W, PAGE_H)),
    PAGE_W,
    PAGE_H,
    SMALL,
  );

  const mmToS = (mm: number) => Math.round((mm / 215.9) * SW);
  const sToMm = (px: number) => Math.round(PX_TO_MM(px * SMALL) * 4) / 4;

  const COARSE = mmToS(2);
  const FINE = Math.max(1, mmToS(0.5));
  const FINE_R = COARSE * 2;

  let bGS = Infinity,
    bGDx = 0,
    bGDy = 0;
  const gR = mmToS(40);

  for (let dy = -gR; dy <= gR; dy += COARSE)
    for (let dx = -gR; dx <= gR; dx += COARSE) {
      const s = scoreFull(pdfGray, bgGray, dx, dy, SW, SH);
      if (s < bGS) {
        bGS = s;
        bGDx = dx;
        bGDy = dy;
      }
    }
  for (let dy = bGDy - FINE_R; dy <= bGDy + FINE_R; dy += FINE)
    for (let dx = bGDx - FINE_R; dx <= bGDx + FINE_R; dx += FINE) {
      const s = scoreFull(pdfGray, bgGray, dx, dy, SW, SH);
      if (s < bGS) {
        bGS = s;
        bGDx = dx;
        bGDy = dy;
      }
    }

  const offsets: CalibrationOffsets = {
    general: { x: sToMm(bGDx), y: sToMm(bGDy) },
    fecha: { x: 0, y: 0 },
    cliente: { x: 0, y: 0 },
    tabla: { x: 0, y: 0 },
    totales: { x: 0, y: 0 },
    firmas: { x: 0, y: 0 },
    observaciones: { x: 0, y: 0 },
  };

  for (const block of BLOCK_META) {
    const bY0 = mmToS(block.yStartMm);
    const bY1 = mmToS(block.yEndMm);
    const sH = bY1 - bY0;
    const strip = new Float32Array(SW * sH);
    for (let y = 0; y < sH; y++)
      for (let x = 0; x < SW; x++) strip[y * SW + x] = pdfGray[(bY0 + y) * SW + x];

    let bBS = Infinity,
      bBDx = 0,
      bBDy = 0;
    const bRy = mmToS(20),
      bRx = mmToS(15);

    for (let dy = -bRy; dy <= bRy; dy += COARSE)
      for (let dx = -bRx; dx <= bRx; dx += COARSE) {
        const s = scoreStrip(strip, bgGray, dx, dy, SW, sH, SW, SH);
        if (s < bBS) {
          bBS = s;
          bBDx = dx;
          bBDy = dy;
        }
      }
    for (let dy = bBDy - FINE_R; dy <= bBDy + FINE_R; dy += FINE)
      for (let dx = bBDx - FINE_R; dx <= bBDx + FINE_R; dx += FINE) {
        const s = scoreStrip(strip, bgGray, dx, dy, SW, sH, SW, SH);
        if (s < bBS) {
          bBS = s;
          bBDx = dx;
          bBDy = dy;
        }
      }

    offsets[block.key] = { x: sToMm(bBDx), y: sToMm(bBDy) };
  }

  return offsets;
}

function BlockLayer({
  block,
  sourceCanvas,
  offset,
  scale,
  opacity,
  visible,
  onDragEnd,
  isActive,
  setActive,
}: {
  block: (typeof BLOCK_META)[number];
  sourceCanvas: HTMLCanvasElement;
  offset: OffsetXY;
  scale: number;
  opacity: number;
  visible: boolean;
  onDragEnd: (key: keyof CalibrationOffsets, val: OffsetXY) => void;
  isActive: boolean;
  setActive: (k: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [temp, setTemp] = useState(offset);

  useEffect(() => {
    setTemp(offset);
  }, [offset]);

  useEffect(() => {
    if (!canvasRef.current || !visible) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const y0 = Math.round(MM_TO_PX(block.yStartMm));
    const y1 = Math.round(MM_TO_PX(block.yEndMm));
    const h = y1 - y0;
    c.width = sourceCanvas.width;
    c.height = h;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(sourceCanvas, 0, y0, sourceCanvas.width, h, 0, 0, sourceCanvas.width, h);
  }, [sourceCanvas, block, visible]);

  if (!visible) return null;

  const y0 = MM_TO_PX(block.yStartMm);
  const h = MM_TO_PX(block.yEndMm) - y0;
  const dxPx = MM_TO_PX(temp.x) * scale;
  const dyPx = MM_TO_PX(temp.y) * scale;

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(block.key);
    setDragging(true);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: temp.x, oy: temp.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const dx = PX_TO_MM((e.clientX - dragRef.current.sx) / scale);
    const dy = PX_TO_MM((e.clientY - dragRef.current.sy) / scale);
    setTemp({
      x: Math.round((dragRef.current.ox + dx) * 4) / 4,
      y: Math.round((dragRef.current.oy + dy) * 4) / 4,
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(false);
    dragRef.current = null;
    setActive(null);
    onDragEnd(block.key, temp);
  };

  return (
    <div
      className="absolute"
      style={{
        top: `${y0 * scale + dyPx}px`,
        left: `${dxPx}px`,
        width: `${PAGE_W * scale}px`,
        height: `${h * scale}px`,
        opacity: dragging ? 0.7 : opacity / 100,
        transition: dragging ? "none" : "top 0.15s, left 0.15s",
        zIndex: isActive ? 30 : 15,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          cursor: dragging ? "grabbing" : "grab",
        }}
      />
      <div
        className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap flex items-center gap-1 pointer-events-none select-none"
        style={{
          background: block.color,
          opacity: dragging ? 1 : 0.8,
        }}
      >
        <GripVertical className="size-3" />
        {block.label}
        {(temp.x !== 0 || temp.y !== 0) && (
          <span className="opacity-80">
            {temp.x},{temp.y}
          </span>
        )}
      </div>
      {dragging && (
        <div
          className="absolute inset-0 border-2 rounded pointer-events-none"
          style={{ borderColor: block.color }}
        />
      )}
    </div>
  );
}

export function CalibrationMode({
  initialBlobUrl,
  formData,
  docType,
  onClose,
  onSave,
}: {
  initialBlobUrl: string;
  formData: FormData;
  docType: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [offsets, setOffsets] = useState<CalibrationOffsets>(() => getCalibrationOffsets());
  const [transparency, setTransparency] = useState(80);
  const [zoom, setZoom] = useState(100);
  const [showBg, setShowBg] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(() => getCalibrationImageURL());
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [liveBlobUrl, setLiveBlobUrl] = useState(initialBlobUrl);
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [autoCalibrating, setAutoCalibrating] = useState(false);
  const [hiddenBlocks, setHiddenBlocks] = useState<Set<string>>(new Set());
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);

  const scale = zoom / 100;

  const loadSource = useCallback(async (url: string) => {
    setLoading(true);
    setPdfError(null);
    try {
      const c = await renderFullPdf(url);
      setSourceCanvas(c);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSource(liveBlobUrl);
  }, [liveBlobUrl, loadSource]);

  const regeneratePdf = useCallback(
    async (newOffsets: CalibrationOffsets) => {
      try {
        const doc = await generatePDF({ ...formData, docType }, newOffsets);
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        setLiveBlobUrl(url);
      } catch (err) {
        console.error("Error regenerating PDF:", err);
      }
    },
    [formData, docType],
  );

  const handleDragEnd = useCallback(
    (key: keyof CalibrationOffsets, val: OffsetXY) => {
      const next = { ...offsets, [key]: val };
      setOffsets(next);
      regeneratePdf(next);
    },
    [offsets, regeneratePdf],
  );

  const handleOffsetInput = useCallback(
    (key: keyof CalibrationOffsets, val: OffsetXY) => {
      const next = { ...offsets, [key]: val };
      setOffsets(next);
      regeneratePdf(next);
    },
    [offsets, regeneratePdf],
  );

  const toggleBlock = (key: string) => {
    setHiddenBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      try {
        saveCalibrationImageURL(dataUrl);
        setBgImageUrl(dataUrl);
        toast.success("Imagen guardada");
      } catch {
        toast.error("La imagen es muy grande para localStorage");
      }
      setUploading(false);
    };
    reader.onerror = () => {
      toast.error("Error al leer el archivo");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaving(true);
    saveCalibrationOffsets(offsets);
    onSave();
    toast.success("Calibración guardada");
    setSaving(false);
  };

  const handleReset = () => {
    const def = { ...DEFAULT_OFFSETS };
    setOffsets(def);
    resetCalibrationOffsets();
    regeneratePdf(def);
    toast.info("Calibración restablecida");
  };

  const handleClearImage = () => {
    setBgImageUrl(null);
    clearCalibrationImageURL();
  };

  const handlePrintTest = () => {
    if (!liveBlobUrl) return;
    const w = window.open(liveBlobUrl);
    if (w) w.onload = () => w.print();
  };

  const handleAutoCalibrate = async () => {
    if (!bgImageUrl) {
      toast.error("Sube una imagen de fondo primero");
      return;
    }
    setAutoCalibrating(true);
    toast.info("Calibrando por bloques...");
    try {
      const found = await autoCalibrate(liveBlobUrl, bgImageUrl);
      setOffsets(found);
      await regeneratePdf(found);
      const detail = Object.entries(found)
        .filter(([k, v]) => k !== "general" && (v.x !== 0 || v.y !== 0))
        .map(([k, v]) => `${k}(${v.x},${v.y})`)
        .join(" ");
      toast.success(`General(${found.general.x},${found.general.y}) ${detail || ""}`);
    } catch (err) {
      console.error("Auto-calibration error:", err);
      toast.error("Error en calibración automática");
    } finally {
      setAutoCalibrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Top bar */}
      <div className="min-h-14 border-b border-border flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-card shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <Layers className="size-5 text-primary" />
          <span className="text-lg font-bold tracking-tight">Calibración por Capas</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {Math.round(transparency)}% · {zoom}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrintTest} className="gap-2">
            <Printer className="size-4" /> Imprimir
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Guardar
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
            <X className="size-4" /> Cerrar
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden lg:flex-row">
        {/* Canvas area */}
        <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-gray-100 flex items-start justify-start lg:justify-center">
          <div
            className="shrink-0"
            style={{ padding: "24px", marginTop: showRulers ? "24px" : undefined }}
          >
            <div
              className="relative"
              style={{
                width: `${PAGE_W * scale}px`,
                height: `${PAGE_H * scale}px`,
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              }}
            >
              {/* Background image */}
              {showBg && bgImageUrl && (
                <img
                  src={bgImageUrl}
                  alt="Formulario escaneado"
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{
                    width: `${PAGE_W * scale}px`,
                    height: `${PAGE_H * scale}px`,
                    objectFit: "fill",
                  }}
                />
              )}

              {/* Block layers */}
              {sourceCanvas &&
                BLOCK_META.map((block) => (
                  <BlockLayer
                    key={block.key}
                    block={block}
                    sourceCanvas={sourceCanvas}
                    offset={offsets[block.key]}
                    scale={scale}
                    opacity={transparency}
                    visible={!hiddenBlocks.has(block.key)}
                    onDragEnd={handleDragEnd}
                    isActive={activeBlock === block.key}
                    setActive={setActiveBlock}
                  />
                ))}

              {/* Loading */}
              {loading && (
                <div
                  className="absolute top-0 left-0 flex items-center justify-center bg-white/60 z-40"
                  style={{ width: `${PAGE_W * scale}px`, height: `${PAGE_H * scale}px` }}
                >
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              )}

              {/* Error */}
              {pdfError && !loading && (
                <div
                  className="absolute top-0 left-0 flex flex-col items-center justify-center bg-white/80 z-40 gap-2 p-4"
                  style={{ width: `${PAGE_W * scale}px`, height: `${PAGE_H * scale}px` }}
                >
                  <p className="text-sm text-destructive font-medium text-center">
                    Error al renderizar PDF
                  </p>
                  <p className="text-xs text-muted-foreground text-center">{pdfError}</p>
                </div>
              )}

              {/* Grid */}
              {showGrid && (
                <div
                  className="absolute top-0 left-0 pointer-events-none z-10"
                  style={{
                    width: `${PAGE_W * scale}px`,
                    height: `${PAGE_H * scale}px`,
                    backgroundImage: `
                      linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)
                    `,
                    backgroundSize: `${37.8 * scale}px ${37.8 * scale}px`,
                  }}
                />
              )}
            </div>
          </div>

          {/* Rulers */}
          {showRulers && (
            <>
              <div className="fixed top-14 left-0 right-80 h-6 bg-white border-b border-border z-30 flex items-end overflow-hidden">
                {Array.from({ length: 300 }).map((_, i) => (
                  <div
                    key={i}
                    className="shrink-0 border-l border-gray-400 relative"
                    style={{
                      width: `${37.8 * scale}px`,
                      height: i % 10 === 0 ? "18px" : i % 5 === 0 ? "12px" : "6px",
                    }}
                  >
                    {i % 10 === 0 && (
                      <span className="absolute -bottom-0.5 left-0.5 text-[7px] text-gray-500 leading-none">
                        {i}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="fixed top-20 left-0 bottom-0 w-6 bg-white border-r border-border z-30 overflow-hidden">
                {Array.from({ length: 300 }).map((_, i) => (
                  <div
                    key={i}
                    className="shrink-0 border-t border-gray-400"
                    style={{
                      height: `${37.8 * scale}px`,
                      width: i % 10 === 0 ? "18px" : i % 5 === 0 ? "12px" : "6px",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full max-h-[45dvh] lg:max-h-none lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card overflow-y-auto shrink-0 flex flex-col">
          <div className="p-4 space-y-5 flex-1">
            {/* Transparency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Transparencia</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{transparency}%</span>
              </div>
              <Slider
                value={[transparency]}
                onValueChange={(v) => setTransparency(v[0])}
                min={0}
                max={100}
                step={1}
              />
            </div>

            {/* Zoom */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Zoom</Label>
              <div className="flex gap-1">
                {ZOOM_LEVELS.map((z) => (
                  <Button
                    key={z}
                    variant={zoom === z ? "default" : "outline"}
                    size="sm"
                    onClick={() => setZoom(z)}
                    className="flex-1 text-xs h-8"
                  >
                    {z}%
                  </Button>
                ))}
              </div>
            </div>

            {/* Layers */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Layers className="size-3.5" /> Capas
              </Label>

              {/* General offset */}
              <div
                className="flex items-center gap-2 p-2 rounded-lg border border-border"
                style={{ borderLeftColor: "#ef4444", borderLeftWidth: "3px" }}
              >
                <div className="w-2 h-2 rounded-full shrink-0 bg-red-500" />
                <span className="text-xs font-medium w-16 shrink-0">General</span>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[10px] text-muted-foreground">X</span>
                  <input
                    type="number"
                    step="0.5"
                    value={offsets.general.x}
                    onChange={(e) =>
                      handleOffsetInput("general", {
                        ...offsets.general,
                        x: Number(e.target.value),
                      })
                    }
                    className="h-6 w-14 text-xs px-1.5 border border-border rounded bg-background text-center tabular-nums"
                  />
                  <span className="text-[10px] text-muted-foreground">Y</span>
                  <input
                    type="number"
                    step="0.5"
                    value={offsets.general.y}
                    onChange={(e) =>
                      handleOffsetInput("general", {
                        ...offsets.general,
                        y: Number(e.target.value),
                      })
                    }
                    className="h-6 w-14 text-xs px-1.5 border border-border rounded bg-background text-center tabular-nums"
                  />
                </div>
              </div>

              {/* Block layers */}
              {BLOCK_META.map((block) => {
                const val = offsets[block.key];
                const hidden = hiddenBlocks.has(block.key);
                return (
                  <div
                    key={block.key}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border"
                    style={{
                      borderLeftColor: block.color,
                      borderLeftWidth: "3px",
                      opacity: hidden ? 0.35 : 1,
                    }}
                  >
                    <button
                      onClick={() => toggleBlock(block.key)}
                      className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
                      title={hidden ? "Mostrar capa" : "Ocultar capa"}
                    >
                      {hidden ? (
                        <EyeOff className="size-3.5 text-muted-foreground" />
                      ) : (
                        <Eye className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: block.color }}
                    />
                    <span className="text-xs font-medium w-16 shrink-0">{block.label}</span>
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[10px] text-muted-foreground">X</span>
                      <input
                        type="number"
                        step="0.5"
                        value={val.x}
                        disabled={hidden}
                        onChange={(e) =>
                          handleOffsetInput(block.key, { ...val, x: Number(e.target.value) })
                        }
                        className="h-6 w-14 text-xs px-1.5 border border-border rounded bg-background text-center tabular-nums disabled:opacity-40"
                      />
                      <span className="text-[10px] text-muted-foreground">Y</span>
                      <input
                        type="number"
                        step="0.5"
                        value={val.y}
                        disabled={hidden}
                        onChange={(e) =>
                          handleOffsetInput(block.key, { ...val, y: Number(e.target.value) })
                        }
                        className="h-6 w-14 text-xs px-1.5 border border-border rounded bg-background text-center tabular-nums disabled:opacity-40"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom tools */}
          <div className="border-t border-border p-4 space-y-3">
            {/* Background image */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Imagen de fondo</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBg(!showBg)}
                  className="gap-1.5 flex-1"
                >
                  {showBg ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  {showBg ? "Visible" : "Oculta"}
                </Button>
                {bgImageUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearImage}
                    className="gap-1.5 text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 w-full h-9 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
                <Upload className="size-3.5" />
                {uploading ? "Cargando..." : "Subir imagen escaneada"}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Grid & Rulers */}
            <div className="flex gap-2">
              <Button
                variant={showGrid ? "default" : "outline"}
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
                className="flex-1 gap-1.5"
              >
                <Grid3x3 className="size-3.5" /> Cuadrícula
              </Button>
              <Button
                variant={showRulers ? "default" : "outline"}
                size="sm"
                onClick={() => setShowRulers(!showRulers)}
                className="flex-1 gap-1.5"
              >
                <Ruler className="size-3.5" /> Reglas
              </Button>
            </div>

            {/* Auto-calibrate */}
            <Button
              variant="default"
              size="sm"
              onClick={handleAutoCalibrate}
              disabled={autoCalibrating || !bgImageUrl}
              className="w-full gap-1.5"
            >
              {autoCalibrating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <svg
                  className="size-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </svg>
              )}
              {autoCalibrating ? "Calibrando..." : "Auto-calibrar"}
            </Button>

            {/* Reset */}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              className="w-full gap-1.5"
            >
              <RotateCcw className="size-3.5" /> Restablecer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
