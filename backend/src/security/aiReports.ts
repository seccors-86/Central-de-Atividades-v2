import pool from '../config/database.js';
import { DEFAULT_REPORT_TEMPLATES } from '../config/aiReportTemplates.js';

export const ensureAIReportsSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_summaries (
      id VARCHAR(50) PRIMARY KEY,
      date DATE NOT NULL,
      content TEXT NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query("ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS title VARCHAR(200)");
  await pool.query("ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS template_id VARCHAR(60) DEFAULT 'legacy'");
  await pool.query('ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS question TEXT');
  await pool.query("ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS format VARCHAR(20) DEFAULT 'markdown'");
  await pool.query("ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS scope_type VARCHAR(20) DEFAULT 'all'");
  await pool.query('ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS scope_id VARCHAR(50)');
  await pool.query("ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS scope_label VARCHAR(255) DEFAULT 'Toda a empresa'");
  await pool.query("ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS provider VARCHAR(30) DEFAULT 'legacy'");
  await pool.query('ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS model VARCHAR(200)');
  await pool.query('ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL');
  await pool.query("ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb");
  await pool.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_summaries_created_by_fkey') THEN
      ALTER TABLE ai_summaries ADD CONSTRAINT ai_summaries_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
  END $$`);
  await pool.query(`UPDATE ai_summaries SET
    title = COALESCE(NULLIF(title, ''), 'Resumo com IA'),
    template_id = COALESCE(NULLIF(template_id, ''), 'legacy'),
    format = COALESCE(NULLIF(format, ''), 'markdown'),
    scope_type = COALESCE(NULLIF(scope_type, ''), 'all'),
    scope_label = COALESCE(NULLIF(scope_label, ''), 'Toda a empresa'),
    provider = COALESCE(NULLIF(provider, ''), 'legacy')
    WHERE title IS NULL OR template_id IS NULL OR format IS NULL OR scope_type IS NULL OR scope_label IS NULL OR provider IS NULL`);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_ai_summaries_created_at ON ai_summaries(created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_ai_summaries_created_by ON ai_summaries(created_by, created_at DESC)');

  await pool.query(`
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
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_ai_report_templates_active ON ai_report_templates(featured DESC, name) WHERE deleted_at IS NULL');

  for (const template of DEFAULT_REPORT_TEMPLATES) {
    await pool.query(
      `INSERT INTO ai_report_templates (id, name, description, sections, required_scope, featured, is_builtin)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, true)
       ON CONFLICT (id) DO NOTHING`,
      [template.id, template.name, template.description, JSON.stringify(template.sections), template.requiredScope, template.featured]
    );
  }
};
