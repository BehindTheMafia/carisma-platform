ALTER TABLE public.vehiculos ADD COLUMN IF NOT EXISTS accesorios JSONB DEFAULT '[]'::jsonb;
