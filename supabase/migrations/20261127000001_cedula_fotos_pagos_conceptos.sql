-- Las cédulas contienen datos sensibles: bucket privado y acceso exclusivo de staff.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS cedula_fotos jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.clientes
  DROP CONSTRAINT IF EXISTS clientes_cedula_fotos_limite;
ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_cedula_fotos_limite
  CHECK (jsonb_typeof(cedula_fotos) = 'array' AND jsonb_array_length(cedula_fotos) <= 3);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cedulas-clientes', 'cedulas-clientes', false, 2097152, ARRAY['image/webp', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg'];

DROP POLICY IF EXISTS "Staff sube cedulas" ON storage.objects;
DROP POLICY IF EXISTS "Staff consulta cedulas" ON storage.objects;
DROP POLICY IF EXISTS "Staff elimina cedulas" ON storage.objects;
CREATE POLICY "Staff sube cedulas" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cedulas-clientes' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff consulta cedulas" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cedulas-clientes' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff elimina cedulas" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cedulas-clientes' AND public.is_staff(auth.uid()));

-- Un cobro pertenece a una renta o a una factura independiente, nunca a ambas.
ALTER TABLE public.pagos ALTER COLUMN renta_id DROP NOT NULL;
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS contrato_id uuid
  REFERENCES public.contratos(id) ON DELETE RESTRICT;
ALTER TABLE public.pagos DROP CONSTRAINT IF EXISTS pagos_origen_unico;
ALTER TABLE public.pagos ADD CONSTRAINT pagos_origen_unico
  CHECK ((renta_id IS NULL) <> (contrato_id IS NULL));
CREATE INDEX IF NOT EXISTS idx_pagos_contrato ON public.pagos(contrato_id)
  WHERE contrato_id IS NOT NULL AND deleted_at IS NULL;

-- Serializa los abonos de una misma factura y evita cobrar por encima del total.
CREATE OR REPLACE FUNCTION public.validar_pago_factura_conceptos()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_doc public.contratos%ROWTYPE;
  v_total numeric;
  v_pagado numeric;
  v_tasa numeric;
  v_monto numeric;
  v_moneda text;
BEGIN
  IF NEW.contrato_id IS NULL OR NEW.deleted_at IS NOT NULL OR NEW.estado <> 'pagado' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_doc FROM public.contratos WHERE id = NEW.contrato_id FOR UPDATE;
  IF NOT FOUND OR v_doc.tipo <> 'factura' OR
     v_doc.form_data->>'facturaModo' <> 'conceptos' OR v_doc.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Los abonos independientes requieren una factura por conceptos vigente';
  END IF;
  v_moneda := coalesce(v_doc.form_data->>'monedaConceptos', 'USD');
  v_tasa := (v_doc.form_data->>'tasa')::numeric;
  IF v_moneda NOT IN ('USD', 'NIO') OR v_tasa IS NULL OR v_tasa <= 0 OR NEW.monto <= 0 THEN
    RAISE EXCEPTION 'Moneda, tasa o monto de pago inválido';
  END IF;

  SELECT coalesce(sum(round((x->>'cantidad')::numeric * (x->>'precioUnitario')::numeric, 2)), 0)
    INTO v_total
  FROM jsonb_array_elements(coalesce(v_doc.form_data->'conceptosFactura', '[]'::jsonb)) x;
  SELECT coalesce(sum(CASE WHEN p.moneda::text = v_moneda THEN p.monto
    WHEN v_moneda = 'USD' THEN p.monto / v_tasa ELSE p.monto * v_tasa END), 0)
    INTO v_pagado
  FROM public.pagos p WHERE p.contrato_id = NEW.contrato_id
    AND p.id IS DISTINCT FROM NEW.id AND p.deleted_at IS NULL AND p.estado = 'pagado';
  v_monto := CASE WHEN NEW.moneda::text = v_moneda THEN NEW.monto
    WHEN v_moneda = 'USD' THEN NEW.monto / v_tasa ELSE NEW.monto * v_tasa END;
  IF v_total <= 0 OR v_pagado + v_monto > v_total + 0.005 THEN
    RAISE EXCEPTION 'El abono supera el saldo de la factura';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_pago_factura_conceptos ON public.pagos;
CREATE TRIGGER validar_pago_factura_conceptos
BEFORE INSERT OR UPDATE OF monto, moneda, estado, contrato_id, deleted_at ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.validar_pago_factura_conceptos();
