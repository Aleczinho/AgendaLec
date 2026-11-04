# AgendaLec — resumo da migração para Better Auth

## Objetivo

O sistema próprio de login, cadastro e gerenciamento de sessão do AgendaLec foi substituído pelo **Better Auth**, mantendo o backend em Node.js/Express, o PostgreSQL, o Prisma e as funcionalidades de calendário, eventos, rotinas e perfis.

A biblioteca foi adicionada na versão fixada `1.7.16` nos manifests do projeto e do servidor.

## 1. Autenticação no backend

- Criado/centralizado o arquivo `server/src/auth.js` para configurar o Better Auth.
- O Better Auth utiliza o adapter Prisma conectado ao PostgreSQL.
- O endpoint do Better Auth foi montado em `/api/auth/*` no Express.
- A configuração do Better Auth é montada antes do `express.json()`, preservando o tratamento da requisição pelo handler da biblioteca.
- Login e cadastro utilizam e-mail e senha.
- As sessões são persistidas na tabela `sessions` e entregues ao navegador por cookies HTTP-only; o frontend não precisa guardar o token de sessão em `localStorage`.
- A duração de sessão configurada é de sete dias, com atualização de sessão após um dia.
- E-mails enviados ao cadastro e ao login são normalizados para minúsculas.
- A criação de um usuário também garante a criação do registro correspondente em `profiles`.
- O adapter Prisma é usado com `advanced.database.joins: false` (ver seção 11).

## 2. Proteção das rotas da API

- Foi implementado o middleware `requireAuth`, que consulta a sessão do Better Auth a partir dos cabeçalhos/cookies da requisição.
- As rotas de dados em `/api/db` e `/api/rpc/*` passam pelo middleware antes de executar operações.
- Sem uma sessão válida, as rotas protegidas retornam HTTP `401`.
- As operações de dados continuam usando o contrato existente do AgendaLec e o Prisma; a mudança de autenticação não substitui a lógica de calendário, eventos ou rotinas.

## 3. Frontend

- Criado `src/lib/auth-client.ts` com `createAuthClient` do Better Auth.
- `AuthProvider` passou a obter o usuário e o estado da sessão pelo hook `useSession` do cliente Better Auth.
- Login, cadastro e logout passaram a chamar `signIn.email`, `signUp.email` e `signOut`.
- As requisições do cliente de autenticação enviam credenciais (`credentials: 'include'`) para permitir o uso dos cookies de sessão.
- O `AuthProvider` continua carregando `display_name` da tabela `profiles` para manter a experiência atual do aplicativo.
- A chave legada `agendalec_session` é removida do `localStorage` durante a inicialização.
- O `ThemeProvider` permanece dentro do contexto de autenticação, pois depende dos dados do usuário.

## 4. Banco de dados e migração das contas existentes

Foi adicionada a migration `server/prisma/migrations/20261104000000_better_auth/migration.sql`.

Ela realiza, em uma transação:

1. Adiciona aos usuários os campos exigidos pela integração (`name`, `email_verified` e `image`, quando ainda não existem).
2. Normaliza os e-mails existentes para letras minúsculas.
3. Preenche o nome a partir do e-mail quando o campo ainda está vazio.
4. Cria os registros de perfil que estiverem faltando.
5. Cria as tabelas `accounts`, `sessions` e `verifications`, além dos índices e relacionamentos necessários.
6. Copia os hashes bcrypt existentes de `users.password_hash` para `accounts.password`, no provedor `credential` do Better Auth.
7. Remove a coluna antiga `users.password_hash` após copiar as credenciais.

**Preservação de dados:** os IDs da tabela `users` não são substituídos. Com isso, os relacionamentos existentes de perfis, calendários, eventos, feriados e rotinas continuam apontando para os mesmos usuários.

**Senhas existentes:** a implementação mantém a verificação bcrypt e migra os hashes atuais. A intenção é permitir que os usuários existentes entrem com as mesmas senhas, sem precisar cadastrar outra conta.

**Sessões antigas:** os tokens JWT anteriores não são migrados para as novas sessões do Better Auth. Depois da atualização, os usuários precisam fazer login novamente.

## 5. Scripts administrativos

O script `server/scripts/user.js` foi adaptado para trabalhar com as tabelas do Better Auth:

- `npm run user:create -- email@exemplo.com` cria um usuário, seu perfil e sua credencial.
- `npm run user:password -- email@exemplo.com` redefine a senha de uma conta existente.
- Quando a senha não é passada como argumento, ela é solicitada no terminal.
- As senhas são armazenadas como hashes bcrypt, nunca em texto puro.
- Ao redefinir a senha, as sessões existentes daquele usuário são revogadas.

## 6. Configuração por variáveis de ambiente

As configurações principais ficam no `.env` da raiz do projeto:

| Variável | Finalidade |
|---|---|
| `BETTER_AUTH_URL` | Origem pública usada pelo navegador para acessar o AgendaLec, sem `/api`. |
| `BETTER_AUTH_SECRET` | Segredo do Better Auth; deve ter pelo menos 32 caracteres. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Origens adicionais autorizadas, separadas por vírgula. |
| `ALLOW_REGISTRATION` | `true` permite novos cadastros; `false` desativa o cadastro público. |
| `DB_AUTO_MIGRATE` | Controla se a API aplica migrations ao iniciar. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Parâmetros da conexão PostgreSQL. |
| `DATABASE_URL` | Alternativa que substitui os parâmetros individuais do banco. |
| `API_PORT` | Porta interna da API; no Compose, a API usa `3001`. |
| `APP_PORT` | Porta publicada pelo serviço web no Docker Compose; padrão `8080`. |
| `VITE_API_URL` | Prefixo da API no frontend; normalmente fica vazio para usar `/api` na mesma origem. |
| `CORS_ORIGIN` | Origem autorizada quando frontend e API ficam em domínios diferentes. |

