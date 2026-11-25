export interface OffsetXY {
  x: number;
  y: number;
}

export interface CalibrationOffsets {
  general: OffsetXY;
  cliente: OffsetXY;
  fecha: OffsetXY;
  tabla: OffsetXY;
  totales: OffsetXY;
  firmas: OffsetXY;
  observaciones: OffsetXY;
}

export const DEFAULT_OFFSETS: CalibrationOffsets = {
  general: { x: 0, y: 0 },
  cliente: { x: 0, y: 0 },
  fecha: { x: 0, y: 0 },
  tabla: { x: 0, y: 0 },
  totales: { x: 0, y: 0 },
  firmas: { x: 0, y: 0 },
  observaciones: { x: 0, y: 0 },
};

const STORAGE_KEY = "calibracion_factura";
const IMAGE_KEY = "calibracion_factura_imagen";

export function getCalibrationOffsets(): CalibrationOffsets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OFFSETS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_OFFSETS, ...parsed };
  } catch {
    return { ...DEFAULT_OFFSETS };
  }
}

export function saveCalibrationOffsets(offsets: CalibrationOffsets): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offsets));
}

export function resetCalibrationOffsets(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasActiveCalibration(): boolean {
  const o = getCalibrationOffsets();
  return Object.values(o).some((v) => v.x !== 0 || v.y !== 0);
}

export function getCalibrationImageURL(): string | null {
  return localStorage.getItem(IMAGE_KEY);
}

export function saveCalibrationImageURL(url: string): void {
  localStorage.setItem(IMAGE_KEY, url);
}

export function clearCalibrationImageURL(): void {
  localStorage.removeItem(IMAGE_KEY);
}
