CREATE TABLE IF NOT EXISTS public.routine_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seed_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'rotina',
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE SET NULL,
  weekdays SMALLINT[] NOT NULL,
  start_time TIME,
  end_time TIME,
  start_time_earliest TIME,
  start_time_latest TIME,
  end_time_earliest TIME,
  end_time_latest TIME,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('fixed', 'flexible', 'optional')),
  is_approximate BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_interval_weeks INTEGER NOT NULL DEFAULT 1 CHECK (recurrence_interval_weeks > 0),
  recurrence_anchor_date DATE,
  first_confirmed_on DATE,
  confirmation_required BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from DATE NOT NULL,
  valid_until DATE,
  timezone TEXT NOT NULL DEFAULT 'America/Fortaleza',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT routine_rules_seed_key_unique UNIQUE (user_id, seed_key),
  CONSTRAINT routine_rules_owner_unique UNIQUE (id, user_id),
  CONSTRAINT routine_rules_validity CHECK (valid_until IS NULL OR valid_until >= valid_from),
  CONSTRAINT routine_rules_weekdays CHECK (
    cardinality(weekdays) > 0
    AND weekdays <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::SMALLINT[]
  ),
  CONSTRAINT routine_rules_start_window CHECK (
    start_time_earliest IS NULL
    OR start_time_latest IS NULL
    OR start_time_earliest <= start_time_latest
  ),
  CONSTRAINT routine_rules_end_window CHECK (
    end_time_earliest IS NULL
    OR end_time_latest IS NULL
    OR end_time_earliest <= end_time_latest
  )
);

CREATE INDEX IF NOT EXISTS routine_rules_user_active_idx
  ON public.routine_rules (user_id, is_active, valid_from);

ALTER TABLE public.routine_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own routine rules" ON public.routine_rules;
CREATE POLICY "Users can view own routine rules"
  ON public.routine_rules FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own routine rules" ON public.routine_rules;
CREATE POLICY "Users can insert own routine rules"
  ON public.routine_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own routine rules" ON public.routine_rules;
CREATE POLICY "Users can update own routine rules"
  ON public.routine_rules FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own routine rules" ON public.routine_rules;
