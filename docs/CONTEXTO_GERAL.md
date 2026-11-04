# Contexto geral do AgendaLec

Este documento explica o funcionamento atual do repositório para uma IA ou pessoa que vai dar manutenção. Ele foi escrito a partir do código e das migrações presentes no projeto.

## O que é

AgendaLec é uma aplicação web de agenda pessoal. Usuários autenticados consultam calendário mensal, semanal ou diário, criam e atualizam compromissos, acompanham uma rotina recorrente, veem feriados e ajustam preferências. A interface está em português e os dados do usuário são persistidos em um PostgreSQL próprio, acessado por uma API Node (`server/`).

## Tecnologias e execução

- React 19, TypeScript e Vite 8; navegação com React Router.
- API Node (Express + Prisma ORM) em `server/`, com login próprio (bcrypt + JWT) e acesso ao PostgreSQL. Todo acesso ao banco passa pelo Prisma Client (veja `PRISMA.md`).
- `date-fns` para cálculos de datas; Vitest para testes já existentes.
- `npm run dev`: site local (Vite porta 5173, com proxy de `/api` para a API); `npm run dev:api`: API (porta 3001).
- `npm run build`: build de produção em `dist/`.
- `npm test`: executa a suíte existente (`vitest run`).

Configure o `.env` na raiz (modelo em `.env.example`): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (ou `DATABASE_URL`), `JWT_SECRET` etc. Ele é lido só pela API; as credenciais do banco nunca chegam ao navegador. Variáveis `VITE_*` vão para o navegador (só `VITE_API_URL`, opcional). Passo a passo em `POSTGRES_PASSO_A_PASSO.md`.

## Inicialização e navegação

`src/main.tsx` monta a aplicação; `src/App.tsx` compõe os provedores de tema, autenticação e calendário e define as rotas. As páginas são carregadas sob demanda.

| Caminho | Acesso e finalidade |
| --- | --- |
| `/login`, `/register` | Público; login e cadastro em `LoginPage` (cadastro controlado por `ALLOW_REGISTRATION`; senha é redefinida por comando no servidor). |
| `/calendar` | Autenticado; calendário principal. |
| `/overview` | Autenticado; painel/resumo. |
| `/routine` | Autenticado; regras e ocorrências da rotina. |
| `/settings` | Autenticado; preferências da conta. |
| `/` | Redireciona ao calendário. |

`AuthProvider` restaura a sessão guardada (token JWT em `localStorage`), confirma-a com `/api/auth/me`, escuta mudanças de autenticação e carrega o nome do perfil. `UserLayout` protege a área autenticada; `AuthLayout` envolve as telas públicas. Rotas antigas `/agenda/:date?` e `/calendars` redirecionam para `/calendar`.

## Estado e fluxos de dados

`CalendarProvider` (`src/app/providers/CalendarProvider.tsx`) centraliza mês/ano/dia selecionados, visualização, formato de hora, início da semana, eventos, feriados, regras e exceções. Ao autenticar, carrega preferências do perfil e em seguida eventos, feriados e regras do período; ao sair, limpa os dados em memória.

As operações de calendário usam `db` de `src/lib/api.ts`, que oferece o mesmo estilo de consulta de antes (`from().select().eq()...`) mas envia a consulta para `POST /api/db`. A consulta de eventos busca compromissos que intersectam o período exibido. Criar, editar e remover atualiza o banco e o estado local. As páginas e componentes de `src/pages/`, `src/components/calendar/`, `src/components/events/` e `src/components/dashboard/` consomem o estado com `useCalendar`.

Rotinas têm lógica de domínio em `src/lib/routines.ts`, `src/lib/routineSeed.ts` e `src/services/routineService.ts`. Uma regra descreve dias da semana, validade, horários fixos/flexíveis/opcionais e intervalo em semanas. `routine_exceptions` guarda mudanças ou estados pontuais por data. A tabela de exceções tem unicidade por regra e data. Cópia de dia da semana e confirmação de ocorrência (`copy_routine_weekday`, `confirm_routine_occurrence`) são implementadas em `server/src/routineOps.js` com o Prisma Client e chamadas por `db.rpc` via `/api/rpc/:nome`; o id do usuário vem do token, nunca do cliente.

