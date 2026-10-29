# Checagem geral e correções — AgendaLec

## Resumo

A auditoria encontrou falhas que impediam o uso normal do app mesmo quando o build de produção terminava com sucesso. O Vite estava apenas transpilando o código; o TypeScript não tinha o alias `@/` configurado e a compilação não verificava corretamente todas as telas. Também havia rotas e operações de autenticação ainda simuladas, além de páginas de calendário que exibiam dados fixos em vez de consultar o Supabase.

Os erros de compilação e os principais fluxos de autenticação, calendário, agenda, preferências e agendas foram corrigidos. O arquivo `.env` foi preservado; seus valores não foram exibidos nem incluídos neste relatório.

## Problemas identificados e resolvidos

### Inicialização e navegação

- `App` chamava `useAuth()` antes de o `AuthProvider` envolver a tela, causando erro em runtime. Os providers agora envolvem as rotas, e as rotas públicas e protegidas aguardam a restauração da sessão.
- O conteúdo do app não estava ligado às páginas por um sistema de rotas funcional. Agora existem destinos para login, cadastro, calendário, agenda, agendas e configurações, com redirecionamentos para usuários autenticados ou anônimos.
- O login/logout e a criação de conta tinham trechos simulados. Os formulários usam o Supabase, exibem erros e tratam a confirmação de e-mail e o envio de redefinição de senha.
- O carregamento de perfil foi separado do callback de autenticação para evitar operações assíncronas dentro do listener do Supabase.
- As telas agora são carregadas sob demanda, reduzindo o JavaScript inicial.

### TypeScript e compilação

- `tsconfig.json` não resolvia `@/` e não cobria adequadamente os fontes. O alias foi alinhado ao Vite e a checagem agora inclui `src`.
- Foram corrigidos erros de sintaxe e de tipos em `Card`, `Button`, `Input`, `Select`, páginas, calendário semanal e formulário de eventos.
- Foi removida a importação inexistente `createRoute`/`parentRoute` de `@react-router/dev`. O pacote também era incompatível com a versão instalada do React Router e não era necessário para as rotas declarativas usadas pelo app.
- `vite.config.ts` usava sintaxe ESM com o projeto marcado como CommonJS e gerava aviso. A configuração foi movida para `vite.config.mts` e o aviso deixou de aparecer.
- O caminho de favicon continha o placeholder `/YOUR_PATH/favicon.ico`, sem arquivo correspondente; a referência inválida foi removida.

### Calendário, eventos e agendas

- O provider de calendário consultava feriados pela coluna `year`, que não existe no esquema; a consulta agora usa intervalos sobre a coluna `date`.
- Eventos e feriados agora são filtrados pelo período, incluindo compromissos que atravessam o limite do mês.
- As telas de calendário e agenda deixaram de usar eventos demonstrativos e passaram a usar dados carregados do Supabase.
- Criar, editar, excluir e concluir eventos agora chamam operações reais. Erros de gravação e carregamento são expostos à interface.
- A criação/edição de agendas passou a usar a tabela `calendars`, com atualização de estado, cor, descrição e remoção, em vez de alterar apenas dados locais fictícios.
- As preferências passaram a ser carregadas e salvas no perfil; a atualização combina os campos existentes de `preferences`, evitando apagar configurações não relacionadas.
- Corrigidos bugs de renderização do calendário: índice de chave inexistente, dias/feriados de meses errados, cabeçalho repetido e filtro semanal inconsistente.
- A conversão de datas de `<input type="date">` foi ajustada para não deslocar o dia selecionado ao combinar a data com um horário local.
- A migração existente já usa IDs independentes gerados por `gen_random_uuid()` para calendários e eventos; nenhuma migração adicional foi necessária.

### Refatoração visual e calendário responsivo

