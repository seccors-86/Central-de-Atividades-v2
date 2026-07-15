import { Request, Response } from 'express';
import { query } from '../config/database.js';

// Obter estatísticas e perfil de gamificação do usuário
export const getGamificationProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Buscar perfil básico
    const profileRes = await query(
      `SELECT gp.*, u.name, u.photo, a.name as area_name 
       FROM gamification_profiles gp
       JOIN users u ON gp.user_id = u.id
       LEFT JOIN areas a ON u.area_id = a.id
       WHERE gp.user_id = $1`,
      [userId]
    );

    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil de gamificação não encontrado.' });
    }

    const profile = profileRes.rows[0];

    // Buscar insígnias conquistadas
    const badgesRes = await query(
      `SELECT b.*, ub.unlocked_at, ub.reason
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1
       ORDER BY ub.unlocked_at DESC`,
      [userId]
    );

    // Buscar progresso em campanhas ativas
    const campaignsRes = await query(
      `SELECT c.*, uc.current_progress, uc.completed, uc.completed_at
       FROM user_campaigns uc
       JOIN campaigns c ON uc.campaign_id = c.id
       WHERE uc.user_id = $1 AND c.active = TRUE`,
      [userId]
    );

    res.json({
      userId: profile.user_id,
      name: profile.name,
      photo: profile.photo,
      areaName: profile.area_name,
      xpTotal: parseInt(profile.xp_total || '0'),
      level: parseInt(profile.level || '1'),
      currentStreak: parseInt(profile.current_streak || '0'),
      maxStreak: parseInt(profile.max_streak || '0'),
      lastActivityDate: profile.last_activity_date,
      badges: badgesRes.rows.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
        imageUrl: b.image_url,
        minXp: b.min_xp,
        badgeType: b.badge_type,
        colorGradient: b.color_gradient,
        unlockedAt: b.unlocked_at,
        reason: b.reason
      })),
      campaigns: campaignsRes.rows.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        rewardXp: c.reward_xp,
        rewardBadgeId: c.reward_badge_id,
        targetMetric: c.target_metric,
        targetValue: c.target_value,
        progress: parseInt(c.current_progress || '0'),
        completed: c.completed,
        completedAt: c.completed_at
      }))
    });
  } catch (err) {
    console.error('getGamificationProfile error:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil de gamificação.' });
  }
};

// Obter ranking de classificação geral ou por área
export const getRanking = async (req: Request, res: Response) => {
  try {
    const { areaId, sortBy = 'xp', period = 'all' } = req.query;

    let queryStr = '';
    const params: any[] = [];
    let paramIdx = 1;

    // Filtros de Área
    let areaFilter = '';
    if (areaId) {
      areaFilter = `WHERE u.area_id = $${paramIdx}`;
      params.push(areaId);
      paramIdx++;
    }

    if (period === 'all') {
      // Usar a tabela consolidada (muito rápida)
      const orderColumn = sortBy === 'streak' ? 'gp.current_streak DESC, gp.xp_total DESC' : 'gp.xp_total DESC, gp.current_streak DESC';
      
      queryStr = `
        SELECT gp.user_id, gp.xp_total as xp, gp.level, gp.current_streak as streak, 
               u.name, u.photo, a.name as area_name
        FROM gamification_profiles gp
        JOIN users u ON gp.user_id = u.id
        LEFT JOIN areas a ON u.area_id = a.id
        ${areaFilter}
        ORDER BY ${orderColumn}
      `;
    } else {
      // Se for ranking periódico (week ou month), calculamos dinamicamente com base em logs de atividades e tarefas concluídas no período
      const interval = period === 'week' ? '7 days' : '30 days';
      const orderColumn = sortBy === 'streak' ? 'streak DESC, xp DESC' : 'xp DESC, streak DESC';
      
      queryStr = `
        WITH period_xp AS (
          -- XP dos logs no período
          SELECT user_id, 
                 SUM(
                   CASE 
                     WHEN (TO_DATE(date, 'YYYY-MM-DD') - start_date) <= 0 THEN 100 
                     WHEN (TO_DATE(date, 'YYYY-MM-DD') - start_date) = 1 THEN 50 
                     ELSE 10 
                   END
                 ) as xp
          FROM (
            SELECT user_id, date, 
                   COALESCE(TO_TIMESTAMP(timestamp/1000), NOW())::date as start_date
            FROM activity_logs
            WHERE COALESCE(TO_TIMESTAMP(timestamp/1000), NOW()) >= NOW() - INTERVAL '${interval}'
          ) as sub
          GROUP BY user_id
          
          UNION ALL
          
          -- XP de tarefas concluídas no período
          SELECT owner_id as user_id, COUNT(*) * 200 as xp
          FROM tasks
          WHERE status = 'done' AND updated_at >= NOW() - INTERVAL '${interval}'
          GROUP BY owner_id
        ),
        total_period_xp AS (
          SELECT user_id, SUM(xp) as xp
          FROM period_xp
          GROUP BY user_id
        )
        
        SELECT gp.user_id, COALESCE(tpx.xp, 0)::integer as xp, gp.level, gp.current_streak as streak, 
               u.name, u.photo, a.name as area_name
        FROM gamification_profiles gp
        JOIN users u ON gp.user_id = u.id
        LEFT JOIN areas a ON u.area_id = a.id
        LEFT JOIN total_period_xp tpx ON gp.user_id = tpx.user_id
        ${areaFilter ? areaFilter.replace('u.area_id', 'u.area_id') : ''}
        ORDER BY ${orderColumn}
      `;
    }

    const result = await query(queryStr, params);
    
    // Converter de snake_case para camelCase
    const ranking = result.rows.map((row, idx) => ({
      position: idx + 1,
      userId: row.user_id,
      name: row.name,
      photo: row.photo,
      areaName: row.area_name,
      level: parseInt(row.level || '1'),
      xp: parseInt(row.xp || '0'),
      streak: parseInt(row.streak || '0')
    }));

    res.json(ranking);
  } catch (err) {
    console.error('getRanking error:', err);
    res.status(500).json({ error: 'Erro ao buscar ranking de gamificação.' });
  }
};

