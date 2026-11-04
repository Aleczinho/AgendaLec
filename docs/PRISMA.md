# Acesso ao banco com Prisma ORM

Todo SQL da API (`server/`) passa pelo [Prisma ORM](https://github.com/prisma/orm). Não há mais o driver `pg` nem `pool.query`.

## Onde está cada coisa

| Arquivo | Papel |
| --- | --- |
| `server/prisma/schema.prisma` | Models (nomes iguais aos das tabelas/colunas, em snake_case). |
| `server/prisma/migrations/` | Migrations versionadas (`prisma migrate`). A `20261103000000_init` é o esquema anterior (001_schema.sql). |
| `server/src/db.js` | `PrismaClient` único e `withTransaction`. |
| `server/src/config.js` | Monta a `DATABASE_URL` do Prisma a partir de `DB_*` (ou usa a `DATABASE_URL` do `.env`). |
| `server/src/dataOps.js` | Traduz o corpo de `POST /api/db` em chamadas do Prisma Client (`findMany`, `createMany`, `updateMany`...). |
| `server/src/routineOps.js` | `copy_routine_weekday` e `confirm_routine_occurrence`, antes funções PL/pgSQL. |
| `server/src/values.js` | Converte texto ⇄ `Date` (DATE, TIME e timestamptz continuam chegando ao front como texto). |
| `server/src/errors.js` | Traduz erros do Prisma (`P2002`...) para os códigos que o front já conhece (`23505`...). |
| `server/src/migrate.js` | Aplica as migrations (`prisma migrate deploy`) ao iniciar a API. |

O front não muda: o contrato de `/api/db` e `/api/rpc/:nome` é o mesmo.

## Comandos

```sh
npm run setup                                          # instala e gera o Prisma Client
npm run db:migrate                                     # aplica as migrations pendentes
npm run db:studio                                      # interface visual do banco
npm --prefix server run prisma -- migrate status       # qualquer comando do CLI, já com a URL do .env
npm --prefix server run prisma -- migrate dev --name minha_mudanca   # nova migration (desenvolvimento)
```

Depois de mudar o `schema.prisma`, rode `npm --prefix server run generate` para atualizar o client.

## Banco que já existia

Se o banco foi criado pela versão anterior da API (tabelas existem, mas não há `_prisma_migrations`), o primeiro start detecta isso, executa a migration inicial (só tem `IF NOT EXISTS`/`CREATE OR REPLACE`, então não altera nada) e a marca como aplicada. Nenhum dado é mexido. A tabela antiga `schema_migrations` fica sem uso e pode ser apagada.

As funções SQL `copy_routine_weekday` e `confirm_routine_occurrence` continuam no banco, mas a API não as chama mais. Quando quiser, remova-as com uma nova migration.

## O que o Prisma não descreve (fica só na migration SQL)

- `CHECK` das tabelas, o índice único em `lower(email)` e as funções acima. Ao gerar migrations com `migrate dev`, confira o SQL antes de aplicar (`--create-only`).
- Por isso e-mails são sempre gravados em minúsculas (`register` e `scripts/user.js` já normalizam) e a busca no login é por igualdade exata.

## Um SQL literal

`GET /api/health` usa `prisma.$queryRaw\`SELECT 1\`` como ping do banco (sem parâmetros, sem entrada do usuário). Todo o resto usa o Prisma Client.
