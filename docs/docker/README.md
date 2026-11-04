# AgendaLec com Docker (ZimaOS ou qualquer servidor)

O Compose sobe **dois containers**:

- `agendalec-api`: API Node que conecta no **seu PostgreSQL** usando o `.env`;
- `agendalec`: nginx com o site, que repassa `/api` para a API.

O PostgreSQL **não** faz parte do Compose: ele é o que você já hospeda. Veja [../POSTGRES_PASSO_A_PASSO.md](../POSTGRES_PASSO_A_PASSO.md) para preparar o banco.

## Preparar

1. Copie o projeto completo para o servidor (mantendo `docker/` e `server/` na raiz).
2. Na **raiz** do projeto: `cp .env.example .env` e preencha `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `JWT_SECRET` (`openssl rand -hex 48`). `APP_PORT` muda a porta do site (padrão `8080`).
3. Ainda na raiz, execute:

   ```sh
   docker compose --env-file .env -f docker/compose.yaml up -d --build
   ```

4. Acesse `http://IP-DO-SERVIDOR:8080`.

Veja se a API conectou no banco: `docker logs agendalec-api` (deve mostrar `[db] conectado` e `[api] AgendaLec ouvindo`).

## Criar usuários

```sh
docker exec -it agendalec-api node scripts/user.js create voce@exemplo.com
docker exec -it agendalec-api node scripts/user.js password voce@exemplo.com
```

## Atualizar

```sh
docker compose --env-file .env -f docker/compose.yaml up -d --build
```

Mudou algo no `.env` (senha do banco, `JWT_SECRET`, `ALLOW_REGISTRATION`)? Basta recriar a API: `docker compose --env-file .env -f docker/compose.yaml up -d api`. Só `VITE_API_URL` exige rebuild do site, pois é embutida no build.

## Problemas comuns

- **API reinicia em loop**: leia `docker logs agendalec-api`; o motivo (senha, host, SSL, `JWT_SECRET`) aparece na primeira linha.
- **`ECONNREFUSED` / timeout**: o PostgreSQL não aceita conexões deste container. Confira `listen_addresses`, `pg_hba.conf` e o firewall. Se o banco está no mesmo servidor, use `DB_HOST=host.docker.internal`.
- **`no pg_hba.conf entry ... no encryption`**: o servidor exige SSL; defina `DB_SSL=true` (ou `no-verify` para certificado autoassinado).
