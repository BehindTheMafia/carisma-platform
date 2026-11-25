-- Add sublease cost columns to vehiculos table
-- costo_subarriendo: daily amount paid to the vehicle owner (subrentado only)
-- costo_subarriendo_semanal: weekly amount paid to the vehicle owner
-- costo_subarriendo_mensual: monthly amount paid to the vehicle owner

ALTER TABLE public.vehiculos
  ADD COLUMN IF NOT EXISTS costo_subarriendo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_subarriendo_semanal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_subarriendo_mensual numeric NOT NULL DEFAULT 0;
