-- Migración: Agregar numero_oficial a rentas
-- Corre en: Supabase SQL Editor
ALTER TABLE rentas ADD COLUMN IF NOT EXISTS numero_oficial TEXT;
COMMENT ON COLUMN rentas.numero_oficial IS 'Número de expediente oficial visible al usuario (ej: 0012). Todos los documentos de esta renta comparten este número.';
