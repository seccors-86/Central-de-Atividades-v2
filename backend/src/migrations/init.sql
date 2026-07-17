-- NUVYO - Gestão Inteligente Database Schema
-- PostgreSQL Database Initialization

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS activity_log_tags CASCADE;
DROP TABLE IF EXISTS task_tags CASCADE;
DROP TABLE IF EXISTS task_members CASCADE;
DROP TABLE IF EXISTS ai_report_templates CASCADE;
DROP TABLE IF EXISTS ai_summaries CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS status_configs CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS areas CASCADE;

-- Areas Table (Gerências e Subáreas)
CREATE TABLE areas (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES areas(id) ON DELETE SET NULL
);

-- Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'member')),
    area_id VARCHAR(50) NOT NULL,
    cpf VARCHAR(11) UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
);

-- Tags Table
CREATE TABLE tags (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Status Configurations Table
CREATE TABLE status_configs (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    color VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('success', 'warning', 'neutral', 'error')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs Table
CREATE TABLE activity_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (status) REFERENCES status_configs(id) ON DELETE CASCADE
);

-- Tasks Table
CREATE TABLE tasks (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    deadline DATE NOT NULL,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('todo', 'doing', 'done')),
    area_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtasks JSONB DEFAULT '[]'::jsonb,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
);

-- Task Members (Many-to-Many relationship)
CREATE TABLE task_members (
    task_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Task Tags (Many-to-Many relationship)
CREATE TABLE task_tags (
    task_id VARCHAR(50) NOT NULL,
    tag_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Activity Log Tags (Many-to-Many relationship)
CREATE TABLE activity_log_tags (
    activity_log_id VARCHAR(50) NOT NULL,
    tag_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (activity_log_id, tag_id),
    FOREIGN KEY (activity_log_id) REFERENCES activity_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- AI Summaries Table
CREATE TABLE ai_summaries (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    title VARCHAR(200) NOT NULL DEFAULT 'Resumo com IA',
    content TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    template_id VARCHAR(60) NOT NULL DEFAULT 'legacy',
    question TEXT,
    format VARCHAR(20) NOT NULL DEFAULT 'markdown',
    scope_type VARCHAR(20) NOT NULL DEFAULT 'all',
    scope_id VARCHAR(50),
    scope_label VARCHAR(255) NOT NULL DEFAULT 'Toda a empresa',
    provider VARCHAR(30) NOT NULL DEFAULT 'legacy',
    model VARCHAR(200),
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_summaries_created_at ON ai_summaries(created_at DESC);
CREATE INDEX idx_ai_summaries_created_by ON ai_summaries(created_by, created_at DESC);

CREATE TABLE ai_report_templates (
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

CREATE INDEX idx_ai_report_templates_active
    ON ai_report_templates(featured DESC, name) WHERE deleted_at IS NULL;

-- Create indexes for better query performance
CREATE INDEX idx_users_area ON users(area_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_date ON activity_logs(date);
CREATE INDEX idx_tasks_owner ON tasks(owner_id);
CREATE INDEX idx_tasks_area ON tasks(area_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Insert Initial Data

-- Areas
INSERT INTO areas (id, name, parent_id) VALUES
    ('area1', 'Gerência de Negócios', NULL),
    ('area_agro', 'Time Agro', 'area1'),
    ('area_pf', 'Time Pessoa Física', 'area1'),
    ('area2', 'Tecnologia & Inovação', NULL);

-- Tags
INSERT INTO tags (id, name, color) VALUES
    ('t1', 'Reunião', 'bg-indigo-100 text-indigo-800'),
    ('t2', 'Treinamento', 'bg-violet-100 text-violet-800'),
    ('t3', 'Deslocamento', 'bg-amber-100 text-amber-800'),
    ('t4', 'Operacional', 'bg-slate-100 text-slate-800'),
    ('t5', 'Estratégico', 'bg-emerald-100 text-emerald-800'),
    ('t6', 'Projeto', 'bg-cyan-100 text-cyan-800');

-- Status Configs
INSERT INTO status_configs (id, label, color, type) VALUES
    ('backlog', 'Backlog', 'bg-gray-100 text-gray-600', 'neutral'),
    ('doing', 'Em Andamento', 'bg-blue-50 text-blue-700', 'warning'),
    ('done', 'Concluído', 'bg-green-50 text-[#005C46]', 'success');
