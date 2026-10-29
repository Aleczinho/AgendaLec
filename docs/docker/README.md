# AgendaLec no ZimaOS

Este Compose publica o frontend do AgendaLec em um container Nginx. O app
continua usando o projeto Supabase configurado nas variáveis abaixo; o banco
de dados e a autenticação não são hospedados por este Compose.

## Preparar

1. Copie o projeto completo para o servidor ZimaOS, mantendo a pasta `docker`
   dentro da raiz do projeto. Ou clone o repositório no servidor.
2. Na pasta `docker`, copie `.env.example` para `.env`.
3. Edite `docker/.env` e informe `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_PUBLISHABLE_KEY` do seu projeto. `APP_PORT` pode ser alterada
   se a porta `8080` já estiver ocupada.
4. No terminal do servidor, estando na pasta `docker`, execute:

   ```sh
   docker compose up -d --build
   ```

   No ZimaOS, também é possível importar `docker/compose.yaml` pela área Docker
   e iniciar a stack. Garanta que o contexto de build (`..`) corresponda à raiz
   do projeto e que as variáveis do arquivo `.env` estejam disponíveis para o
   Compose.

5. Acesse `http://IP-DO-ZIMAOS:8080` (ou a porta definida em `APP_PORT`).

## Atualizar

Depois de atualizar os arquivos do projeto:

```sh
docker compose up -d --build
```

As variáveis `VITE_*` são incorporadas ao frontend durante o build. Se alterá-las,
recrie a imagem com o comando acima. Use somente uma chave pública
(`publishable` ou `anon`): qualquer valor Vite incluído no frontend fica visível
ao navegador. Nunca coloque a chave `service_role` neste arquivo.
