-- Enable pg_cron extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule sync_recordatorios() daily at 12:00 UTC (06:00 Nicaragua)
SELECT cron.schedule(
  'sync-recordatorios-diario',
  '0 12 * * *',
  'SELECT public.sync_recordatorios();'
);
