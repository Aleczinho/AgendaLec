-- ============================================================
-- AgendaLec - Schema PostgreSQL (substitui as migrations do Supabase)
-- Requer PostgreSQL 13+ (gen_random_uuid() nativo).
-- O isolamento por usuário (antes feito por RLS) agora é aplicado pela API.
-- ============================================================

-- Usuários e credenciais (substitui auth.users do Supabase)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT DEFAULT 'America/Fortaleza',
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS calendars_user_idx ON calendars (user_id);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  color TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  recurrence_rule TEXT,
  certainty TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT events_certainty_check CHECK (certainty IN ('confirmed', 'planned', 'possible'))
);
CREATE INDEX IF NOT EXISTS events_user_start_idx ON events (user_id, start_at);

-- user_id NULL = feriado global, visível a todos os usuários
CREATE TABLE IF NOT EXISTS holiday_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  scope TEXT, -- 'nacional', 'estadual', 'municipal'
  municipality TEXT,
  state TEXT,
  source_url TEXT,
  verification_status TEXT DEFAULT 'pending',
  seed_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS holiday_dates_seed_key_unique ON holiday_dates (user_id, seed_key);
CREATE INDEX IF NOT EXISTS holiday_dates_user_date_idx ON holiday_dates (user_id, date);

CREATE TABLE IF NOT EXISTS routine_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seed_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'rotina',
  calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL,
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
    start_time_earliest IS NULL OR start_time_latest IS NULL OR start_time_earliest <= start_time_latest
  ),
  CONSTRAINT routine_rules_end_window CHECK (
    end_time_earliest IS NULL OR end_time_latest IS NULL OR end_time_earliest <= end_time_latest
  )
);
CREATE INDEX IF NOT EXISTS routine_rules_user_active_idx ON routine_rules (user_id, is_active, valid_from);

CREATE TABLE IF NOT EXISTS routine_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_rule_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    REFERENCES routine_rules(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT routine_exceptions_rule_date_unique UNIQUE (routine_rule_id, occurrence_date)
);
CREATE INDEX IF NOT EXISTS routine_exceptions_user_date_idx ON routine_exceptions (user_id, occurrence_date);

-- Copia a rotina de um dia da semana para outro (substitui a regra do dia de destino).
CREATE OR REPLACE FUNCTION copy_routine_weekday(p_user_id UUID, source_weekday SMALLINT, target_weekday SMALLINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  source_rule routine_rules%ROWTYPE;
  target_rule routine_rules%ROWTYPE;
  remaining_days SMALLINT[];
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF source_weekday < 0 OR source_weekday > 6 OR target_weekday < 0 OR target_weekday > 6 THEN
    RAISE EXCEPTION 'Weekdays must be between 0 and 6';
  END IF;
  IF source_weekday = target_weekday THEN
    RAISE EXCEPTION 'Source and target weekdays must differ';
  END IF;

  FOR target_rule IN
    SELECT * FROM routine_rules
    WHERE user_id = p_user_id
      AND is_active
      AND target_weekday = ANY(weekdays)
    FOR UPDATE
  LOOP
    DELETE FROM routine_exceptions
    WHERE routine_rule_id = target_rule.id
      AND user_id = p_user_id
      AND EXTRACT(DOW FROM occurrence_date) = target_weekday;

    remaining_days := array_remove(target_rule.weekdays, target_weekday);
    IF cardinality(remaining_days) = 0 THEN
      UPDATE routine_rules SET is_active = FALSE, updated_at = NOW()
      WHERE id = target_rule.id AND user_id = p_user_id;
    ELSE
      UPDATE routine_rules SET weekdays = remaining_days, updated_at = NOW()
      WHERE id = target_rule.id AND user_id = p_user_id;
    END IF;
  END LOOP;

  FOR source_rule IN
    SELECT * FROM routine_rules
    WHERE user_id = p_user_id
      AND is_active
      AND source_weekday = ANY(weekdays)
  LOOP
    INSERT INTO routine_rules (
      user_id, title, description, category, calendar_id, weekdays,
      start_time, end_time, start_time_earliest, start_time_latest,
      end_time_earliest, end_time_latest, schedule_type, is_approximate,
      recurrence_interval_weeks, recurrence_anchor_date, first_confirmed_on,
      confirmation_required, valid_from, valid_until, timezone, is_active
    ) VALUES (
      p_user_id, source_rule.title, source_rule.description, source_rule.category, source_rule.calendar_id, ARRAY[target_weekday],
      source_rule.start_time, source_rule.end_time, source_rule.start_time_earliest, source_rule.start_time_latest,
      source_rule.end_time_earliest, source_rule.end_time_latest, source_rule.schedule_type, source_rule.is_approximate,
      source_rule.recurrence_interval_weeks, source_rule.recurrence_anchor_date, source_rule.first_confirmed_on,
      source_rule.confirmation_required, source_rule.valid_from, source_rule.valid_until, source_rule.timezone, TRUE
    );
  END LOOP;
END;
$$;

-- Confirma uma ocorrência pendente e passa a regra para repetição quinzenal.
CREATE OR REPLACE FUNCTION confirm_routine_occurrence(p_user_id UUID, target_rule_id UUID, confirmed_date DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  confirmed_rule_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  UPDATE routine_rules
  SET first_confirmed_on = confirmed_date,
      recurrence_anchor_date = confirmed_date,
      recurrence_interval_weeks = 2,
      confirmation_required = FALSE,
      updated_at = NOW()
  WHERE id = target_rule_id
    AND user_id = p_user_id
    AND is_active
    AND confirmation_required
  RETURNING id INTO confirmed_rule_id;

  IF confirmed_rule_id IS NULL THEN
    RAISE EXCEPTION 'Routine rule not found or confirmation is no longer pending';
  END IF;

  INSERT INTO routine_exceptions (
    routine_rule_id, user_id, occurrence_date, action, overridden_title, notes
  ) VALUES (
    confirmed_rule_id, p_user_id, confirmed_date, 'confirmed', 'Aprisco', 'Confirmado pelo usuário.'
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
