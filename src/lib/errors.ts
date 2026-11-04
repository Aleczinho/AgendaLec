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
    && error.code === '42P01'
  ) {
    return 'As tabelas da Rotina ainda não existem no banco. Reinicie a API (ela aplica as migrations ao iniciar) ou rode "npm run migrate" na pasta server e recarregue a página.'
  }
  return errorMessage(error, 'Não foi possível carregar as regras da Rotina.')
}
