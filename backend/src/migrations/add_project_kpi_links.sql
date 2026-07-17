CREATE TABLE IF NOT EXISTS project_kpi_links (
  project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kpi_id TEXT NOT NULL REFERENCES project_kpis(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, kpi_id)
);

CREATE INDEX IF NOT EXISTS idx_project_kpi_links_kpi
  ON project_kpi_links(kpi_id);