O servidor valida `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` e a configuração do banco antes de iniciar.

## 7. Docker e comunicação

- O Nginx continua servindo o frontend e encaminhando `/api/` para a API Express.
- Com frontend e API na mesma origem, o navegador acessa a autenticação por `/api/auth/*`, sem exigir configuração de CORS adicional.
- A API recebe as variáveis do `.env` por meio do `env_file` do Docker Compose.
- `BETTER_AUTH_URL` deve corresponder ao endereço que o navegador usa para abrir o site; não deve apontar para o endereço interno do container da API.

## 8. Testes adicionados e validação pendente

Foi adicionado/atualizado `server/test/api.integration.js` para testar:

- cadastro e criação de cookie de sessão;
- consulta da sessão;
- login válido;
- rejeição de senha incorreta;
- rejeição de cadastro duplicado;
- bloqueio das rotas de dados sem sessão;
- acesso às rotas de dados com sessão válida.

Os testes de integração dependem de uma API em execução e de `TEST_API_URL` (e, opcionalmente, `TEST_ORIGIN`). **A migração entregue não foi validada contra um PostgreSQL real neste ambiente**. Antes de produção, execute a instalação, gere o Prisma Client, aplique a migration em um banco de teste e rode os testes.

## 9. Passos recomendados para atualização

1. Faça backup do PostgreSQL.
2. Configure o `.env` com a origem pública correta, um `BETTER_AUTH_SECRET` novo e os dados do banco.
3. Instale/atualize as dependências e gere o Prisma Client:

   ```bash
   npm run setup
   ```

4. Aplique as migrations:

   ```bash
   npm run db:migrate
   ```

   > Sem esta etapa o login falha com `The table public.users does not exist` (erro `P2021`). O comando `npm run user:create` também aplica as migrations pendentes antes de criar o usuário.

5. Inicie a API e o frontend, ou reconstrua os serviços do Docker Compose.
6. Faça login com uma conta existente e confirme o acesso aos calendários, eventos e rotinas.
7. Depois de criar as contas necessárias, configure `ALLOW_REGISTRATION=false` e reinicie a API.

## 10. Limitações e cuidados

- Não foi configurado provedor de e-mail para verificação de endereço ou recuperação de senha por e-mail. A redefinição administrativa continua disponível pelo script `user:password`.
- A migration altera a estrutura da tabela `users` e remove `password_hash`; mantenha um backup antes de aplicá-la.
- Alterar `BETTER_AUTH_SECRET` pode invalidar cookies e exigir novo login.
- Em produção, publique o site atrás de HTTPS e configure `BETTER_AUTH_URL` com a URL `https://` correspondente.
- O comportamento de migração das senhas existentes deve ser confirmado com uma conta real em ambiente de homologação antes da atualização do banco de produção.

## 11. Correções pós-migração

Problemas encontrados ao subir a API pela primeira vez (`npm run dev:api`) e como foram resolvidos.

### 11.1 Erro `Unknown field accountss` no login

- **Sintoma:** `POST /api/auth/sign-in/email` falhava com `PrismaClientValidationError`: `Unknown field "accountss" for select statement on model "users"`.
- **Causa:** em `server/src/auth.js`, a opção `advanced.database.joins` estava como `true`. Com joins ativos, o adapter Prisma do Better Auth monta o `select` da relação um-para-muitos como `${modelName}s`. Como o model já se chama `accounts` (plural), o resultado era `accountss`, relação que não existe em `schema.prisma`.
- **Correção:** `advanced.database.joins` alterado para `false` em `server/src/auth.js`, com comentário explicativo no código. Sem joins, o adapter busca usuário, contas e sessões em consultas separadas.
- **Arquivo alterado:** `server/src/auth.js`.
- **Impacto:** nenhum no schema, nas migrations ou no frontend; não é preciso rodar `prisma generate` de novo.
- **Observação:** se no futuro os joins forem reativados, é preciso garantir que os nomes dos models e das relações sigam o padrão esperado pelo adapter.

### 11.2 Erro `The table public.users does not exist` (P2021)

- **Sintoma:** depois da correção anterior, o login falhava com `P2021`.
- **Causa:** o banco `agendalec` estava vazio; as migrations (`20261103000000_init` e `20261104000000_better_auth`) ainda não tinham sido aplicadas.
- **Solução (sem alteração de código):** executar `npm run db:migrate` na raiz do projeto e reiniciar a API.
- **Primeiro acesso em banco novo:** não há usuários, então é preciso criar um. Duas opções:
  - Terminal: `npm run user:create -- email@exemplo.com` (a senha é pedida no terminal; mínimo de 8 caracteres).
  - Tela de cadastro do app, apenas com `ALLOW_REGISTRATION=true` no `.env` (padrão `false`) e a API reiniciada.
- Em ambos os casos a senha é gravada como hash bcrypt em `accounts.password` (provedor `credential`), compatível com o `auth.js`.

---

**Resultado esperado:** o Better Auth passa a ser responsável pelo cadastro, login, logout e sessões; o AgendaLec continua usando sua API Express, Prisma e PostgreSQL para os dados funcionais da aplicação.
