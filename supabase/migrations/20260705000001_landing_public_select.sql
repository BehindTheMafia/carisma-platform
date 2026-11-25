-- Landing page: public SELECT for vehiculos + rentas (availability)
-- Allows anonymous users to read vehicle info and check availability

GRANT SELECT ON public.vehiculos TO anon;
CREATE POLICY "Vehiculos: public select" ON public.vehiculos FOR SELECT TO anon
  USING (deleted_at IS NULL);

GRANT SELECT ON public.rentas TO anon;
CREATE POLICY "Rentas: public availability" ON public.rentas FOR SELECT TO anon
  USING (deleted_at IS NULL AND estado IN ('reservada', 'activa'));
