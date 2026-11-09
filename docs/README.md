# Documentação do AgendaLec

Esta pasta reúne os guias, referências de produto e registros de entrega do projeto.

## Para entender e executar o projeto

- [Contexto geral para IA e desenvolvedores](CONTEXTO_GERAL.md): arquitetura atual, fluxos, dados, comandos e regras para mudanças.
- [Configuração do PostgreSQL](POSTGRES_PASSO_A_PASSO.md): banco, `.env`, API, usuários e migração de dados vindos do Supabase.
- [Publicação com Docker no ZimaOS](docker/README.md): site e API em containers, ligados ao seu PostgreSQL.

## Referências e histórico

- [Temas e paletas](referencias/AgendaLec_Temas_Paletas.md): documento visual de referência; confirme as cores implementadas em `src/styles/` antes de alterar o tema.
- [README antigo](README_ANTIGO.md): preservado como registro; sua estrutura não representa o código atual.
- [Resumos de entrega e revisão](historico/): registros históricos, que podem descrever estados anteriores do produto.

## Fonte de verdade

Para comportamento atual, priorize o código em `src/`, `server/` (API e migrações em `server/prisma/migrations/`), `package.json` e os arquivos Docker em `docker/`. Os resumos antigos não substituem a implementação.
