-- Better Auth: adiciona suporte a sessões por cookie e migra credenciais existentes.
-- Os IDs de users não mudam, preservando todos os relacionamentos de dados do AgendaLec.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS image TEXT;

UPDATE users
SET email = lower(email),
    name = COALESCE(NULLIF(name, ''), split_part(email, '@', 1));

INSERT INTO profiles (id, display_name)
SELECT users.id, users.name
FROM users
LEFT JOIN profiles ON profiles.id = users.id
WHERE profiles.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Prisma/Better Auth usam uma chave única direta para buscar e-mail; o índice antigo
-- em lower(email) continua garantindo que não existam duplicatas com caixa diferente.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounts_provider_id_account_id_key UNIQUE (provider_id, account_id)
);
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts (user_id);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS verifications_identifier_idx ON verifications (identifier);

-- Migra os hashes bcrypt existentes para a credencial email/senha do Better Auth.
-- provider_id='credential' e account_id=user.id são o formato esperado pela biblioteca.
INSERT INTO accounts (
  account_id, provider_id, user_id, password, created_at, updated_at
)
SELECT
  users.id::text, 'credential', users.id, users.password_hash, users.created_at, users.updated_at
FROM users
WHERE users.password_hash IS NOT NULL
ON CONFLICT (provider_id, account_id) DO UPDATE
SET password = EXCLUDED.password,
    updated_at = EXCLUDED.updated_at;

ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

COMMIT;