Na primeira carga de dados do usuário, o serviço pode inicializar feriados e regras de exemplo com chaves estáveis, evitando duplicação via `upsert`. O período inicial usado como fallback é novembro de 2026; mês, ano e dia de referência são gravados em `profiles.preferences`.

## Banco de dados

O esquema é descrito em `server/prisma/schema.prisma`; as migrações versionadas ficam em `server/prisma/migrations/` e são aplicadas automaticamente pela API ao iniciar (`prisma migrate deploy`, histórico na tabela `_prisma_migrations`).

| Tabela/objeto | Papel |
| --- | --- |
| `users` | Contas (e-mail e hash bcrypt da senha); só a API acessa. |
| `profiles` | Perfil, fuso e preferências JSONB; `id` corresponde a `users.id`. |
| `calendars` | Agendas do usuário, com nome, cor e estado ativo. |
| `events` | Compromissos, horários, categoria, estado, certeza e agenda opcional. |
| `holiday_dates` | Feriados globais ou particulares, com metadados e chave de seed. |
| `routine_rules` | Regras recorrentes e janelas de horário. |
| `routine_exceptions` | Exceção/estado de ocorrência ligado à regra e ao proprietário. |

Não há RLS: o isolamento por usuário é feito pela API (`server/src/dataOps.js`, exposta por `dataApi.js`), que injeta o usuário do token em toda consulta, insert, update, delete e upsert feitos com o Prisma Client, e só aceita as tabelas/colunas listadas em `server/src/schema.js`. Feriados com `user_id` nulo são globais (somente leitura). Ao criar uma tabela, declare o model em `schema.prisma`, crie a migração e registre-a em `schema.js`.

## Organização do código

- `src/app/providers/`: estados compartilhados de autenticação, calendário e tema.
- `src/app/layouts/`: layouts autenticado e público.
- `src/pages/`: telas associadas às rotas.
- `src/components/`: componentes de interface agrupados por domínio.
- `src/lib/`: cliente da API (`api.ts`), datas, validação, rotinas e utilitários puros.
- `src/services/`: operações de domínio que coordenam o banco e dados iniciais.
- `src/styles/`: tokens, estilos globais, componentes e responsividade.
- `server/`: API Node (login, rotas `/api/db` e `/api/rpc`), `prisma/` (schema e migrações do banco) e scripts de usuário.
- `docker/`: Dockerfile do site, Compose (site + API) e configuração do Nginx.

O alias `@/` aponta para `src/` (configurado em `vite.config.mts` e TypeScript). Preserve essa convenção nos imports.

## Orientações para mudanças

1. Leia a página, o provider/serviço e a migração relacionada antes de mudar comportamento persistido.
2. Mantenha dados isolados por usuário na API (`dataOps.js`/`schema.js`). O filtro no cliente não substitui o da API.
3. Ao mudar o esquema, edite `schema.prisma` e gere uma nova migração (`npm --prefix server run prisma -- migrate dev --name descricao`); não reescreva migrações já aplicadas em ambientes compartilhados.
4. Trate datas com as funções de `src/lib/` e mantenha coerência entre data local, fuso do usuário e timestamps ISO. Evite parsing manual de datas em telas.
5. Preserve validações, acessibilidade e layout responsivo dos componentes existentes.
6. Não assuma que documentos em `historico/` descrevem o sistema atual; confirme no código.
7. Ao terminar uma mudança, descreva arquivos afetados e verificações feitas. Execute testes/build quando fizer sentido ou quando solicitado.

## Pontos de atenção conhecidos na documentação

O antigo `AgendaLec/README.md` descreve pastas e funcionalidades que não existem na estrutura atual. Os resumos em `historico/` foram escritos em momentos diferentes e podem conter planos ou afirmações já superadas. Use este contexto como mapa inicial, mas confirme detalhes no código-fonte.
