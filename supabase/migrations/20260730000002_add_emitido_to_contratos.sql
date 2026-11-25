-- Persistencia completa: timestamp y usuario de emisión
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS emitido_en TIMESTAMPTZ;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS emitido_por UUID REFERENCES auth.users(id);
