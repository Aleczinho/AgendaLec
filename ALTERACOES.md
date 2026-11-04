# Migração do AgendaLec: Supabase → PostgreSQL

## Por que mudou a arquitetura

O front chamava o Supabase direto do navegador. Um PostgreSQL puro não aceita conexão do navegador (e expor a senha do banco no front seria inseguro), então foi criada uma **API Node** que conecta no banco usando o `.env`.

```
Navegador ──► site (nginx / Vite) ──/api──► API Node (server/) ──► PostgreSQL (seu servidor)
```

## Novo: `server/` (API)

- Express + `pg` + `bcryptjs` + `jsonwebtoken`.
- `src/config.js`: lê o `.env` da raiz (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`, ou `DATABASE_URL`; `JWT_SECRET`, `ALLOW_REGISTRATION`, etc.).
- `src/migrate.js` + `migrations/001_schema.sql`: criam as tabelas ao iniciar (controle em `schema_migrations`). O banco em si precisa existir antes.
- `src/auth.js`: `/api/auth/register`, `/login`, `/me`. Senha com bcrypt, login com JWT, limite de tentativas (429), senha mínima de 8 caracteres.
- `src/dataApi.js` + `src/schema.js`: `/api/db` (select/insert/update/delete/upsert) e `/api/rpc/:nome`. Tabelas e colunas só entram por lista fixa, valores vão como parâmetros SQL, e o usuário do token é injetado em toda operação (substitui o RLS).
- `scripts/user.js`: `npm run user:create` e `npm run user:password` (substitui a recuperação de senha por e-mail).
- `test/api.integration.js`: 9 testes (autenticação, isolamento entre usuários, filtros, upsert, RPCs, entradas maliciosas).
- `Dockerfile` da API.

## Banco de dados

- Nova tabela `users` (substitui `auth.users`); `profiles`, `calendars`, `events`, `holiday_dates`, `routine_rules` e `routine_exceptions` apontam para ela.
- RLS e grants do Supabase removidos; isolamento feito pela API.
- Funções `copy_routine_weekday` e `confirm_routine_occurrence` agora recebem o id do usuário (`p_user_id`) em vez de `auth.uid()`.
- View `user_stats` removida (não era usada).
- Pasta `supabase/` removida.

## Front-end

- Novo `src/lib/api.ts`: cliente da API com a mesma interface de consultas de antes (`db.from().select().eq()...`, `db.rpc`) e `auth` (sessão JWT em `localStorage`). Teste em `src/lib/api.test.ts`.
- Removido `src/lib/supabase.ts` e a dependência `@supabase/supabase-js`.
- `AuthProvider`, `ThemeProvider`, `CalendarProvider`, `SettingsPage`, `backupService`, `routineService`: trocados para `db`/`auth`.
- `LoginPage`: removido "Esqueci minha senha" (não há e-mail); mensagens sem referência ao Supabase; senha mínima de 8 no cadastro.
- `errors.ts` (+ teste): código de tabela ausente passou de `PGRST205` para `42P01`.
- `vite.config.mts`: proxy de `/api` para a API em desenvolvimento (`API_PORT` ou `DEV_API_URL`).
- `package.json`: novos scripts `setup`, `dev:api`, `typecheck`, `db:migrate`, `user:create`, `user:password`.

## Docker e configuração

- `.env.example` (modelo) na raiz; `.gitignore` e `.dockerignore` criados.
- `docker/compose.yaml`: dois serviços, `api` e `agendalec` (nginx); lê o `.env` da raiz; `host.docker.internal` mapeado.
- `docker/nginx.conf`: repassa `/api/` para a API.
- `docker/Dockerfile`: sem variáveis do Supabase (`VITE_API_URL` opcional).

## Documentação

- Novo `docs/POSTGRES_PASSO_A_PASSO.md` (substitui `SUPABASE_PASSO_A_PASSO.md`).
- Atualizados `docs/README.md`, `docs/CONTEXTO_GERAL.md` e `docs/docker/README.md`. Os arquivos em `docs/historico/` foram mantidos como estavam.

## Verificações feitas

- API contra PostgreSQL 16 real: 9/9 testes de integração.
- Cliente do front contra a API real e com `fetch` simulado: passou.
- `tsc --noEmit` sem erros; Vitest 42/42; `vite build` sem referências ao Supabase no bundle.
- Não testado: `docker build` (sem daemon Docker no ambiente de teste).

## Como usar

1. Criar o banco no PostgreSQL (`CREATE DATABASE agendalec;`).
2. `cp .env.example .env` e preencher.
3. `npm run setup`, depois `npm run dev:api` e `npm run dev`.
4. Docker: `docker compose --env-file .env -f docker/compose.yaml up -d --build`.

## Atenção

- O banco precisa existir antes; a API cria só as tabelas.
- Dados antigos: exportar em Configurações → Backup completo e importar no sistema novo.
- Sem e-mail, a senha é redefinida por comando no servidor.
- Cadastro fechado por padrão (`ALLOW_REGISTRATION=false`).
