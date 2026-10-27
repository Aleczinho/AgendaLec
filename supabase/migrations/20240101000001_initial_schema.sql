-- ============================================================
-- AgendaLec - Schema Inicial
-- Data: 2024-01-01
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Tabela: profiles
-- Descrição: Perfil do usuário, armazenando preferências e dados adicionais
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  display_name TEXT,
  timezone TEXT DEFAULT 'America/Fortaleza',
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS no profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- Tabela: calendars
-- Descrição: Agendas/calendários do usuário (ex: Rotina Pessoal, Escola, Igreja)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS no calendars
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para calendars
CREATE POLICY "Users can view own calendars" ON public.calendars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calendars" ON public.calendars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendars" ON public.calendars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendars" ON public.calendars FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Tabela: events
-- Descrição: Eventos/compromissos do usuário
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  calendar_id UUID REFERENCES public.calendars ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  color TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  recurrence_rule TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS no events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para events
CREATE POLICY "Users can view own events" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.events FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Tabela: holiday_dates
-- Descrição: Feriados e datas especiais (pode ser populado via API ou manual)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.holiday_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  scope TEXT, -- 'nacional', 'estadual', 'municipal'
  municipality TEXT,
  state TEXT,
  source_url TEXT,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS no holiday_dates
ALTER TABLE public.holiday_dates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para holiday_dates
CREATE POLICY "Users can view own holiday_dates" ON public.holiday_dates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own holiday_dates" ON public.holiday_dates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own holiday_dates" ON public.holiday_dates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own holiday_dates" ON public.holiday_dates FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- View: user_stats (opcional - para dashboard)
-- ============================================================
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
  p.id AS user_id,
  p.display_name,
  COUNT(DISTINCT e.id) AS total_events,
  COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) AS completed_events,
  COUNT(DISTINCT CASE WHEN e.status = 'pending' THEN e.id END) AS pending_events,
  COUNT(DISTINCT c.id) AS total_calendars
FROM public.profiles p
LEFT JOIN public.events e ON p.id = e.user_id
LEFT JOIN public.calendars c ON p.id = c.user_id
GROUP BY p.id, p.display_name;

-- Grant permissions para anon role (necessário para o frontend funcionar)
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.calendars TO anon;
GRANT ALL ON public.events TO anon;
GRANT ALL ON public.holiday_dates TO anon;
GRANT SELECT ON public.user_stats TO anon;

-- Comment for documentation
COMMENT ON TABLE public.profiles IS 'Perfil estendido do usuário - AgendaLec';
COMMENT ON TABLE public.calendars IS 'Agendas/calendários pessoais do usuário';
COMMENT ON TABLE public.events IS 'Eventos/compromissos do usuário';
COMMENT ON TABLE public.holiday_dates IS 'Feriados e datas especiais do usuário';