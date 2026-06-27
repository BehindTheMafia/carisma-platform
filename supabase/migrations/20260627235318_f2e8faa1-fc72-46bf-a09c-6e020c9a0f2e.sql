
-- =====================================================
-- TM RENT A CAR — Schema inicial
-- =====================================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('owner', 'administrador');
CREATE TYPE public.vehiculo_estado AS ENUM ('disponible','rentado','reservado','mantenimiento','fuera_servicio');
CREATE TYPE public.vehiculo_tipo AS ENUM ('propio','subrentado');
CREATE TYPE public.transmision_tipo AS ENUM ('manual','automatica');
CREATE TYPE public.combustible_tipo AS ENUM ('gasolina','diesel','hibrido','electrico','gas');
CREATE TYPE public.renta_estado AS ENUM ('reservada','activa','finalizada','cancelada');
CREATE TYPE public.pago_metodo AS ENUM ('efectivo','transferencia','tarjeta');
CREATE TYPE public.pago_estado AS ENUM ('pendiente','parcial','pagado');
CREATE TYPE public.moneda_tipo AS ENUM ('NIO','USD');
CREATE TYPE public.inspeccion_tipo AS ENUM ('salida','devolucion');
CREATE TYPE public.multa_estado AS ENUM ('pendiente','pagada','disputada');

-- Util: updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  telefono TEXT,
  avatar_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================
-- USER ROLES + has_role
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Acceso completo: owner o administrador
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','administrador'))
$$;

CREATE POLICY "Profiles: ver propio o staff" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Profiles: actualizar propio o staff" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Profiles: insertar staff" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Profiles: eliminar staff" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Roles: staff ve todos" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Trigger: crear profile y asignar rol al primer usuario (owner) o administrador
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INT;
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, nombre, correo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO v_count FROM public.user_roles;
  IF v_count = 0 THEN
    v_role := 'owner';
  ELSE
    v_role := 'administrador';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- CONFIGURACIÓN EMPRESA
-- =====================================================
CREATE TABLE public.configuracion_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL DEFAULT 'TM RENT A CAR',
  ruc TEXT,
  direccion TEXT,
  telefono TEXT,
  correo TEXT,
  sitio_web TEXT,
  logo_url TEXT,
  moneda_principal public.moneda_tipo NOT NULL DEFAULT 'NIO',
  impuesto_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  terminos_contrato TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracion_empresa TO authenticated;
GRANT ALL ON public.configuracion_empresa TO service_role;
ALTER TABLE public.configuracion_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa: staff" ON public.configuracion_empresa FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER empresa_updated_at BEFORE UPDATE ON public.configuracion_empresa FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
INSERT INTO public.configuracion_empresa (nombre) VALUES ('TM RENT A CAR');

-- =====================================================
-- VEHICULOS
-- =====================================================
CREATE TABLE public.vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  placa TEXT NOT NULL UNIQUE,
  vin TEXT UNIQUE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INT NOT NULL,
  color TEXT,
  categoria TEXT,
  tipo_vehiculo TEXT,
  transmision public.transmision_tipo,
  combustible public.combustible_tipo,
  capacidad INT,
  kilometraje INT NOT NULL DEFAULT 0,
  estado public.vehiculo_estado NOT NULL DEFAULT 'disponible',
  tarifa_diaria NUMERIC(12,2) NOT NULL DEFAULT 0,
  tarifa_semanal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tarifa_mensual NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposito NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda public.moneda_tipo NOT NULL DEFAULT 'NIO',
  clasificacion public.vehiculo_tipo NOT NULL DEFAULT 'propio',
  circulacion_vencimiento DATE,
  seguro_vencimiento DATE,
  proximo_mantenimiento_km INT,
  proximo_mantenimiento_fecha DATE,
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  documentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  notas TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehiculos TO authenticated;
GRANT ALL ON public.vehiculos TO service_role;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vehiculos: staff" ON public.vehiculos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER vehiculos_updated_at BEFORE UPDATE ON public.vehiculos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_vehiculos_estado ON public.vehiculos(estado) WHERE deleted_at IS NULL;

-- =====================================================
-- CLIENTES
-- =====================================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  documento TEXT NOT NULL,
  tipo_documento TEXT DEFAULT 'cedula',
  licencia TEXT,
  licencia_vencimiento DATE,
  direccion TEXT,
  ciudad TEXT,
  pais TEXT DEFAULT 'Nicaragua',
  telefono TEXT,
  whatsapp TEXT,
  correo TEXT,
  contacto_emergencia_nombre TEXT,
  contacto_emergencia_telefono TEXT,
  documentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  observaciones TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clientes: staff" ON public.clientes FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_clientes_documento ON public.clientes(documento) WHERE deleted_at IS NULL;

