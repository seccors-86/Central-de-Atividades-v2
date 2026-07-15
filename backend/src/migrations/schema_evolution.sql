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
