-- Add vencimiento_seguro to recordatorio_tipo enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'vencimiento_seguro'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'recordatorio_tipo')
  ) THEN
    ALTER TYPE public.recordatorio_tipo ADD VALUE 'vencimiento_seguro';
  END IF;
END $$;

-- Make cliente_id nullable (insurance reminders are operational, not client-specific)
ALTER TABLE public.recordatorios ALTER COLUMN cliente_id DROP NOT NULL;

-- Update sync function to also generate insurance expiry reminders
CREATE OR REPLACE FUNCTION public.sync_recordatorios()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
  v_seguro_count int;
BEGIN
  -- Renta devolution reminders for tomorrow
  INSERT INTO public.recordatorios (renta_id, cliente_id, vehiculo_id, tipo, fecha_programada, mensaje)
  SELECT
    r.id,
    r.cliente_id,
    r.vehiculo_id,
    'devolucion',
    CURRENT_DATE,
    '🔔 Recordatorio de devolución' || chr(10) || chr(10) ||
    'Estimado/a ' || c.nombre || ',' || chr(10) || chr(10) ||
    'Le recordamos que la renta del vehículo ' || v.marca || ' ' || v.modelo || ' (placa: ' || v.placa || ') debe ser devuelta mañana ' ||
    to_char(r.fecha_devolucion AT TIME ZONE 'America/Managua', 'DD/MM/YYYY') || '.' || chr(10) || chr(10) ||
    'Por favor, realice la devolución en la hora acordada para evitar cargos adicionales.' || chr(10) || chr(10) ||
    '¡Gracias por preferirnos!' || chr(10) ||
    'TM RENT A CAR'
  FROM public.rentas r
  JOIN public.clientes c ON c.id = r.cliente_id
  JOIN public.vehiculos v ON v.id = r.vehiculo_id
  WHERE r.estado IN ('reservada', 'activa')
    AND r.deleted_at IS NULL
    AND r.fecha_devolucion::date = CURRENT_DATE + 1
    AND NOT EXISTS (
      SELECT 1 FROM public.recordatorios rec
      WHERE rec.renta_id = r.id AND rec.tipo = 'devolucion' AND rec.fecha_programada = CURRENT_DATE
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Insurance expiry reminders for policies expiring in 7 days
  INSERT INTO public.recordatorios (vehiculo_id, tipo, fecha_programada, mensaje)
  SELECT
    s.vehiculo_id,
    'vencimiento_seguro',
    CURRENT_DATE,
    '⚠️ Vencimiento de seguro' || chr(10) || chr(10) ||
    'El seguro del vehículo ' || v.marca || ' ' || v.modelo || ' (placa: ' || v.placa || ')' || chr(10) ||
    'con ' || s.aseguradora || ' (póliza: ' || s.numero_poliza || ')' || chr(10) ||
    'vence el ' || to_char(s.fecha_vencimiento, 'DD/MM/YYYY') || '.' || chr(10) || chr(10) ||
    'Por favor, gestionar la renovación antes de la fecha de vencimiento para mantener la flota asegurada.' || chr(10) || chr(10) ||
    'TM RENT A CAR'
  FROM public.seguros s
  JOIN public.vehiculos v ON v.id = s.vehiculo_id
  WHERE s.activo = true
    AND s.deleted_at IS NULL
    AND s.fecha_vencimiento = CURRENT_DATE + 7
    AND NOT EXISTS (
      SELECT 1 FROM public.recordatorios rec
      WHERE rec.vehiculo_id = s.vehiculo_id AND rec.tipo = 'vencimiento_seguro' AND rec.fecha_programada = CURRENT_DATE
    );

  GET DIAGNOSTICS v_seguro_count = ROW_COUNT;
  v_count := v_count + v_seguro_count;

  RETURN v_count;
END;
$$;
