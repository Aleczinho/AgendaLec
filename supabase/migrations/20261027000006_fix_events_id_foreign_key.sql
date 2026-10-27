ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_id_fkey;

ALTER TABLE public.events
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
