-- Migração: Adicionar coluna private à tabela de projetos
ALTER TABLE projects ADD COLUMN IF NOT EXISTS private BOOLEAN DEFAULT FALSE;
