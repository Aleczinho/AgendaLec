// Singleton client do Supabase
// Este arquivo é importado pelos providers para garantir uma única instância

import { createClient } from '@supabase/supabase-js'

// Tipos úteis para o Supabase
type SupabaseClient = ReturnType<typeof createClient>

// Instância única - criada uma vez e reutilizada em todo o aplicativo
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Tipos auxiliares para as operações comuns
export type {
  SupabaseClient,
  User,
  Session,
  Profile,
  Calendar,
  Event,
}

// Funções auxiliares frequentemente usadas
export const getUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getSession = async (): Promise<Session | null> => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}