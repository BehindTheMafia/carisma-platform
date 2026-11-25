-- Create recordatorios table for reminders

CREATE TYPE public.recordatorio_tipo AS ENUM ('devolucion', 'personalizado');

CREATE TABLE public.recordatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renta_id UUID REFERENCES public.rentas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  vehiculo_id UUID REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  tipo public.recordatorio_tipo NOT NULL DEFAULT 'devolucion',
  fecha_programada DATE NOT NULL,
  mensaje TEXT NOT NULL,
  leido BOOLEAN NOT NULL DEFAULT false,
  enviado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recordatorios_fecha ON public.recordatorios(fecha_programada);
CREATE INDEX idx_recordatorios_renta ON public.recordatorios(renta_id);
CREATE INDEX idx_recordatorios_cliente ON public.recordatorios(cliente_id);

-- Auto-generate reminders for rentals due tomorrow
CREATE OR REPLACE FUNCTION public.sync_recordatorios()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
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
  RETURN v_count;
END;
$$;

-- RLS
ALTER TABLE public.recordatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read recordatorios"
ON public.recordatorios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can insert recordatorios"
ON public.recordatorios FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Staff can update recordatorios"
ON public.recordatorios FOR UPDATE
TO authenticated
USING (true);
