# Configuração do PostgreSQL

O AgendaLec usa o **seu PostgreSQL** (versão 13 ou superior). O navegador não fala direto com o banco: ele conversa com a **API** (pasta `server/`), e só a API conhece a senha do banco. Toda a configuração fica em **um arquivo `.env` na raiz do projeto**.

```
Navegador ──► site (nginx / Vite) ──/api──► API Node (server/) ──► PostgreSQL (seu servidor)
```

## 1. Preparar o banco (uma vez)

No servidor PostgreSQL, como superusuário (`psql -U postgres`):

```sql
CREATE USER agendalec WITH PASSWORD 'uma-senha-forte';
CREATE DATABASE agendalec OWNER agendalec;
```

O usuário precisa ser dono do banco (ou ter permissão de criar tabelas nele), porque a API cria o esquema sozinha.

Se a API roda em outra máquina, o PostgreSQL precisa aceitar conexões de lá:

- `postgresql.conf`: `listen_addresses = '*'` (ou o IP do servidor);
- `pg_hba.conf`: `host  agendalec  agendalec  IP_DA_API/32  scram-sha-256`;
- libere a porta 5432 no firewall **somente** para a máquina da API.

## 2. Configurar o `.env`

```sh
cp .env.example .env
```

Edite o `.env`:

| Variável | Para quê |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexão com o PostgreSQL. |
| `DATABASE_URL` | Alternativa: URL única (`postgresql://user:senha@host:5432/banco`). Tem prioridade sobre as variáveis acima. Codifique caracteres especiais da senha (`@` → `%40`). |
| `DB_SSL` | `false`, `true` (valida o certificado) ou `no-verify` (TLS com certificado autoassinado). |
| `DB_AUTO_MIGRATE` | `true`: a API cria/atualiza as tabelas ao iniciar. |
| `JWT_SECRET` | Segredo que assina os logins (mín. 32 caracteres): `openssl rand -hex 48`. **Obrigatório.** |
| `JWT_EXPIRES_IN` | Validade do login (`7d`, `12h`...). |
| `ALLOW_REGISTRATION` | `true` libera a tela de cadastro; `false` bloqueia novas contas. |
| `API_PORT` | Porta da API (padrão 3001). |
| `APP_PORT` | Porta do site no Docker (padrão 8080). |

Se o PostgreSQL roda **na mesma máquina do Docker**, use `DB_HOST=host.docker.internal` (o Compose já mapeia esse nome) e confira que o `pg_hba.conf` aceita a rede do Docker.

## 3. Rodar

### Em desenvolvimento

```sh
npm run setup        # instala dependências do site e da API
npm run dev:api      # terminal 1: API em http://localhost:3001
npm run dev          # terminal 2: site em http://localhost:5173 (o Vite encaminha /api para a API)
```

### Em produção (Docker)

```sh
docker compose --env-file .env -f docker/compose.yaml up -d --build
```

Acesse `http://IP-DO-SERVIDOR:8080`. O nginx do container serve o site e repassa `/api` para a API. Detalhes em [docker/README.md](docker/README.md).

Ao iniciar, a API conecta, aplica as migrations de `server/migrations/` (registradas na tabela `schema_migrations`) e passa a atender. Se algo estiver errado (senha, host, `JWT_SECRET` ausente), ela mostra o motivo no log e encerra.

## 4. Contas de usuário

O login é próprio (e-mail + senha, com hash bcrypt na tabela `users`). Não há envio de e-mail, então não existe "esqueci minha senha" por e-mail; use os comandos abaixo no servidor (na raiz do projeto, com o `.env` configurado):

```sh
npm run user:create   -- voce@exemplo.com          # pede a senha no terminal
npm run user:password -- voce@exemplo.com          # redefine a senha
```

Fluxo sugerido: deixe `ALLOW_REGISTRATION=true`, crie sua conta pela tela de cadastro (ou com `user:create`) e depois mude para `false` e reinicie a API.

Senhas têm no mínimo 8 caracteres. Após 10 tentativas de login erradas em 15 minutos (mesmo IP + e-mail), a API responde 429 por um tempo.

## 5. Trazer os dados do Supabase

1. No sistema antigo: **Configurações → Backup completo** e baixe o arquivo JSON.
2. No novo: crie/entre na conta e use **Configurações → Importar backup** (a importação reatribui tudo ao usuário atual).

## 6. Segurança e isolamento

O Supabase isolava usuários por RLS. Aqui o isolamento é feito pela **API**: toda consulta é filtrada pelo usuário do token (`server/src/dataApi.js`); tabelas e colunas aceitas ficam numa lista fixa (`server/src/schema.js`) e os valores sempre vão como parâmetros SQL. Feriados com `user_id NULL` são globais e legíveis por todos.

- Use HTTPS na frente do site (proxy reverso) se for acessar pela internet: o token de login trafega em cada requisição.
- Nunca publique o `.env` (ele está no `.gitignore`).
- Trocar `JWT_SECRET` desconecta todos os usuários.

## 7. Mudar o esquema

Crie um novo arquivo numerado em `server/migrations/` (ex.: `002_minha_mudanca.sql`); ele roda uma vez, na ordem, no próximo início da API (ou com `npm run db:migrate`). Não edite migrations já aplicadas. Se criar uma tabela nova, registre-a também em `server/src/schema.js` para o front poder usá-la.

## 8. Testes

```sh
npm test                                   # testes do front (vitest)
# Testes de integração da API: use um banco DE TESTE
TEST_API_URL=http://localhost:3001 npm --prefix server test
TEST_API_URL=http://localhost:3001 npx vitest run src/lib/api.test.ts
```
