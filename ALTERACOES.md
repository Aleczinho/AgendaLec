# Exportar, importar e apagar dados (Configurações)

Data: 2026-11-03

Nova funcionalidade na página **Configurações**: quatro cartões para exportar o calendário, fazer backup completo, importar um backup e apagar todos os dados.

## Arquivos

| Arquivo | Tipo | O que mudou |
|---|---|---|
| `src/lib/calendarExport.ts` | novo | Geração de `.ics`, CSV e backup JSON; filtro por período; download de arquivo |
| `src/lib/calendarExport.test.ts` | novo | Testes de `.ics`, CSV, filtro, nome de arquivo e backup |
| `src/lib/calendarBackup.ts` | novo | Leitura e validação do backup, preparação da importação, helpers |
| `src/lib/calendarBackup.test.ts` | novo | Testes de validação e preparação da importação |
| `src/services/backupService.ts` | novo | `importBackup` e `deleteAllUserData` (acesso ao Supabase) |
| `src/pages/SettingsPage.tsx` | alterado | Quatro cartões novos e seus handlers |
| `src/styles/components.css` | alterado | Acrescentado `.btn-danger` no final do arquivo |

Nenhuma migration nova foi necessária; tudo usa as tabelas e permissões já existentes.

## Funcionalidades

### 1. Exportar calendário
- Formatos: `.ics` (Google Agenda, Outlook, Apple Calendário) e `.csv` (planilha).
- Filtro por período ("De" / "Até"); em branco exporta tudo.
- Opção de incluir feriados.
- Busca todos os compromissos do usuário no Supabase, não só o mês aberto na tela.
- `.ics`: escape de texto e quebra de linha conforme a RFC 5545, eventos de dia inteiro, `RRULE` quando a recorrência for válida, UID estável por evento.
- CSV: UTF-8 com BOM (acentos corretos no Excel), aspas escapadas e proteção contra injeção de fórmulas (`=`, `+`, `-`, `@`).
- Avisa quando não há nada no período. Arquivo: `agendalec-AAAA-MM-DD.ext`.
- Não inclui as regras da aba Rotina (apenas compromissos e feriados).

### 2. Backup completo
- Gera `agendalec-backup-AAAA-MM-DD.json` com compromissos, regras e ajustes da rotina, calendários, feriados do usuário e preferências.
- O arquivo inclui versão, data da exportação e contagem por tabela.
- Tabelas ausentes no banco (por exemplo, Rotina sem a migration aplicada) não bloqueiam o backup; entram em `warnings`.

### 3. Importar backup
- Valida o arquivo antes de tocar no banco (JSON válido, `app = AgendaLec`, versão suportada, linhas válidas). Qualquer erro cancela tudo.
- Mostra um resumo do conteúdo antes de importar.
- Padrão: mescla com os dados atuais (upsert). Itens com o mesmo `id` são atualizados.
- Opção "Apagar os dados atuais antes de importar", com confirmação digitando `APAGAR` (campo independente do cartão de apagar).
- Tudo é reatribuído ao usuário logado.
- Regras de rotina e feriados com `seed_key` são resolvidos por `(user_id, seed_key)`; os ids das regras são remapeados para os ajustes não quebrarem a chave estrangeira.
- `calendar_id` que não existe mais vira `null`.
- Preferências do backup são mescladas por cima das atuais.
- Importação em blocos de 500 linhas.
- Depois de importar, recarregue a página para aplicar tema e preferências.

### 4. Apagar tudo
- Remove compromissos, regras e ajustes da rotina, calendários e feriados do usuário, em ordem que respeita as chaves estrangeiras.
- Preferências do perfil e a conta são mantidas.
- Botão desabilitado até digitar `APAGAR`.
- Os feriados iniciais de novembro voltam sozinhos no próximo carregamento do calendário (comportamento já existente do app).

## Limitações conhecidas
- Não há desfazer para "Apagar tudo". Se falhar no meio, parte dos dados pode já ter sido removida.
- Importar um backup de outra conta no mesmo banco falha se os ids já pertencerem a outro usuário.
- A rotina não é exportada no `.ics`/CSV; só no backup JSON.
- Feriados globais (sem `user_id`) não entram no backup nem são apagados.

## Verificação
- Lógica pura (`.ics`, CSV, backup, validação, preparação da importação) testada com Node e checada com `tsc` (sem erros).
- **Não executado neste ambiente** (sem acesso ao registro npm): `npm test`, `npm run build` e o uso real da tela contra o Supabase. Rodar antes de publicar:

```bash
npm install
npm test
npm run build
```

Teste manual sugerido: exportar `.ics` e abrir no Google Agenda; gerar backup; apagar tudo; importar o backup e conferir se compromissos, rotina e ajustes voltaram.

## Mensagem de commit sugerida

```
feat(configuracoes): exportar, backup, importar e apagar dados

- Exportar calendário em .ics ou CSV, com filtro por período e
  opção de incluir feriados
- Backup completo em JSON (compromissos, rotina, ajustes, calendários,
  feriados e preferências)
- Importar backup com validação prévia, mesclagem por id e remapeamento
  de regras de rotina por seed_key; opção de substituir dados atuais
- Apagar tudo com confirmação digitada, preservando preferências e conta
- Novos módulos calendarExport, calendarBackup e backupService, com testes
- Estilo .btn-danger
```
