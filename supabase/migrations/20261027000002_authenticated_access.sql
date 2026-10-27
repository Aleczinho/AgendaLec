GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.calendars,
  public.events,
  public.holiday_dates,
  public.routine_rules,
  public.routine_exceptions
TO authenticated;

REVOKE ALL ON TABLE
  public.profiles,
  public.calendars,
  public.events,
  public.holiday_dates,
  public.routine_rules,
  public.routine_exceptions
FROM anon;

REVOKE ALL ON TABLE public.user_stats FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can view own holiday_dates" ON public.holiday_dates;
DROP POLICY IF EXISTS "Users can view own or global holiday_dates" ON public.holiday_dates;
CREATE POLICY "Users can view own or global holiday_dates"
  ON public.holiday_dates
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);
