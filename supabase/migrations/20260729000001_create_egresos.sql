-- =====================================================
-- Egresos (expenses) table
-- =====================================================

CREATE TABLE public.egresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renta_id UUID REFERENCES public.rentas(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  concepto TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'otros',
  descripcion TEXT NOT NULL DEFAULT '',
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda public.moneda_tipo NOT NULL DEFAULT 'NIO',
  metodo public.pago_metodo NOT NULL DEFAULT 'efectivo',
  responsable TEXT NOT NULL DEFAULT '',
  comprobante_url TEXT,
  observaciones TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_egresos_fecha ON public.egresos(fecha) WHERE deleted_at IS NULL;
CREATE INDEX idx_egresos_renta_id ON public.egresos(renta_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_egresos_categoria ON public.egresos(categoria) WHERE deleted_at IS NULL;

ALTER TABLE public.egresos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Egresos: staff" ON public.egresos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.egresos TO authenticated;
GRANT ALL ON public.egresos TO service_role;

CREATE TRIGGER egresos_updated_at BEFORE UPDATE ON public.egresos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
