-- =====================================================
-- renta_log — audit trail for rental lifecycle events
-- =====================================================

CREATE TABLE IF NOT EXISTS public.renta_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renta_id UUID NOT NULL REFERENCES public.rentas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  accion TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add deleted_at column if missing (migration safety)
ALTER TABLE public.renta_log ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_renta_log_renta ON public.renta_log(renta_id);
CREATE INDEX IF NOT EXISTS idx_renta_log_created ON public.renta_log(created_at);

ALTER TABLE public.renta_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "renta_log: staff select" ON public.renta_log FOR SELECT
  TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "renta_log: staff insert" ON public.renta_log FOR INSERT
  TO authenticated WITH CHECK (public.is_staff(auth.uid()));

GRANT SELECT, INSERT ON public.renta_log TO authenticated;
GRANT ALL ON public.renta_log TO service_role;

-- Helper function for logging from client code (harden: verify table exists)
CREATE OR REPLACE FUNCTION public.log_renta_event(
  p_renta_id UUID,
  p_accion TEXT,
  p_descripcion TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'renta_log') THEN
    INSERT INTO public.renta_log (renta_id, usuario_id, accion, descripcion)
    VALUES (p_renta_id, auth.uid(), p_accion, p_descripcion)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END; $$;
