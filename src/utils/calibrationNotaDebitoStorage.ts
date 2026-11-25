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

const STORAGE_KEY = "calibracion_nota_debito";
const IMAGE_KEY = "calibracion_nota_debito_imagen";

export function getNotaDebitoCalibrationOffsets(): CalibrationOffsets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OFFSETS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_OFFSETS, ...parsed };
  } catch {
    return { ...DEFAULT_OFFSETS };
  }
}

export function saveNotaDebitoCalibrationOffsets(offsets: CalibrationOffsets): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offsets));
}

export function resetNotaDebitoCalibrationOffsets(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasActiveNotaDebitoCalibration(): boolean {
  const o = getNotaDebitoCalibrationOffsets();
  return Object.values(o).some((v) => v.x !== 0 || v.y !== 0);
}

export function getNotaDebitoCalibrationImageURL(): string | null {
  return localStorage.getItem(IMAGE_KEY);
}

export function saveNotaDebitoCalibrationImageURL(url: string): void {
  localStorage.setItem(IMAGE_KEY, url);
}

export function clearNotaDebitoCalibrationImageURL(): void {
  localStorage.removeItem(IMAGE_KEY);
}
