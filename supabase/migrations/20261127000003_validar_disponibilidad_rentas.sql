-- Las reservas ocupan [inicio, devolución): se puede retirar el vehículo el
-- mismo día en que termina otra renta, pero nunca durante el mismo período.
CREATE INDEX IF NOT EXISTS idx_rentas_disponibilidad
  ON public.rentas (vehiculo_id, fecha_inicio, fecha_devolucion)
  WHERE deleted_at IS NULL AND estado IN ('reservada', 'activa');

CREATE OR REPLACE FUNCTION public.validar_disponibilidad_renta()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.estado NOT IN ('reservada', 'activa') THEN
    RETURN NEW;
  END IF;

  IF NEW.fecha_devolucion <= NEW.fecha_inicio THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'La devolución debe ser posterior al inicio de la renta';
  END IF;

  -- Serializa las altas y ediciones del mismo vehículo. Así dos usuarios no
  -- pueden confirmar simultáneamente períodos que se cruzan.
  PERFORM 1 FROM public.vehiculos WHERE id = NEW.vehiculo_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.rentas r
    WHERE r.vehiculo_id = NEW.vehiculo_id
      AND r.id <> NEW.id
      AND r.deleted_at IS NULL
      AND r.estado IN ('reservada', 'activa')
      AND r.fecha_inicio < NEW.fecha_devolucion
      AND r.fecha_devolucion > NEW.fecha_inicio
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23P01',
      MESSAGE = 'El vehículo ya tiene una renta activa o reservada en esas fechas';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_disponibilidad_renta ON public.rentas;
CREATE TRIGGER validar_disponibilidad_renta
  BEFORE INSERT OR UPDATE OF vehiculo_id, fecha_inicio, fecha_devolucion, estado, deleted_at
  ON public.rentas FOR EACH ROW
  EXECUTE FUNCTION public.validar_disponibilidad_renta();