- A causa do calendário comprimido/vertical não era apenas um breakpoint: os componentes dependiam de classes utilitárias que não eram geradas pelo projeto, havia dimensões fixas nas células e o cabeçalho mensal tinha oito dias. A tela agora usa uma grade de sete colunas com células fluidas e cabeçalho correto.
- A grade mensal gera semanas completas de cinco ou seis linhas, mostra datas adjacentes, destaca hoje e o dia selecionado, indica feriados e exibe compromissos com limite visual e ação para abrir a lista diária.
- As visualizações semanal e diária agora selecionam uma data, permitem criar compromissos nos dias corretos e mostram compromissos persistidos; os controles de navegação mudam o período conforme a visualização.
- O filtro de agenda está ligado aos dados reais. A preferência de início da semana (domingo/segunda-feira) é aplicada ao calendário mensal e semanal.
- O shell autenticado recebeu navegação lateral com estado ativo, ícones e menu móvel. O formulário de evento passou a ser um diálogo responsivo com fechamento por `Escape`/clique externo, validação visível e campos reorganizados para telas estreitas.
- Foram renovados os tokens claro/escuro e os estilos globais/componentes; o tamanho raiz e as importações CSS duplicadas foram corrigidos. A tela de autenticação também recebeu layout próprio desktop/mobile, depois de a inspeção visual mostrar que as classes utilitárias antigas não estavam aplicando largura ou espaçamento.
- Foi ampliada a consulta de eventos para incluir os dias adjacentes necessários às semanas que cruzam o limite do mês. O carregamento de calendário agora sinaliza progresso e falhas na interface.
- Foram adicionados testes para geração de grade mensal, semana iniciada na segunda-feira, limites de ano e comparação de datas locais.
- Em uma conferência posterior no simulador móvel, a tela vazia foi causada pelo servidor Vite local parado (`ERR_CONNECTION_REFUSED`), não pela conta. Após reiniciar o servidor, a sessão Supabase existente foi restaurada e o calendário carregou sem overflow horizontal. Para contas novas, a interface informa que ainda não existem compromissos e oferece a ação para criar o primeiro.

### Configuração e testes

- O cliente Supabase aceita `VITE_SUPABASE_ANON_KEY` ou `VITE_SUPABASE_PUBLISHABLE_KEY` e informa explicitamente quando a URL/chave não estão configuradas.
- O script `npm test` já apontava para Vitest, mas o executável não estava instalado. Vitest foi adicionado às dependências de desenvolvimento e foram criados testes para a composição de classes e conversão de data/hora.

## Diagnóstico adicional: TypeScript e acesso Supabase

- O `tsconfig.json` atual passou em `npx tsc --noEmit --pretty false`, incluindo os aliases `@/*` e os arquivos em `src`. Não foi reproduzido erro de TypeScript no projeto. A configuração mantém `paths` relativo (`./src/*`) sem `baseUrl`, compatível com as versões recentes do TypeScript. Se o editor continuar mostrando um diagnóstico após a validação, reinicie o servidor TypeScript do VS Code e compare a mensagem exata com o resultado do comando.
- O endpoint `/auth/v1/settings` do projeto configurado respondeu `401 Invalid API key` com `VITE_SUPABASE_ANON_KEY`, mas respondeu `200` com `VITE_SUPABASE_PUBLISHABLE_KEY`. O app priorizava a primeira variável e, por isso, enviava uma chave inválida ao autenticar ou cadastrar usuários.
- A inicialização agora prioriza `VITE_SUPABASE_PUBLISHABLE_KEY` e mantém a chave anon como alternativa. A tela de autenticação também apresenta instrução específica quando o serviço responder `Invalid API key`.
- O `.env` não foi editado nem seus valores foram incluídos neste relatório. Após reiniciar o Vite, login/cadastro devem usar a chave publishable que já foi validada no endpoint. O teste não cria uma conta nem valida credenciais de usuário.
- Uma captura posterior mostrou `429 Too Many Requests` em `/auth/v1/signup`. Esse status é um limite temporário de chamadas do Supabase Auth (não um erro do `tsconfig` nem da chave API). A tela agora orienta aguardar antes de tentar novamente e verificar `Authentication > Rate Limits` no painel; não há retentativa automática que aumente a limitação.

