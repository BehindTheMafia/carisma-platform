-- =====================================================
-- Informe de Daños (vehicle damage report) table
-- =====================================================

CREATE TABLE public.informes_danos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_informes_danos_created_by ON public.informes_danos(created_by) WHERE deleted_at IS NULL;

ALTER TABLE public.informes_danos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Informes daños: staff" ON public.informes_danos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.informes_danos TO authenticated;
GRANT ALL ON public.informes_danos TO service_role;

CREATE TRIGGER informes_danos_updated_at BEFORE UPDATE ON public.informes_danos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
