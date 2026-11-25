-- Una sola numeración para expedientes y facturas independientes.
-- Conserva los números emitidos aunque después se elimine el documento o la renta.
CREATE OR REPLACE FUNCTION public.clave_numero_documento(p_numero text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN btrim(coalesce(p_numero, '')) ~ '^[0-9]+$'
      THEN coalesce(nullif(ltrim(btrim(p_numero), '0'), ''), '0')
    ELSE upper(btrim(coalesce(p_numero, '')))
  END;
$$;

CREATE TABLE IF NOT EXISTS public.numeros_documento_usados (
  clave text PRIMARY KEY,
  renta_id uuid,
  documento_id uuid,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT numero_tiene_dueno CHECK (renta_id IS NOT NULL OR documento_id IS NOT NULL)
);

-- Primero los expedientes existentes; los documentos de esa renta comparten su número.
INSERT INTO public.numeros_documento_usados (clave, renta_id)
SELECT DISTINCT ON (public.clave_numero_documento(numero_oficial))
  public.clave_numero_documento(numero_oficial), id
FROM public.rentas
WHERE public.clave_numero_documento(numero_oficial) <> ''
ORDER BY public.clave_numero_documento(numero_oficial), created_at, id
ON CONFLICT (clave) DO NOTHING;

INSERT INTO public.numeros_documento_usados (clave, renta_id, documento_id)
SELECT DISTINCT ON (clave) clave, renta_id, documento_id
FROM (
  SELECT public.clave_numero_documento(c.form_data->>'docNum') AS clave,
    c.renta_id, CASE WHEN c.renta_id IS NULL THEN c.id ELSE NULL END AS documento_id,
    c.created_at
  FROM public.contratos c
  WHERE coalesce(c.form_data->>'facturaModo', '') <> 'conceptos' OR c.tipo <> 'factura'
  UNION ALL
  SELECT public.clave_numero_documento(c.form_data->>'facturaNum'),
    c.renta_id, CASE WHEN c.renta_id IS NULL THEN c.id ELSE NULL END, c.created_at
  FROM public.contratos c WHERE c.tipo = 'factura'
  UNION ALL
  SELECT public.clave_numero_documento(c.numero),
    c.renta_id, CASE WHEN c.renta_id IS NULL THEN c.id ELSE NULL END, c.created_at
  FROM public.contratos c WHERE c.tipo = 'factura'
) AS existentes
WHERE clave <> ''
ORDER BY clave, created_at, documento_id
ON CONFLICT (clave) DO NOTHING;

-- El candado serializa la comprobación y la reserva entre pestañas y usuarios.
CREATE OR REPLACE FUNCTION public.reservar_numero_documento(
  p_numero text, p_renta_id uuid, p_documento_id uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_clave text := public.clave_numero_documento(p_numero);
BEGIN
  IF v_clave = '' THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(20661123);

  IF EXISTS (
    SELECT 1 FROM public.numeros_documento_usados u
    WHERE u.clave = v_clave AND NOT (
      (p_renta_id IS NOT NULL AND (
        u.renta_id = p_renta_id OR EXISTS (
          SELECT 1 FROM public.contratos c
          WHERE c.id = u.documento_id AND c.renta_id = p_renta_id
        )
      )) OR (p_documento_id IS NOT NULL AND u.documento_id = p_documento_id)
    )
  ) OR EXISTS (
    SELECT 1 FROM public.rentas r
    WHERE public.clave_numero_documento(r.numero_oficial) = v_clave
      AND r.id IS DISTINCT FROM p_renta_id
  ) OR EXISTS (
    SELECT 1 FROM public.contratos c
    WHERE c.id IS DISTINCT FROM p_documento_id
      AND (p_renta_id IS NULL OR c.renta_id IS DISTINCT FROM p_renta_id)
      AND (
        (NOT (c.tipo = 'factura' AND c.form_data->>'facturaModo' = 'conceptos')
          AND public.clave_numero_documento(c.form_data->>'docNum') = v_clave)
        OR (c.tipo = 'factura' AND public.clave_numero_documento(c.form_data->>'facturaNum') = v_clave)
        OR (c.tipo = 'factura' AND public.clave_numero_documento(c.numero) = v_clave)
      )
  ) THEN
    RAISE EXCEPTION 'El número % ya está utilizado por otra factura o expediente', p_numero
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.numeros_documento_usados (clave, renta_id, documento_id)
  VALUES (v_clave, p_renta_id, CASE WHEN p_renta_id IS NULL THEN p_documento_id ELSE NULL END)
  ON CONFLICT (clave) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_reservar_numeros_contrato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tipo = 'factura' AND NEW.form_data->>'facturaModo' = 'conceptos' THEN
    IF NEW.renta_id IS NOT NULL THEN
      RAISE EXCEPTION 'Una factura por conceptos no puede vincularse a una renta';
    END IF;
    IF public.clave_numero_documento(NEW.form_data->>'facturaNum') = '' THEN
      RAISE EXCEPTION 'Escriba el número de factura antes de guardar';
    END IF;
  ELSE
    PERFORM public.reservar_numero_documento(NEW.form_data->>'docNum', NEW.renta_id, NEW.id);
  END IF;
  IF NEW.tipo = 'factura' THEN
    PERFORM public.reservar_numero_documento(NEW.form_data->>'facturaNum', NEW.renta_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservar_numeros_contrato ON public.contratos;
CREATE TRIGGER reservar_numeros_contrato
BEFORE INSERT OR UPDATE OF form_data, tipo, renta_id ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.tg_reservar_numeros_contrato();

CREATE OR REPLACE FUNCTION public.tg_reservar_numero_renta()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.reservar_numero_documento(NEW.numero_oficial, NEW.id, NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservar_numero_renta ON public.rentas;
CREATE TRIGGER reservar_numero_renta
BEFORE INSERT OR UPDATE OF numero_oficial ON public.rentas
FOR EACH ROW EXECUTE FUNCTION public.tg_reservar_numero_renta();

REVOKE ALL ON public.numeros_documento_usados FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reservar_numero_documento(text, uuid, uuid) FROM PUBLIC;
