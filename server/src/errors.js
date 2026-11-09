import { Prisma } from './db.js'

export class ApiError extends Error {
  constructor(message, { status = 400, code } = {}) {
    super(message)
    this.status = status
    this.code = code
  }
}

// O front (e os testes) esperam códigos no estilo PostgreSQL. O Prisma devolve códigos Pxxxx,
// então traduzimos para o equivalente e usamos mensagens curtas: a mensagem original do Prisma
// carrega trechos da consulta e do schema, que não devem chegar ao navegador.
const KNOWN = {
  P2000: ['22001', 'Valor longo demais para a coluna.'],
  P2002: ['23505', 'Já existe um registro com estes valores (violação de unicidade).'],
  P2003: ['23503', 'Referência inválida: o registro relacionado não existe.'],
  P2004: ['23514', 'Os valores violam uma regra do banco de dados.'],
  P2005: ['22P02', 'Valor inválido para a coluna.'],
  P2006: ['22P02', 'Valor inválido para a coluna.'],
  P2007: ['22P02', 'Valor inválido para a coluna.'],
  P2011: ['23502', 'Campo obrigatório ausente.'],
  P2012: ['23502', 'Campo obrigatório ausente.'],
  P2021: ['42P01', 'A tabela não existe no banco. Aplique as migrations.'],
  P2022: ['42703', 'A coluna não existe no banco. Aplique as migrations.'],
  P2023: ['22P02', 'Valor inválido para a coluna.'],
}

/** Converte erros esperados (validação, Prisma) em ApiError; devolve null para erros inesperados. */
export const toApiError = error => {
  if (error instanceof ApiError) return error
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ApiError('Valores inválidos para esta operação.', { code: '22P02' })
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && Object.hasOwn(KNOWN, error.code)) {
    const [code, message] = KNOWN[error.code]
    return new ApiError(message, { code })
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError && /violates check constraint/i.test(error.message)) {
    return new ApiError('Os valores violam uma regra do banco de dados.', { code: '23514' })
  }
  return null
}