CREATE POLICY "Users can delete own routine rules"
  ON public.routine_rules FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.routine_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_rule_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('modified', 'cancelled', 'confirmed', 'skipped', 'kept')),
  overridden_title TEXT,
  overridden_start_time TIME,
  overridden_end_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT routine_exceptions_rule_owner_fk
    FOREIGN KEY (routine_rule_id, user_id)
    REFERENCES public.routine_rules(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT routine_exceptions_rule_date_unique UNIQUE (routine_rule_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS routine_exceptions_user_date_idx
  ON public.routine_exceptions (user_id, occurrence_date);

ALTER TABLE public.routine_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own routine exceptions" ON public.routine_exceptions;
CREATE POLICY "Users can view own routine exceptions"
  ON public.routine_exceptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own routine exceptions" ON public.routine_exceptions;
CREATE POLICY "Users can insert own routine exceptions"
  ON public.routine_exceptions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own routine exceptions" ON public.routine_exceptions;
CREATE POLICY "Users can update own routine exceptions"
  ON public.routine_exceptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own routine exceptions" ON public.routine_exceptions;
CREATE POLICY "Users can delete own routine exceptions"
  ON public.routine_exceptions FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.copy_routine_weekday(source_weekday SMALLINT, target_weekday SMALLINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  source_rule public.routine_rules%ROWTYPE;
  target_rule public.routine_rules%ROWTYPE;
  remaining_days SMALLINT[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF source_weekday < 0 OR source_weekday > 6 OR target_weekday < 0 OR target_weekday > 6 THEN
    RAISE EXCEPTION 'Weekdays must be between 0 and 6';
  END IF;
  IF source_weekday = target_weekday THEN
    RAISE EXCEPTION 'Source and target weekdays must differ';
  END IF;

  FOR target_rule IN
    SELECT * FROM public.routine_rules
    WHERE user_id = auth.uid()
      AND is_active
      AND target_weekday = ANY(weekdays)
    FOR UPDATE
  LOOP
    DELETE FROM public.routine_exceptions
    WHERE routine_rule_id = target_rule.id
      AND user_id = auth.uid()
      AND EXTRACT(DOW FROM occurrence_date) = target_weekday;

    remaining_days := array_remove(target_rule.weekdays, target_weekday);
    IF cardinality(remaining_days) = 0 THEN
      UPDATE public.routine_rules SET is_active = FALSE, updated_at = NOW()
      WHERE id = target_rule.id AND user_id = auth.uid();
    ELSE
      UPDATE public.routine_rules SET weekdays = remaining_days, updated_at = NOW()
      WHERE id = target_rule.id AND user_id = auth.uid();
    END IF;
  END LOOP;

  FOR source_rule IN
    SELECT * FROM public.routine_rules
    WHERE user_id = auth.uid()
      AND is_active
      AND source_weekday = ANY(weekdays)
  LOOP
    INSERT INTO public.routine_rules (
      user_id, title, description, category, calendar_id, weekdays,
      start_time, end_time, start_time_earliest, start_time_latest,
      end_time_earliest, end_time_latest, schedule_type, is_approximate,
      recurrence_interval_weeks, recurrence_anchor_date, first_confirmed_on,
      confirmation_required, valid_from, valid_until, timezone, is_active
    ) VALUES (
      auth.uid(), source_rule.title, source_rule.description, source_rule.category, source_rule.calendar_id, ARRAY[target_weekday],
      source_rule.start_time, source_rule.end_time, source_rule.start_time_earliest, source_rule.start_time_latest,
      source_rule.end_time_earliest, source_rule.end_time_latest, source_rule.schedule_type, source_rule.is_approximate,
      source_rule.recurrence_interval_weeks, source_rule.recurrence_anchor_date, source_rule.first_confirmed_on,
      source_rule.confirmation_required, source_rule.valid_from, source_rule.valid_until, source_rule.timezone, TRUE
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_routine_occurrence(target_rule_id UUID, confirmed_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  confirmed_rule_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  UPDATE public.routine_rules
  SET first_confirmed_on = confirmed_date,
      recurrence_anchor_date = confirmed_date,
      recurrence_interval_weeks = 2,
      confirmation_required = FALSE,
      updated_at = NOW()
  WHERE id = target_rule_id
    AND user_id = auth.uid()
    AND is_active
    AND confirmation_required
  RETURNING id INTO confirmed_rule_id;

  IF confirmed_rule_id IS NULL THEN
    RAISE EXCEPTION 'Routine rule not found or confirmation is no longer pending';
  END IF;

  INSERT INTO public.routine_exceptions (
    routine_rule_id, user_id, occurrence_date, action, overridden_title, notes
  ) VALUES (
    confirmed_rule_id, auth.uid(), confirmed_date, 'confirmed', 'Aprisco', 'Confirmado pelo usuário.'
  )
  ON CONFLICT (routine_rule_id, occurrence_date)
  DO UPDATE SET
    action = 'confirmed',
    overridden_title = 'Aprisco',
    overridden_start_time = NULL,
    overridden_end_time = NULL,
    notes = 'Confirmado pelo usuário.',
    updated_at = NOW();
END;
$$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS certainty TEXT NOT NULL DEFAULT 'confirmed';
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_certainty_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_certainty_check CHECK (certainty IN ('confirmed', 'planned', 'possible'));

ALTER TABLE public.holiday_dates
  ADD COLUMN IF NOT EXISTS seed_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS holiday_dates_seed_key_unique
  ON public.holiday_dates (user_id, seed_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_exceptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holiday_dates TO authenticated;
GRANT EXECUTE ON FUNCTION public.copy_routine_weekday(SMALLINT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_routine_occurrence(UUID, DATE) TO authenticated;
