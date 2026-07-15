-- Update Schema for Gamification
-- PostgreSQL Tables, Triggers and Initial Inserts

-- 1. Create badges table
CREATE TABLE IF NOT EXISTS badges (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(255) NOT NULL,
    min_xp INTEGER NOT NULL CHECK (min_xp >= 0),
    badge_type VARCHAR(50) DEFAULT 'level',
    color_gradient VARCHAR(255),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create gamification_profiles table
CREATE TABLE IF NOT EXISTS gamification_profiles (
    user_id VARCHAR(50) PRIMARY KEY,
    xp_total INTEGER DEFAULT 0 CHECK (xp_total >= 0),
    level INTEGER DEFAULT 1 CHECK (level >= 1),
    current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
    max_streak INTEGER DEFAULT 0 CHECK (max_streak >= 0),
    last_activity_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Create user_badges relationship table
CREATE TABLE IF NOT EXISTS user_badges (
    user_id VARCHAR(50) NOT NULL,
    badge_id VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

-- 4. Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reward_xp INTEGER NOT NULL CHECK (reward_xp >= 0),
    target_metric VARCHAR(50) NOT NULL, -- 'tasks_done', 'board_streak', 'support_closed'
    target_value INTEGER NOT NULL CHECK (target_value >= 1),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create user_campaigns relationship table
CREATE TABLE IF NOT EXISTS user_campaigns (
    user_id VARCHAR(50) NOT NULL,
    campaign_id VARCHAR(50) NOT NULL,
    current_progress INTEGER DEFAULT 0 CHECK (current_progress >= 0),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    PRIMARY KEY (user_id, campaign_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- 6. Insert Initial Badges
INSERT INTO badges (id, name, description, icon, min_xp, badge_type, color_gradient) VALUES
('1', 'Iniciante', 'Seus primeiros passos na gestão.', '🌱', 0, 'level', 'from-green-400 to-emerald-600'),
('2', 'Focado', 'Mantendo a consistência.', '🎯', 500, 'level', 'from-blue-400 to-indigo-600'),
('3', 'Produtivo', 'Entregas em ritmo acelerado.', '🚀', 1500, 'level', 'from-purple-400 to-fuchsia-600'),
('4', 'Mestre da Gestão', 'Referência para a equipe.', '👑', 3000, 'level', 'from-orange-400 to-amber-600'),
('5', 'Lenda', 'Excelência suprema.', '💎', 5000, 'level', 'from-teal-400 to-cyan-600')
ON CONFLICT (id) DO NOTHING;

-- 7. Initialize Profiles for Existing Users
INSERT INTO gamification_profiles (user_id, xp_total, level, current_streak, max_streak)
SELECT id, 0, 1, 0, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- 8. Add Auto-creation Trigger for new users
CREATE OR REPLACE FUNCTION create_user_gamification_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO gamification_profiles (user_id, xp_total, level, current_streak, max_streak)
    VALUES (NEW.id, 0, 1, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_user_gamification_profile ON users;
CREATE TRIGGER trg_create_user_gamification_profile
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_user_gamification_profile();
