export interface NotaDebitoItem {
  id?: string;
  codigo?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export type NotaDebitoEstado = 'borrador' | 'emitida' | 'anulada';

export type MonedaND = "NIO" | "USD";

export interface NotaDebitoRow {
  id: string;
  numero: string;
  cliente_id: string | null;
  renta_id: string | null;
  factura_id: string | null;
  fecha: string;
  condicion_pago: string;
  descripcion_general: string | null;
  subtotal: number;
  iva: number;
  total: number;
  moneda: MonedaND;
  estado: NotaDebitoEstado;
  observaciones: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  cliente?: {
    nombre: string;
    documento?: string | null;
    direccion?: string | null;
    ciudad?: string | null;
    giro?: string | null;
  } | null;
  renta?: {
    codigo?: string | null;
  } | null;
  factura?: {
    numero?: string | null;
  } | null;
  detalles?: NotaDebitoItem[];
}

export interface NotaDebitoFormData {
  id?: string;
  numero?: string;
  fecha: string;
  cliente_id: string;
  cliente_nombre?: string;
  cliente_ruc?: string;
  cliente_direccion?: string;
  cliente_ciudad?: string;
  cliente_giro?: string;
  condicion_pago: string;
  renta_id?: string;
  renta_numero?: string;
  factura_id?: string;
  factura_numero?: string;
  descripcion_general: string;
  observaciones: string;
  moneda: MonedaND;
  estado: NotaDebitoEstado;
  items: NotaDebitoItem[];
  subtotal: number;
  iva: number;
  total: number;
}
