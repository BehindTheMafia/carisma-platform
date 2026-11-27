-- Un pago tiene exactamente un origen: renta, factura independiente o nota de débito.
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS nota_debito_id uuid
  REFERENCES public.notas_debito(id) ON DELETE RESTRICT;
ALTER TABLE public.pagos DROP CONSTRAINT IF EXISTS pagos_origen_unico;
ALTER TABLE public.pagos ADD CONSTRAINT pagos_origen_unico CHECK (
  (CASE WHEN renta_id IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN contrato_id IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN nota_debito_id IS NOT NULL THEN 1 ELSE 0 END) = 1
);
CREATE INDEX IF NOT EXISTS idx_pagos_nota_debito ON public.pagos(nota_debito_id)
  WHERE nota_debito_id IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.validar_pago_nota_debito()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_nota public.notas_debito%ROWTYPE;
  v_pagado numeric;
BEGIN
  IF NEW.nota_debito_id IS NULL OR NEW.deleted_at IS NOT NULL OR NEW.estado <> 'pagado' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_nota FROM public.notas_debito WHERE id = NEW.nota_debito_id FOR UPDATE;
  IF NOT FOUND OR v_nota.estado <> 'emitida' OR v_nota.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Solo se pueden abonar notas de débito emitidas y vigentes';
  END IF;
  IF NEW.moneda <> v_nota.moneda OR NEW.monto <= 0 THEN
    RAISE EXCEPTION 'El abono debe ser positivo y en la moneda de la nota de débito';
  END IF;
  SELECT coalesce(sum(monto), 0) INTO v_pagado FROM public.pagos
    WHERE nota_debito_id = NEW.nota_debito_id AND id IS DISTINCT FROM NEW.id
      AND deleted_at IS NULL AND estado = 'pagado';
  IF v_pagado + NEW.monto > v_nota.total + 0.005 THEN
    RAISE EXCEPTION 'El abono supera el saldo pendiente de la nota de débito';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validar_pago_nota_debito ON public.pagos;
CREATE TRIGGER validar_pago_nota_debito
  BEFORE INSERT OR UPDATE OF monto, moneda, estado, nota_debito_id, deleted_at ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.validar_pago_nota_debito();

-- Mantener consistente el total y estado de las notas que ya recibieron abonos.
CREATE OR REPLACE FUNCTION public.validar_nota_debito_cobrada()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_pagado numeric;
BEGIN
  SELECT coalesce(sum(monto), 0) INTO v_pagado FROM public.pagos
    WHERE nota_debito_id = NEW.id AND deleted_at IS NULL AND estado = 'pagado';
  IF v_pagado > 0 AND (
    NEW.estado <> 'emitida' OR NEW.deleted_at IS NOT NULL OR
    NEW.moneda <> OLD.moneda OR NEW.total + 0.005 < v_pagado
  ) THEN
    RAISE EXCEPTION 'La nota tiene abonos: no se puede anular, eliminar, cambiar moneda o reducir el total bajo lo pagado';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validar_nota_debito_cobrada ON public.notas_debito;
CREATE TRIGGER validar_nota_debito_cobrada
  BEFORE UPDATE OF estado, total, moneda, deleted_at ON public.notas_debito
  FOR EACH ROW EXECUTE FUNCTION public.validar_nota_debito_cobrada();
