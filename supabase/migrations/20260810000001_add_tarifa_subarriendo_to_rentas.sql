-- Add daily sublease rate to rentas
-- tarifa_subarriendo: daily amount paid to the vehicle owner (subrentado only)

DO $$
BEGIN
  IF to_regclass('public.rentas') IS NOT NULL THEN
    ALTER TABLE public.rentas
      ADD COLUMN IF NOT EXISTS tarifa_subarriendo numeric NOT NULL DEFAULT 0;
  END IF;
END $$;
