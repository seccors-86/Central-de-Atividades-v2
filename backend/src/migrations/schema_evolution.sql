ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS dono_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_dono ON projects(dono_id);

CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(50) PRIMARY KEY,
  entity_type VARCHAR(30) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  link TEXT,
  read_at TIMESTAMP NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Em Avaliação',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT suggestions_status_check CHECK (
    status IN ('Em Avaliação', 'Em Desenvolvimento', 'Lançado', 'Recusado')
  )
);

CREATE TABLE IF NOT EXISTS suggestion_votes (
  suggestion_id TEXT NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (suggestion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_suggestions_created_at
  ON suggestions(created_at DESC);

-- Relatórios com IA: configuração segura fica em system_settings e o histórico
-- armazena apenas o HTML sanitizado, nunca a chave do provedor em texto aberto.
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS template_id VARCHAR(60) DEFAULT 'legacy';
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS question TEXT;
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS format VARCHAR(20) DEFAULT 'markdown';
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS scope_type VARCHAR(20) DEFAULT 'all';
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS scope_id VARCHAR(50);
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS scope_label VARCHAR(255) DEFAULT 'Toda a empresa';
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS provider VARCHAR(30) DEFAULT 'legacy';
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS model VARCHAR(200);
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE ai_summaries SET
  title = COALESCE(NULLIF(title, ''), 'Resumo com IA'),
  template_id = COALESCE(NULLIF(template_id, ''), 'legacy'),
  format = COALESCE(NULLIF(format, ''), 'markdown'),
  scope_type = COALESCE(NULLIF(scope_type, ''), 'all'),
  scope_label = COALESCE(NULLIF(scope_label, ''), 'Toda a empresa'),
  provider = COALESCE(NULLIF(provider, ''), 'legacy')
WHERE title IS NULL OR template_id IS NULL OR format IS NULL OR scope_type IS NULL OR scope_label IS NULL OR provider IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_summaries_created_by_fkey') THEN
    ALTER TABLE ai_summaries ADD CONSTRAINT ai_summaries_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_summaries_created_at ON ai_summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_created_by ON ai_summaries(created_by, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_report_templates (
  id VARCHAR(60) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_scope VARCHAR(20) NOT NULL DEFAULT 'any' CHECK (required_scope IN ('any', 'client')),
  featured BOOLEAN NOT NULL DEFAULT false,
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  updated_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_report_templates_active
  ON ai_report_templates(featured DESC, name) WHERE deleted_at IS NULL;
