CREATE TABLE IF NOT EXISTS ai_summaries (
  id VARCHAR(50) PRIMARY KEY,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS template_id VARCHAR(60) DEFAULT 'legacy';
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS question TEXT;
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS format VARCHAR(20) DEFAULT 'markdown';
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS scope_type VARCHAR(20) DEFAULT 'all';
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS scope_id VARCHAR(50);
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS scope_label VARCHAR(255) DEFAULT 'Toda a empresa';
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS provider VARCHAR(30) DEFAULT 'legacy';
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS model VARCHAR(200);
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_summaries_created_by_fkey') THEN
    ALTER TABLE ai_summaries ADD CONSTRAINT ai_summaries_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

UPDATE ai_summaries
SET title = COALESCE(NULLIF(title, ''), 'Resumo com IA'),
    template_id = COALESCE(NULLIF(template_id, ''), 'legacy'),
    format = COALESCE(NULLIF(format, ''), 'markdown'),
    scope_type = COALESCE(NULLIF(scope_type, ''), 'all'),
    scope_label = COALESCE(NULLIF(scope_label, ''), 'Toda a empresa'),
    provider = COALESCE(NULLIF(provider, ''), 'legacy')
WHERE title IS NULL OR template_id IS NULL OR format IS NULL OR scope_type IS NULL OR scope_label IS NULL OR provider IS NULL;

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
