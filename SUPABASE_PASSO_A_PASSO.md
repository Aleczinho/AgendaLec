# Configuração do Supabase — passo a passo

Este guia descreve o banco que o AgendaLec já espera e como preparar um projeto Supabase. **Não crie as tabelas manualmente pelo Table Editor**: as migrações do repositório já definem o esquema.

## 1. O que será criado

O Supabase Auth gerencia os usuários em `auth.users`; essa tabela é interna do Supabase e não deve ser criada manualmente. As migrações do projeto criam:

| Objeto | Para que serve |
| --- | --- |
| `public.profiles` | Perfil, fuso horário e preferências do usuário. O `id` corresponde a `auth.users.id`. |
| `public.calendars` | Agendas do usuário, como Pessoal, Escola ou Igreja. |
| `public.events` | Compromissos vinculados ao usuário e, opcionalmente, a uma agenda. |
| `public.holiday_dates` | Feriados e datas especiais; pode guardar datas globais (`user_id` nulo) ou particulares. |
| `public.routine_rules` | Regras recorrentes da rotina, com dias, horários, intervalo e período de validade. |
| `public.routine_exceptions` | Alterações, cancelamentos e confirmações de ocorrências de uma regra. |
| `public.user_stats` | View opcional de estatísticas; o aplicativo não depende dela. |

As tabelas de dados pertencem a um usuário por meio de `user_id` (ou `profiles.id`). As rotinas são criadas pela segunda migração, que também adiciona campos necessários a eventos e feriados.

## 2. Crie ou selecione o projeto Supabase

1. Crie um projeto no painel do Supabase ou abra o projeto que será usado.
2. Guarde a URL do projeto e a chave pública (`Publishable key` ou chave `anon` legada).
3. **Não use a `service_role` no aplicativo.** O frontend é público; essa chave privilegiada nunca deve ser colocada em `.env` com prefixo `VITE_`, nem enviada ao navegador.

## 3. Aplique as migrações na ordem

No painel do Supabase, abra **SQL Editor** e execute o conteúdo dos arquivos, nesta ordem:

1. `supabase/migrations/20240101000001_initial_schema.sql`
2. `supabase/migrations/20261027000001_routine_rules.sql`
3. `supabase/migrations/20261027000002_authenticated_access.sql`
4. `supabase/migrations/20261027000003_holiday_id_default.sql`
5. `supabase/migrations/20261027000004_fix_holiday_id_foreign_key.sql`
6. `supabase/migrations/20261027000005_events_id_default.sql`
7. `supabase/migrations/20261027000006_fix_events_id_foreign_key.sql`

Execute cada arquivo uma única vez em um banco novo. A primeira migração não é totalmente repetível, pois cria políticas RLS sem removê-las antes. Se o banco já tiver tabelas ou migrações aplicadas, confira o estado antes de executar qualquer arquivo; não reaplique a migração inicial por cima de um banco existente.

Ao terminar, abra **Table Editor** e confirme que existem as seis tabelas listadas acima. `user_stats` aparece como view, não como tabela.

## 4. Ajuste permissões e leitura de feriados globais

A migração `20261027000002_authenticated_access.sql` configura as permissões para usuários autenticados, remove o acesso público às tabelas pessoais e permite ler feriados globais (`user_id` nulo). As regras de inserção, atualização e exclusão de feriados continuam restritas aos registros do próprio usuário. Mantenha **RLS habilitado** em todas as tabelas; permissões SQL não substituem as políticas RLS.

Esta migração corrige também as permissões de `profiles` e `calendars`, usadas pelo aplicativo além de eventos e rotinas. Se o banco já estiver em uso, aplique-a sem reaplicar as migrações anteriores.

A migração `20261027000003_holiday_id_default.sql` garante que o banco gere o UUID de feriados automaticamente, inclusive quando a tabela já existia antes das migrações.

A migração `20261027000004_fix_holiday_id_foreign_key.sql` remove a chave estrangeira incorreta de `holiday_dates.id`, se existir. Esse campo identifica o feriado e não deve apontar para `auth.users` ou outra tabela.

A migração `20261027000005_events_id_default.sql` configura a geração automática de UUID em `events.id`, inclusive em tabelas que já existiam. O aplicativo também envia um UUID ao criar o compromisso para funcionar em bancos legados antes da aplicação dessa migração.

A migração `20261027000006_fix_events_id_foreign_key.sql` remove a chave estrangeira incorreta `events_id_fkey`, caso exista, e reafirma o UUID automático em `events.id`. O identificador do compromisso não deve referenciar outra tabela.

## 5. Configure a autenticação

1. No painel, abra **Authentication → Providers** e habilite Email.
2. Em **Authentication → URL Configuration**, configure a URL local de desenvolvimento (`http://localhost:5173`) e a URL de produção quando houver.
3. Se a confirmação de e-mail estiver habilitada, confirme o endereço antes de tentar entrar. Caso contrário, o login pode parecer não funcionar enquanto a conta aguarda confirmação.

## 6. Configure o frontend

Na raiz do projeto, crie ou atualize `.env` com:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

Também é aceito `VITE_SUPABASE_ANON_KEY` no lugar de `VITE_SUPABASE_PUBLISHABLE_KEY`. Use apenas uma chave pública. Não compartilhe o `.env` nem publique valores reais em documentação, capturas de tela ou commits. Depois de alterar o arquivo, reinicie o servidor Vite.

## 7. Faça um teste ponta a ponta

1. Inicie o projeto com `npm run dev`.
2. Crie uma conta pela tela de login e, se solicitado, confirme o e-mail.
3. Entre na conta e crie uma agenda.
4. Crie, edite e exclua um compromisso; recarregue a página e confira a persistência.
5. Abra Rotina, crie ou edite uma regra e confira a exceção/ocorrência correspondente.
6. Abra o Calendário e confira os feriados de novembro de 2026 inseridos automaticamente na primeira carga. Registros globais podem ter `user_id` nulo; datas particulares usam o ID do usuário.
7. Crie uma segunda conta e confirme que ela não consegue consultar ou alterar os dados da primeira.

Se uma operação falhar, confira o erro no console do navegador e no **Logs** do Supabase. Erros informando que `routine_rules` ou `routine_exceptions` não existem geralmente indicam que a segunda migração não foi aplicada. Erros de permissão normalmente apontam para privilégios ou políticas RLS.

## 8. Antes de publicar

- Configure a URL real do site nas configurações de autenticação.
- Confirme que nenhuma chave `service_role` está no frontend.
- Verifique RLS e permissões usando duas contas diferentes.
- Não habilite acesso à view `user_stats` sem restringi-la aos dados do usuário autenticado.
- Faça backup antes de aplicar novas migrações em um banco com dados reais.