// Obter todos os badges disponíveis no sistema
export const getBadges = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM badges ORDER BY min_xp ASC');
    const badges = result.rows.map(b => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      imageUrl: b.image_url,
      minXp: b.min_xp,
      badgeType: b.badge_type,
      colorGradient: b.color_gradient,
      createdBy: b.created_by,
      createdAt: b.created_at
    }));
    res.json(badges);
  } catch (err) {
    console.error('getBadges error:', err);
    res.status(500).json({ error: 'Erro ao buscar insígnias.' });
  }
};

// Criar nova insígnia (Super Admin)
export const createBadge = async (req: Request, res: Response) => {
  try {
    const { id, name, description, icon, minXp, badgeType = 'level', colorGradient, imageUrl } = req.body;
    const user = (req as any).user;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar insígnias.' });
    }

    const result = await query(
      `INSERT INTO badges (id, name, description, icon, min_xp, badge_type, color_gradient, image_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, name, description, icon, minXp, badgeType, colorGradient, imageUrl, user.id]
    );

    const newBadge = result.rows[0];
    res.status(201).json({
      id: newBadge.id,
      name: newBadge.name,
      description: newBadge.description,
      icon: newBadge.icon,
      imageUrl: newBadge.image_url,
      minXp: newBadge.min_xp,
      badgeType: newBadge.badge_type,
      colorGradient: newBadge.color_gradient,
      createdBy: newBadge.created_by,
      createdAt: newBadge.created_at
    });
  } catch (err) {
    console.error('createBadge error:', err);
    res.status(500).json({ error: 'Erro ao criar insígnia.' });
  }
};

// Obter todas as campanhas ativas
export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM campaigns 
       WHERE active = TRUE 
       ORDER BY end_date DESC`
    );
    const campaigns = result.rows.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      startDate: c.start_date,
      endDate: c.end_date,
      rewardXp: c.reward_xp,
      rewardBadgeId: c.reward_badge_id,
      targetMetric: c.target_metric,
      targetValue: c.target_value,
      active: c.active,
      createdAt: c.created_at
    }));
    res.json(campaigns);
  } catch (err) {
    console.error('getCampaigns error:', err);
    res.status(500).json({ error: 'Erro ao buscar campanhas.' });
  }
};

// Criar nova campanha (Super Admin / Manager)
export const createCampaign = async (req: Request, res: Response) => {
  try {
    const { id, title, description, startDate, endDate, rewardXp, targetMetric, targetValue, rewardBadgeId } = req.body;
    const user = (req as any).user;

    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores ou gestores podem criar campanhas.' });
    }

    const result = await query(
      `INSERT INTO campaigns (id, title, description, start_date, end_date, reward_xp, target_metric, target_value, reward_badge_id, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
       RETURNING *`,
      [id, title, description, startDate, endDate, rewardXp, targetMetric, targetValue, rewardBadgeId]
    );

    const newCamp = result.rows[0];
    res.status(201).json({
      id: newCamp.id,
      title: newCamp.title,
      description: newCamp.description,
      startDate: newCamp.start_date,
      endDate: newCamp.end_date,
      rewardXp: newCamp.reward_xp,
      rewardBadgeId: newCamp.reward_badge_id,
      targetMetric: newCamp.target_metric,
      targetValue: newCamp.target_value,
      active: newCamp.active,
      createdAt: newCamp.created_at
    });
  } catch (err) {
    console.error('createCampaign error:', err);
    res.status(500).json({ error: 'Erro ao criar campanha.' });
  }
};

// Obter todas as regras de pontuação (scoring rules)
export const getScoringRules = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM scoring_rules ORDER BY id ASC');
    const rules = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      xpValue: parseInt(row.xp_value || '0'),
      updatedAt: row.updated_at
    }));
    res.json(rules);
  } catch (err) {
    console.error('getScoringRules error:', err);
    res.status(500).json({ error: 'Erro ao buscar regras de pontuação.' });
  }
};

// Salvar / atualizar regras de pontuação (apenas Admin)
export const saveScoringRules = async (req: Request, res: Response) => {
  try {
    const { rules } = req.body;
    const user = (req as any).user;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem alterar as regras de pontuação.' });
    }

    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: 'Formato inválido de regras.' });
    }

    for (const rule of rules) {
      await query(
        'UPDATE scoring_rules SET xp_value = $1, updated_at = NOW() WHERE id = $2',
        [parseInt(rule.xpValue), rule.id]
      );
    }

    res.json({ message: 'Regras de pontuação atualizadas com sucesso!' });
  } catch (err) {
    console.error('saveScoringRules error:', err);
    res.status(500).json({ error: 'Erro ao salvar regras de pontuação.' });
  }
};
