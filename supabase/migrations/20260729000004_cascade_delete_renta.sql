-- Cascade soft-delete for renta + all related records
-- Runs inside a single transaction to maintain data integrity

CREATE OR REPLACE FUNCTION public.eliminar_renta_completa(p_renta_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Soft-delete payments
  UPDATE public.pagos SET deleted_at = NOW() WHERE renta_id = p_renta_id AND deleted_at IS NULL;

  -- Soft-delete expense records
  UPDATE public.egresos SET deleted_at = NOW() WHERE renta_id = p_renta_id AND deleted_at IS NULL;

  -- Soft-delete contracts
  UPDATE public.contratos SET deleted_at = NOW() WHERE renta_id = p_renta_id AND deleted_at IS NULL;

  -- Soft-delete debit notes
  UPDATE public.notas_debito SET deleted_at = NOW() WHERE renta_id = p_renta_id AND deleted_at IS NULL;

  -- Soft-delete activity log (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'renta_log') THEN
    UPDATE public.renta_log SET deleted_at = NOW() WHERE renta_id = p_renta_id AND deleted_at IS NULL;
  END IF;

  -- Soft-delete reminders
  UPDATE public.recordatorios SET deleted_at = NOW() WHERE renta_id = p_renta_id AND deleted_at IS NULL;

  -- Soft-delete the renta itself
  UPDATE public.rentas SET deleted_at = NOW() WHERE id = p_renta_id AND deleted_at IS NULL;
END;
$$;