## Validação executada

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit --pretty false` | Passou sem erros |
| `npm test -- --run` | Passou: 5 arquivos, 15 testes |
| `npx vite build --outDir <pasta-temporária>` | Build de produção passou; sem aviso de configuração ou chunks grandes |

O diretório temporário `.audit-dist` usado na validação foi removido após o build. A tela de autenticação foi aberta e conferida visualmente em desktop e em viewport móvel de 390 × 844. A página autenticada do calendário também foi conferida com a sessão que já estava aberta: depois da correção, o mês continuou visível e o aviso informou que falta a migration da Rotina. Nenhum novo compromisso foi enviado. As operações de gravação e as permissões RLS do Supabase ainda precisam ser confirmadas no ambiente real.

## Arquivos principais alterados

- `src/App.tsx`, `src/app/layouts/` e `src/app/providers/`: providers, autenticação e rotas.
- `src/pages/`: login, calendário, agenda, gerenciamento de agendas e configurações.
- `src/app/layouts/`: shell autenticado e layout responsivo de autenticação.
- `src/components/calendar/`, `src/components/events/` e `src/components/ui/`: visualizações, formulário e componentes corrigidos.
- `src/styles/`: tokens, reset, componentes e breakpoints do novo visual.
- `src/lib/calendarDates.ts`, `src/lib/dates.ts`, `src/lib/utils.ts` e testes associados.
- `tsconfig.json`, `vite.config.mts`, `package.json` e `package-lock.json`.

## Rotina pessoal — novembro de 2026

- Foi criada a página **Minha rotina**, integrada ao calendário mensal/semanal/diário, à Agenda e à Visão geral. Regras fixas, flexíveis e opcionais são exibidas separadamente; horários aproximados aparecem como janelas e alterações por data não mudam a regra recorrente.
- A configuração inicial de novembro — regras habituais e os feriados nacionais de 2, 15 e 20 de novembro — só é gravada após a confirmação explícita no botão **Configurar novembro de 2026**. Possibilidades não são confirmadas automaticamente: o Aprisco permanece pendente e não bloqueia a agenda.
- Eventos específicos podem ser confirmados, previstos ou possíveis. Possibilidades ficam identificadas como tal e não entram nos alertas de conflito.
- A migration [20261027000001_routine_rules.sql](./supabase/migrations/20261027000001_routine_rules.sql) adiciona as tabelas de regras e exceções com RLS, a classificação de certeza dos eventos e operações atômicas para copiar um dia ou confirmar uma ocorrência.
- **A migration ainda precisa ser aplicada ao projeto Supabase antes de usar a página Rotina.** A validação local não aplicou alterações ao banco remoto nem gravou a configuração inicial na conta.
- A checagem mais recente passou em TypeScript, nos 5 arquivos/15 testes e no build de produção. A interface autenticada e as operações/RLS do Supabase continuam sem validação remota nesta execução.
- Se a URL/chave do Supabase não estiverem disponíveis no início, o app agora mantém a tela de autenticação visível e informa quais variáveis precisam ser configuradas, em vez de falhar durante o import. O `.env` não foi alterado nesta tarefa.
- A tela de login carregou no build de produção e em uma instância Vite limpa, também em viewport de 390 × 844. A instância de desenvolvimento já aberta estava com cache de dependências inconsistente e mostrava erro de hook do React; se o problema persistir nessa aba, reinicie o servidor com `npm run dev -- --force`. O cache e os diretórios temporários usados para validar foram removidos.
- A captura posterior do calendário mostrou que a tabela `public.routine_rules` não existe no schema remoto (`PGRST205`). O carregamento das regras agora falha isoladamente, mantendo os eventos e o calendário utilizáveis, e as telas indicam a migration necessária. Os erros de gravação também exibem a mensagem real retornada pelo Supabase em vez de um aviso genérico.
- A página autenticada foi atualizada no navegador depois da correção: o calendário mensal foi exibido sem o erro geral de carregamento e mostrou a instrução específica sobre a migration pendente. Não foi enviado outro compromisso durante a validação.
