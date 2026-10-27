export const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}

export const routineSchemaErrorMessage = (error: unknown) => {
  if (
    error
    && typeof error === 'object'
    && 'code' in error
    && error.code === 'PGRST205'
  ) {
    return 'As tabelas da Rotina ainda não existem no Supabase. Aplique a migration 20261027000001_routine_rules.sql e recarregue a página.'
  }
  return errorMessage(error, 'Não foi possível carregar as regras da Rotina.')
}
