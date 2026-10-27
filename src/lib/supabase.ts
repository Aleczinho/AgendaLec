// Singleton client do Supabase
// Este arquivo é importado pelos providers para garantir uma única instância

import { createClient } from '@supabase/supabase-js'
import type { Session, User } from '@supabase/supabase-js'

// Tipos úteis para o Supabase
type SupabaseClient = ReturnType<typeof createClient>

// Instância única - criada uma vez e reutilizada em todo o aplicativo
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey)
export const supabaseConfigurationError =
  'Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY) no arquivo .env e reinicie o servidor.'

export const supabase = createClient(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseKey ?? 'supabase-not-configured',
)

export const assertSupabaseConfigured = () => {
  if (!supabaseConfigured) throw new Error(supabaseConfigurationError)
}

// Tipos auxiliares para as operações comuns
export type {
  SupabaseClient,
  User,
  Session,
}

// Funções auxiliares frequentemente usadas
export const getUser = async (): Promise<User | null> => {
  assertSupabaseConfigured()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getSession = async (): Promise<Session | null> => {
  assertSupabaseConfigured()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export const signInWithPassword = async (email: string, password: string) => {
  assertSupabaseConfigured()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export const signUp = async (email: string, password: string) => {
  assertSupabaseConfigured()
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

export const signOut = async () => {
  assertSupabaseConfigured()
  const { error } = await supabase.auth.signOut()
  return { error }
}