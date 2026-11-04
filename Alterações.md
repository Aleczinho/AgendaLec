# Resumo: migração do acesso ao banco para Prisma ORM

Toda consulta SQL da API (`server/`) agora passa pelo Prisma Client. O driver `pg` e o construtor de SQL por texto foram removidos. O contrato de `POST /api/db` e `POST /api/rpc/:nome` não mudou, então o front continua igual.

## Arquivos novos

| Arquivo | O que faz |
| --- | --- |
| `server/prisma/schema.prisma` | Models das 7 tabelas, com nomes iguais aos das tabelas e colunas (snake_case). |
| `server/prisma/migrations/20261103000000_init/migration.sql` | Esquema anterior (antigo `001_schema.sql`) como migration inicial. |
| `server/prisma/migrations/migration_lock.toml` | Controle de provider do Prisma Migrate. |
| `server/src/dataOps.js` | Traduz o corpo de `/api/db` em chamadas do Prisma Client (`findMany`, `createMany`, `updateMany`, `deleteMany`). |
| `server/src/routineOps.js` | `copy_routine_weekday` e `confirm_routine_occurrence` reescritas com Prisma, em transação. |
| `server/src/values.js` | Converte texto ⇄ `Date` (DATE, TIME e timestamptz seguem chegando ao front como texto). |
| `server/src/errors.js` | `ApiError` e tradução de erros do Prisma (`P2002` etc.) para códigos PostgreSQL (`23505` etc.), sem vazar a mensagem original. |
| `server/scripts/prisma.js` | Atalho para o CLI do Prisma com a `DATABASE_URL` montada a partir do `.env`. |
| `docs/PRISMA.md` | Guia: arquivos, comandos, banco existente, limites do Prisma. |

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `server/src/db.js` | `PrismaClient` único e `withTransaction` no lugar do `pg.Pool` e dos type parsers. |
| `server/src/config.js` | Monta a `DATABASE_URL` do Prisma a partir de `DB_*` (ou usa a `DATABASE_URL` do `.env`). `DB_SSL`, `DB_POOL_MAX` e `DB_CONNECTION_TIMEOUT_MS` viram `sslmode`/`sslaccept`, `connection_limit` e `connect_timeout`. |
| `server/src/schema.js` | Cada coluna ganhou um tipo (uuid, date, time, timestamp, json, int[]...) para a conversão de valores; as RPCs foram para `routineOps.js`. |
| `server/src/dataApi.js` | Só rotas e tratamento de erro; a lógica foi para `dataOps.js`. |
| `server/src/auth.js` | `prisma.users...`; novo `createAccount` cria usuário e perfil na mesma transação. |
| `server/src/index.js` | `$connect`/`$disconnect` e ping de saúde via Prisma. |
| `server/src/migrate.js` | Roda `prisma migrate deploy`; adota bancos criados pela versão antiga (erro P3005) sem alterar dados. |
| `server/scripts/user.js`, `scripts/migrate.js` | Usam Prisma e `createAccount`. |
| `server/package.json` | Sai `pg`; entram `prisma` e `@prisma/client` (^6.2.0). Novos scripts `generate`, `prisma`, `studio`. |
| `server/Dockerfile` | Instala `openssl` e roda `prisma generate`; não copia mais `migrations/`. |
| `package.json` (raiz) | `setup` gera o client; novo `db:studio`. |
| `docs/CONTEXTO_GERAL.md`, `docs/POSTGRES_PASSO_A_PASSO.md`, `ALTERACOES.md` | Atualizados para o Prisma. |

## Removido

- `server/migrations/` (substituída por `server/prisma/migrations/`).
- Dependência `pg`.

## Decisões de comportamento

- **Upsert:** equivale ao `ON CONFLICT` anterior. Com `ignoreDuplicates` usa `createMany` com `skipDuplicates`. Sem isso, atualiza só linhas do próprio usuário e insere se não existir; conflito com linha de outro dono é ignorado, nunca sobrescrito. Alvo `NULL` nunca atualiza.
- **Dono forçado:** toda operação continua filtrada e preenchida com o usuário do token.
- **E-mails:** o login busca por igualdade exata no e-mail normalizado (minúsculo), pois `register` e `scripts/user.js` já gravam assim.
- **Funções SQL antigas:** `copy_routine_weekday` e `confirm_routine_occurrence` continuam no banco, sem uso. Podem ser removidas por uma migration futura.
- **Concorrência:** a cópia de dia da semana não usa `FOR UPDATE` como antes.
- **SQL literal:** só `GET /api/health` usa `$queryRaw` com `SELECT 1`.
- **Fora do Prisma:** `CHECK`, o índice único em `lower(email)` e as funções PL/pgSQL ficam apenas na migration SQL.

## Como aplicar

1. Extrair o zip por cima do projeto e apagar `server/migrations/`.
2. `npm run setup` (também atualiza o `package-lock.json` do servidor; sem isso o `npm ci` do Docker falha).
3. `npm run db:migrate` ou apenas subir a API.
4. `TEST_API_URL=http://localhost:3001 npm --prefix server test` contra um banco de teste.

## Verificação

- Feito: `node --check` em todos os arquivos; teste de fumaça da lógica contra um stub do Prisma Client; teste da montagem da URL de conexão.
- **Não executado** (sem rede nem PostgreSQL no ambiente): `prisma generate`, migrations, testes de integração e `docker build`.
