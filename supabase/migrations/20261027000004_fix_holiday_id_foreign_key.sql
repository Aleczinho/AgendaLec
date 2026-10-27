ALTER TABLE public.holiday_dates
  DROP CONSTRAINT IF EXISTS holiday_dates_id_fkey;

ALTER TABLE public.holiday_dates
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
