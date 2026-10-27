ALTER TABLE public.events
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
