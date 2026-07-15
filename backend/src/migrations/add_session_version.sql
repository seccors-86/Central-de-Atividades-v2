-- Revoga sessões existentes quando credenciais, perfil ou permissões são alterados.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
