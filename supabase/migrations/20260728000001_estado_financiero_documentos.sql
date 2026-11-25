-- =====================================================
-- Estado financiero + Gestión de documentos
-- =====================================================

-- Nuevos enums (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_financiero_tipo') THEN
    CREATE TYPE public.estado_financiero_tipo AS ENUM ('sin_pagar','pago_parcial','pagada','reembolsada');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contrato_estado') THEN
    CREATE TYPE public.contrato_estado AS ENUM ('emitido','anulado','reemplazado');
  END IF;
END $$;

-- Agregar estado_financiero a rentas (idempotent)
ALTER TABLE public.rentas
  ADD COLUMN IF NOT EXISTS estado_financiero public.estado_financiero_tipo NOT NULL DEFAULT 'sin_pagar';

-- Agregar estado a contratos (idempotent)
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS estado public.contrato_estado NOT NULL DEFAULT 'emitido';

-- Trigger: actualizar estado_financiero automáticamente según pagos
CREATE OR REPLACE FUNCTION public.tg_renta_actualizar_estado_financiero()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_total NUMERIC(12,2);
  v_pagado NUMERIC(12,2);
  v_deposito NUMERIC(12,2);
BEGIN
  SELECT r.total, r.deposito INTO v_total, v_deposito
  FROM public.rentas r WHERE r.id = COALESCE(NEW.renta_id, OLD.renta_id);

  SELECT COALESCE(SUM(p.monto), 0) INTO v_pagado
  FROM public.pagos p
  WHERE p.renta_id = COALESCE(NEW.renta_id, OLD.renta_id)
    AND p.estado = 'pagado'
    AND p.deleted_at IS NULL;

  IF v_pagado <= 0 THEN
    UPDATE public.rentas SET estado_financiero = 'sin_pagar'
    WHERE id = COALESCE(NEW.renta_id, OLD.renta_id);
  ELSIF v_pagado >= (v_total + v_deposito) THEN
    UPDATE public.rentas SET estado_financiero = 'pagada'
    WHERE id = COALESCE(NEW.renta_id, OLD.renta_id);
  ELSE
    UPDATE public.rentas SET estado_financiero = 'pago_parcial'
    WHERE id = COALESCE(NEW.renta_id, OLD.renta_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tg_renta_estado_financiero ON public.pagos;
CREATE TRIGGER tg_renta_estado_financiero
  AFTER INSERT OR UPDATE OR DELETE ON public.pagos
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_renta_actualizar_estado_financiero();

CREATE INDEX IF NOT EXISTS idx_contratos_renta_id ON public.contratos(renta_id);

-- Agregar estado "cotizacion" al enum de renta (idempotent via IF NOT EXISTS)
ALTER TYPE public.renta_estado ADD VALUE IF NOT EXISTS 'cotizacion';