-- =====================================================
-- RENTAS
-- =====================================================
CREATE TABLE public.rentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio TEXT NOT NULL UNIQUE DEFAULT ('R-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id),
  usuario_id UUID REFERENCES auth.users(id),
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_devolucion TIMESTAMPTZ NOT NULL,
  fecha_devolucion_real TIMESTAMPTZ,
  tarifa NUMERIC(12,2) NOT NULL DEFAULT 0,
  dias INT NOT NULL DEFAULT 1,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento NUMERIC(12,2) NOT NULL DEFAULT 0,
  impuesto NUMERIC(12,2) NOT NULL DEFAULT 0,
  extras NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposito NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda public.moneda_tipo NOT NULL DEFAULT 'NIO',
  estado public.renta_estado NOT NULL DEFAULT 'reservada',
  observaciones TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rentas TO authenticated;
GRANT ALL ON public.rentas TO service_role;
ALTER TABLE public.rentas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rentas: staff" ON public.rentas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER rentas_updated_at BEFORE UPDATE ON public.rentas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_rentas_estado ON public.rentas(estado) WHERE deleted_at IS NULL;
CREATE INDEX idx_rentas_vehiculo ON public.rentas(vehiculo_id);
CREATE INDEX idx_rentas_cliente ON public.rentas(cliente_id);

-- Trigger: actualizar estado del vehículo automáticamente
CREATE OR REPLACE FUNCTION public.tg_renta_estado_vehiculo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado = 'activa' THEN
      UPDATE public.vehiculos SET estado='rentado' WHERE id = NEW.vehiculo_id;
    ELSIF NEW.estado = 'reservada' THEN
      UPDATE public.vehiculos SET estado='reservado' WHERE id = NEW.vehiculo_id AND estado='disponible';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      IF NEW.estado = 'activa' THEN
        UPDATE public.vehiculos SET estado='rentado' WHERE id = NEW.vehiculo_id;
      ELSIF NEW.estado IN ('finalizada','cancelada') THEN
        UPDATE public.vehiculos SET estado='disponible' WHERE id = NEW.vehiculo_id;
      ELSIF NEW.estado = 'reservada' THEN
        UPDATE public.vehiculos SET estado='reservado' WHERE id = NEW.vehiculo_id AND estado='disponible';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER rentas_estado_vehiculo
AFTER INSERT OR UPDATE ON public.rentas
FOR EACH ROW EXECUTE FUNCTION public.tg_renta_estado_vehiculo();

-- =====================================================
-- CONTRATOS
-- =====================================================
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renta_id UUID NOT NULL REFERENCES public.rentas(id) ON DELETE CASCADE,
  numero TEXT NOT NULL UNIQUE DEFAULT ('C-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  pdf_url TEXT,
  tipo TEXT NOT NULL DEFAULT 'contrato',
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contratos: staff" ON public.contratos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =====================================================
-- PAGOS
-- =====================================================
CREATE TABLE public.pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renta_id UUID NOT NULL REFERENCES public.rentas(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL,
  moneda public.moneda_tipo NOT NULL DEFAULT 'NIO',
  metodo public.pago_metodo NOT NULL DEFAULT 'efectivo',
  estado public.pago_estado NOT NULL DEFAULT 'pagado',
  referencia TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  observaciones TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagos TO authenticated;
GRANT ALL ON public.pagos TO service_role;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pagos: staff" ON public.pagos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX idx_pagos_renta ON public.pagos(renta_id);
CREATE INDEX idx_pagos_fecha ON public.pagos(fecha);

-- =====================================================
-- MANTENIMIENTOS
-- =====================================================
CREATE TABLE public.mantenimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  fecha DATE NOT NULL,
  taller TEXT,
  costo NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda public.moneda_tipo NOT NULL DEFAULT 'NIO',
  kilometraje INT,
  proximo_fecha DATE,
  proximo_km INT,
  completado BOOLEAN NOT NULL DEFAULT true,
  observaciones TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mantenimientos TO authenticated;
GRANT ALL ON public.mantenimientos TO service_role;
ALTER TABLE public.mantenimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mantenimientos: staff" ON public.mantenimientos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER mantenimientos_updated_at BEFORE UPDATE ON public.mantenimientos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================
-- SEGUROS
-- =====================================================
CREATE TABLE public.seguros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  aseguradora TEXT NOT NULL,
  numero_poliza TEXT NOT NULL,
  cobertura TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  costo NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda public.moneda_tipo NOT NULL DEFAULT 'NIO',
  documentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seguros TO authenticated;
GRANT ALL ON public.seguros TO service_role;
ALTER TABLE public.seguros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seguros: staff" ON public.seguros FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER seguros_updated_at BEFORE UPDATE ON public.seguros FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================
-- MULTAS
-- =====================================================
CREATE TABLE public.multas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id),
  cliente_id UUID REFERENCES public.clientes(id),
  renta_id UUID REFERENCES public.rentas(id),
  fecha DATE NOT NULL,
  descripcion TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda public.moneda_tipo NOT NULL DEFAULT 'NIO',
  estado public.multa_estado NOT NULL DEFAULT 'pendiente',
  evidencias JSONB NOT NULL DEFAULT '[]'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.multas TO authenticated;
GRANT ALL ON public.multas TO service_role;
ALTER TABLE public.multas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Multas: staff" ON public.multas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER multas_updated_at BEFORE UPDATE ON public.multas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================
-- INSPECCIONES
-- =====================================================
CREATE TABLE public.inspecciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renta_id UUID NOT NULL REFERENCES public.rentas(id) ON DELETE CASCADE,
  tipo public.inspeccion_tipo NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  kilometraje INT NOT NULL DEFAULT 0,
  combustible_porcentaje INT NOT NULL DEFAULT 100,
  danos TEXT,
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  firma_url TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspecciones TO authenticated;
GRANT ALL ON public.inspecciones TO service_role;
ALTER TABLE public.inspecciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inspecciones: staff" ON public.inspecciones FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
