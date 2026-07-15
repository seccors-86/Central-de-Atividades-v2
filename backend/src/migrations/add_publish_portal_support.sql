-- Migração para adicionar suporte ao controle de publicação de projetos e tarefas no Portal de Transparência
ALTER TABLE users ADD COLUMN IF NOT EXISTS pode_publicar BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS publicar_portal BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS publicar_portal BOOLEAN DEFAULT FALSE;
