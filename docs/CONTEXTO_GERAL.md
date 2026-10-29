# Contexto geral do AgendaLec

Este documento explica o funcionamento atual do repositório para uma IA ou pessoa que vai dar manutenção. Ele foi escrito a partir do código e das migrações presentes no projeto.

## O que é

AgendaLec é uma aplicação web de agenda pessoal. Usuários autenticados consultam calendário mensal, semanal ou diário, criam e atualizam compromissos, acompanham uma rotina recorrente, veem feriados e ajustam preferências. A interface está em português e os dados do usuário são persistidos no Supabase.

## Tecnologias e execução

- React 19, TypeScript e Vite 8; navegação com React Router.
- Supabase JS para autenticação e acesso ao PostgreSQL.
- `date-fns` para cálculos de datas; Vitest para testes já existentes.
- `npm run dev`: servidor local (Vite porta 5173).
- `npm run build`: build de produção em `dist/`.
- `npm test`: executa a suíte existente (`vitest run`).

Configure na raiz `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`). Variáveis `VITE_*` vão para o navegador: nunca use nelas a chave `service_role`.

## Inicialização e navegação

`src/main.tsx` monta a aplicação; `src/App.tsx` compõe os provedores de tema, autenticação e calendário e define as rotas. As páginas são carregadas sob demanda.

| Caminho | Acesso e finalidade |
| --- | --- |
| `/login`, `/register` | Público; login, cadastro e recuperação de senha em `LoginPage`. |
| `/calendar` | Autenticado; calendário principal. |
| `/overview` | Autenticado; painel/resumo. |
| `/routine` | Autenticado; regras e ocorrências da rotina. |
| `/settings` | Autenticado; preferências da conta. |
| `/` | Redireciona ao calendário. |

`AuthProvider` restaura a sessão do Supabase, escuta mudanças de autenticação e carrega o nome do perfil. `UserLayout` protege a área autenticada; `AuthLayout` envolve as telas públicas. Rotas antigas `/agenda/:date?` e `/calendars` redirecionam para `/calendar`.

## Estado e fluxos de dados

`CalendarProvider` (`src/app/providers/CalendarProvider.tsx`) centraliza mês/ano/dia selecionados, visualização, formato de hora, início da semana, eventos, feriados, regras e exceções. Ao autenticar, carrega preferências do perfil e em seguida eventos, feriados e regras do período; ao sair, limpa os dados em memória.

As operações de calendário usam o cliente singleton `src/lib/supabase.ts`. A consulta de eventos restringe `user_id` ao usuário atual e busca compromissos que intersectam o período exibido. Criar, editar e remover atualiza o Supabase e o estado local. As páginas e componentes de `src/pages/`, `src/components/calendar/`, `src/components/events/` e `src/components/dashboard/` consomem o estado com `useCalendar`.

Rotinas têm lógica de domínio em `src/lib/routines.ts`, `src/lib/routineSeed.ts` e `src/services/routineService.ts`. Uma regra descreve dias da semana, validade, horários fixos/flexíveis/opcionais e intervalo em semanas. `routine_exceptions` guarda mudanças ou estados pontuais por data. A tabela de exceções tem unicidade por regra e data. Cópia de dia da semana e confirmação de ocorrência usam funções SQL com `SECURITY INVOKER` definidas pela migração de rotina.

Na primeira carga de dados do usuário, o serviço pode inicializar feriados e regras de exemplo com chaves estáveis, evitando duplicação via `upsert`. O período inicial usado como fallback é novembro de 2026; mês, ano e dia de referência são gravados em `profiles.preferences`.

## Banco de dados

As migrações versionadas em `supabase/migrations/` definem o esquema. Aplique-as em ordem num projeto novo; o passo a passo contém a lista e os cuidados para bancos existentes.

| Tabela/objeto | Papel |
| --- | --- |
| `profiles` | Perfil, fuso e preferências JSONB; `id` corresponde a `auth.users.id`. |
| `calendars` | Agendas do usuário, com nome, cor e estado ativo. |
| `events` | Compromissos, horários, categoria, estado, certeza e agenda opcional. |
| `holiday_dates` | Feriados globais ou particulares, com metadados e chave de seed. |
| `routine_rules` | Regras recorrentes e janelas de horário. |
| `routine_exceptions` | Exceção/estado de ocorrência ligado à regra e ao proprietário. |
| `user_stats` | View definida na migração inicial; não é necessária para o fluxo principal. |

As tabelas pessoais habilitam RLS. Políticas e permissões devem limitar leitura e escrita ao usuário autenticado; a migração de acesso autenticado ajusta grants e leitura de feriados globais. Não desabilite RLS para contornar erro de permissão. Revise cada migração antes de aplicá-la a um banco com dados.

## Organização do código

- `src/app/providers/`: estados compartilhados de autenticação, calendário e tema.
- `src/app/layouts/`: layouts autenticado e público.
- `src/pages/`: telas associadas às rotas.
- `src/components/`: componentes de interface agrupados por domínio.
- `src/lib/`: cliente Supabase, datas, validação, rotinas e utilitários puros.
- `src/services/`: operações de domínio que coordenam Supabase e dados iniciais.
- `src/styles/`: tokens, estilos globais, componentes e responsividade.
- `supabase/migrations/`: esquema, RLS, grants e funções do banco.
- `docker/`: Dockerfile, Compose e configuração do Nginx para publicação.

O alias `@/` aponta para `src/` (configurado em `vite.config.mts` e TypeScript). Preserve essa convenção nos imports.

## Orientações para mudanças

1. Leia a página, o provider/serviço e a migração relacionada antes de mudar comportamento persistido.
2. Mantenha dados isolados por usuário tanto nas consultas quanto nas políticas RLS. O filtro no cliente não substitui RLS.
3. Ao mudar o esquema, crie uma nova migração numerada; não reescreva migrações já aplicadas em ambientes compartilhados.
4. Trate datas com as funções de `src/lib/` e mantenha coerência entre data local, fuso do usuário e timestamps ISO. Evite parsing manual de datas em telas.
5. Preserve validações, acessibilidade e layout responsivo dos componentes existentes.
6. Não assuma que documentos em `historico/` descrevem o sistema atual; confirme no código.
7. Ao terminar uma mudança, descreva arquivos afetados e verificações feitas. Execute testes/build quando fizer sentido ou quando solicitado.

## Pontos de atenção conhecidos na documentação

O antigo `AgendaLec/README.md` descreve pastas e funcionalidades que não existem na estrutura atual. Os resumos em `historico/` foram escritos em momentos diferentes e podem conter planos ou afirmações já superadas. Use este contexto como mapa inicial, mas confirme detalhes no código-fonte.
