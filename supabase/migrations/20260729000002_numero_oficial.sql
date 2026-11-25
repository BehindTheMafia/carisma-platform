-- Numero oficial compartido para todos los documentos de una renta
ALTER TABLE public.rentas ADD COLUMN IF NOT EXISTS numero_oficial TEXT;
