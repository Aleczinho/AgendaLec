ALTER TABLE public.holiday_dates
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
