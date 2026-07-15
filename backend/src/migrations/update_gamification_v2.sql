-- Update Schema for Gamification V2
-- Add Image URL to badges, Reward Badge ID to campaigns and scoring_rules table

-- 1. Add image_url to badges table
ALTER TABLE badges ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL;

-- 2. Add reward_badge_id to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reward_badge_id VARCHAR(50) DEFAULT NULL;

-- 3. Add foreign key for reward_badge_id in campaigns table safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_campaigns_reward_badge'
    ) THEN
        ALTER TABLE campaigns 
        ADD CONSTRAINT fk_campaigns_reward_badge 
        FOREIGN KEY (reward_badge_id) REFERENCES badges(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Create scoring_rules table
CREATE TABLE IF NOT EXISTS scoring_rules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    xp_value INTEGER NOT NULL CHECK (xp_value >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Insert Initial Default Scoring Rules
INSERT INTO scoring_rules (id, name, xp_value) VALUES
('activity_log_on_time', 'Diário de Bordo - No Prazo', 100),
('activity_log_late_1d', 'Diário de Bordo - 1 Dia de Atraso', 50),
('activity_log_late_more', 'Diário de Bordo - Mais de 1 Dia de Atraso', 10),
('task_completed_base', 'Conclusão de Tarefa - Base', 200),
('task_completed_on_time_bonus', 'Conclusão de Tarefa - Bônus no Prazo', 100),
('support_resolved_base', 'Atendimento de Suporte - Base', 150),
('support_resolved_sla_bonus', 'Atendimento de Suporte - Bônus de SLA', 50)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, xp_value = EXCLUDED.xp_value;
