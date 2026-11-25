-- =====================================================
-- Módulo Notas de Débito
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notas_debito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  renta_id UUID REFERENCES public.rentas(id) ON DELETE SET NULL,
  factura_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  condicion_pago TEXT NOT NULL DEFAULT 'Contado',
  descripcion_general TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  iva NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'emitida', 'anulada')),
  observaciones TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nota_debito_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_debito_id UUID NOT NULL REFERENCES public.notas_debito(id) ON DELETE CASCADE,
  codigo TEXT,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_notas_debito_cliente_id ON public.notas_debito(cliente_id);
CREATE INDEX IF NOT EXISTS idx_notas_debito_renta_id ON public.notas_debito(renta_id);
CREATE INDEX IF NOT EXISTS idx_notas_debito_factura_id ON public.notas_debito(factura_id);
CREATE INDEX IF NOT EXISTS idx_nota_debito_detalle_nd ON public.nota_debito_detalle(nota_debito_id);

-- Permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_debito TO authenticated;
GRANT ALL ON public.notas_debito TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nota_debito_detalle TO authenticated;
GRANT ALL ON public.nota_debito_detalle TO service_role;

-- RLS
ALTER TABLE public.notas_debito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nota_debito_detalle ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notas_debito' AND policyname = 'NotasDebito: staff'
  ) THEN
    CREATE POLICY "NotasDebito: staff" ON public.notas_debito FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'nota_debito_detalle' AND policyname = 'NotaDebitoDetalle: staff'
  ) THEN
    CREATE POLICY "NotaDebitoDetalle: staff" ON public.nota_debito_detalle FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
