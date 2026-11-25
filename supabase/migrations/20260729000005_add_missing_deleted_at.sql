  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rentas' AND column_name = 'deleted_at') THEN
      ALTER TABLE public.rentas ADD COLUMN deleted_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_rentas_estado ON public.rentas(estado) WHERE deleted_at IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pagos' AND column_name = 'deleted_at') THEN
      ALTER TABLE public.pagos ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contratos' AND column_name = 'deleted_at') THEN
      ALTER TABLE public.contratos ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notas_debito' AND column_name = 'deleted_at') THEN
      ALTER TABLE public.notas_debito ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

END $$;
