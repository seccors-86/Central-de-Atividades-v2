CREATE TABLE IF NOT EXISTS security_audit_events (
  id UUID PRIMARY KEY,
  user_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  method TEXT NULL,
  path TEXT NULL,
  status_code INTEGER NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_events(user_id);
