import { query, getClient } from '../config/database.js';
import { differenceInCalendarDays, isSaturday, isSunday, subDays, parseISO, startOfDay } from 'date-fns';

export interface XPResult {
  xpAdded: number;
  xpTotal: number;
  level: number;
  levelUp: boolean;
  currentStreak: number;
  newBadges: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    colorGradient: string;
    imageUrl?: string;
  }>;
  campaignUpdates: Array<{
    campaignId: string;
    title: string;
    progress: number;
    target: number;
    completed: boolean;
    rewardXp: number;
  }>;
}

// Lógica de cálculo de dias úteis para o Streak
export const isWorkingDay = (date: Date): boolean => {
  return !isSaturday(date) && !isSunday(date);
};

export const getPreviousWorkingDay = (date: Date): Date => {
  let prev = subDays(date, 1);
  while (!isWorkingDay(prev)) {
    prev = subDays(prev, 1);
  }
  return prev;
};

/**
 * Concede XP para um usuário baseado em uma ação e atualiza o seu perfil de gamificação.
 */
export const awardXP = async (
  userId: string,
  actionType: 'activity_log' | 'task_completed' | 'support_resolved',
  metadata: {
    date?: string; // Usado em activity_log (YYYY-MM-DD)
    timestamp?: number; // Usado em activity_log para verificar atraso
    deadline?: string; // Usado em task_completed
    completedDate?: string; // Usado em task_completed
    onTime?: boolean; // Usado em support_resolved
  } = {}
): Promise<XPResult> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // 1. Obter ou inicializar o perfil do usuário
    let profileRes = await client.query(
      'SELECT * FROM gamification_profiles WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    if (profileRes.rows.length === 0) {
      // Cria se não existir (fallback do trigger)
      await client.query(
        'INSERT INTO gamification_profiles (user_id, xp_total, level, current_streak, max_streak) VALUES ($1, 0, 1, 0, 0)',
        [userId]
      );
      profileRes = await client.query(
        'SELECT * FROM gamification_profiles WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
    }
    
    const profile = profileRes.rows[0];
    let xpAdded = 0;
    let newStreak = parseInt(profile.current_streak || '0');
    let maxStreak = parseInt(profile.max_streak || '0');
    let lastActivityDate = profile.last_activity_date;

    // Carregar regras de pontuação dinâmicas com fallback para os padrões
    const rulesRes = await client.query('SELECT id, xp_value FROM scoring_rules');
    const rules = {
      activity_log_on_time: 100,
      activity_log_late_1d: 50,
      activity_log_late_more: 10,
      task_completed_base: 200,
      task_completed_on_time_bonus: 100,
      support_resolved_base: 150,
      support_resolved_sla_bonus: 50,
    };
    for (const row of rulesRes.rows) {
      if (row.id in rules) {
        rules[row.id as keyof typeof rules] = row.xp_value;
      }
    }
    
    // 2. Calcular XP com base na ação
    if (actionType === 'activity_log') {
      // Regra de Diário de Bordo
      const activityDateStr = metadata.date || new Date().toISOString().split('T')[0];
      const entryTimestamp = metadata.timestamp ? new Date(metadata.timestamp) : new Date();
      
      const activityDate = parseISO(activityDateStr);
      const entryDate = startOfDay(entryTimestamp);
      
      const diff = differenceInCalendarDays(entryDate, activityDate);
      
      if (diff <= 0) {
        xpAdded = rules.activity_log_on_time; // No prazo ou adiantado
      } else if (diff === 1) {
        xpAdded = rules.activity_log_late_1d;  // 1 dia de atraso
      } else {
        xpAdded = rules.activity_log_late_more;  // Atrasado
      }
      
      // Atualização do Streak
      const todayStr = new Date().toISOString().split('T')[0];
      
      if (!lastActivityDate) {
        // Primeira atividade
        newStreak = 1;
        maxStreak = Math.max(maxStreak, 1);
        lastActivityDate = activityDateStr;
      } else {
        const lastAct = parseISO(lastActivityDate);
        const currAct = parseISO(activityDateStr);
        const dayDiff = differenceInCalendarDays(currAct, lastAct);
        
        if (dayDiff > 0) {
          // Atividade é mais recente que a última salva
          const prevWorkingDay = getPreviousWorkingDay(currAct);
          const prevWorkingDayStr = prevWorkingDay.toISOString().split('T')[0];
          
          if (lastActivityDate === prevWorkingDayStr) {
            // É o dia útil seguinte consecutivo
            newStreak += 1;
          } else if (lastActivityDate === activityDateStr) {
            // Mesmo dia, não altera o streak
          } else {
            // Teve hiato maior que 1 dia útil, reinicia a sequência
            newStreak = 1;
          }
          
          maxStreak = Math.max(maxStreak, newStreak);
          lastActivityDate = activityDateStr;
        } else if (dayDiff === 0) {
          // Lançado no mesmo dia da última atividade, streak não muda
        } else {
          // Lançamento retroativo para uma data anterior à última atividade
          // Não altera a sequência ativa, pois foi lançada fora do fluxo linear
        }
      }
    } else if (actionType === 'task_completed') {
      // Regra de Conclusão de Tarefa
      xpAdded = rules.task_completed_base; // Base
      
      if (metadata.deadline) {
        const deadlineDate = startOfDay(parseISO(metadata.deadline));
        const compDate = metadata.completedDate ? startOfDay(parseISO(metadata.completedDate)) : startOfDay(new Date());
        
        if (differenceInCalendarDays(compDate, deadlineDate) <= 0) {
          xpAdded += rules.task_completed_on_time_bonus; // Bônus por entregar no prazo ou antes
        }
      }
    } else if (actionType === 'support_resolved') {
      // Regra de Encerramento de Suporte
      xpAdded = rules.support_resolved_base; // Base
      if (metadata.onTime) {
        xpAdded += rules.support_resolved_sla_bonus; // Bônus de SLA
      }
    }
    
    // 3. Atualizar XP total do Perfil
    const xpTotal = parseInt(profile.xp_total || '0') + xpAdded;
    
    // 4. Calcular Nível Dinâmico com base nos badges de "level" cadastrados
    const badgesRes = await client.query(
      'SELECT id, min_xp FROM badges WHERE badge_type = \'level\' ORDER BY min_xp ASC'
    );
    
    let calculatedLevel = 1;
    for (let i = 0; i < badgesRes.rows.length; i++) {
      if (xpTotal >= badgesRes.rows[i].min_xp) {
        calculatedLevel = i + 1;
      }
    }
    
    const oldLevel = parseInt(profile.level || '1');
    const levelUp = calculatedLevel > oldLevel;
    
    // Atualizar no banco
    await client.query(
      `UPDATE gamification_profiles 
       SET xp_total = $1, level = $2, current_streak = $3, max_streak = $4, last_activity_date = $5, updated_at = NOW() 
       WHERE user_id = $6`,
      [xpTotal, calculatedLevel, newStreak, maxStreak, lastActivityDate, userId]
    );
    
    // 5. Verificar desbloqueio de novas insígnias (Badges)
    const currentBadgesRes = await client.query(
      'SELECT badge_id FROM user_badges WHERE user_id = $1',
      [userId]
    );
    const ownedBadgeIds = new Set(currentBadgesRes.rows.map(b => b.badge_id));
    
    const allBadgesRes = await client.query(
      'SELECT * FROM badges ORDER BY min_xp ASC'
    );
    
    const unlockedBadges = [];
    for (const badge of allBadgesRes.rows) {
      if (!ownedBadgeIds.has(badge.id)) {
        let isEligible = false;
        
        if (badge.badge_type === 'level' && xpTotal >= badge.min_xp) {
          isEligible = true;
        } else if (badge.badge_type === 'streak' && newStreak >= badge.min_xp) {
          isEligible = true;
        }
        
        if (isEligible) {
          await client.query(
            'INSERT INTO user_badges (user_id, badge_id, reason) VALUES ($1, $2, $3)',
            [userId, badge.id, `Conquistado com ${xpTotal} XP e ${newStreak} dias seguidos.`]
          );
          ownedBadgeIds.add(badge.id); // Adicionar ao ownedBadgeIds para evitar duplicações
          unlockedBadges.push({
            id: badge.id,
            name: badge.name,
            icon: badge.icon,
            description: badge.description,
            colorGradient: badge.color_gradient || 'from-gray-400 to-gray-600',
            imageUrl: badge.image_url || undefined
          });
        }
      }
    }
    
    // 6. Atualizar campanhas de engajamento ativas
    const activeCampaignsRes = await client.query(
      `SELECT * FROM campaigns 
       WHERE active = TRUE AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE`
    );
    
    const campaignUpdates = [];
    let extraXpFromCampaigns = 0;
    
    for (const campaign of activeCampaignsRes.rows) {
      let metricMatch = false;
      if (campaign.target_metric === 'tasks_done' && actionType === 'task_completed') {
        metricMatch = true;
      } else if (campaign.target_metric === 'board_streak' && actionType === 'activity_log') {
        metricMatch = true;
      } else if (campaign.target_metric === 'support_closed' && actionType === 'support_resolved') {
        metricMatch = true;
      }
      
      if (metricMatch) {
        // Obter progresso da campanha para o usuário
        let userCampRes = await client.query(
          'SELECT * FROM user_campaigns WHERE user_id = $1 AND campaign_id = $2 FOR UPDATE',
          [userId, campaign.id]
        );
        
        let progress = 0;
        let completed = false;
        
        if (userCampRes.rows.length === 0) {
          // Inicializa progresso na campanha
          progress = campaign.target_metric === 'board_streak' ? newStreak : 1;
          completed = progress >= campaign.target_value;
          
          await client.query(
            'INSERT INTO user_campaigns (user_id, campaign_id, current_progress, completed, completed_at) VALUES ($1, $2, $3, $4, $5)',
            [userId, campaign.id, progress, completed, completed ? new Date() : null]
          );
        } else {
          const userCamp = userCampRes.rows[0];
          
          if (!userCamp.completed) {
            progress = campaign.target_metric === 'board_streak' ? newStreak : parseInt(userCamp.current_progress || '0') + 1;
            completed = progress >= campaign.target_value;
            
            await client.query(
              'UPDATE user_campaigns SET current_progress = $1, completed = $2, completed_at = $3 WHERE user_id = $4 AND campaign_id = $5',
              [progress, completed, completed ? new Date() : null, userId, campaign.id]
            );
          } else {
            progress = parseInt(userCamp.current_progress);
            completed = true;
          }
        }
        
        // Se concluiu a campanha nesta ação, recompensa com o XP extra da campanha e badge se houver
        if (completed && (userCampRes.rows.length === 0 || !userCampRes.rows[0].completed)) {
          extraXpFromCampaigns += campaign.reward_xp;

          // Se a campanha fornece uma insígnia de recompensa
          if (campaign.reward_badge_id) {
            // Verificar se o usuário já tem essa insígnia
            if (!ownedBadgeIds.has(campaign.reward_badge_id)) {
              // Obter detalhes da insígnia
              const badgeRewardRes = await client.query(
                'SELECT * FROM badges WHERE id = $1',
                [campaign.reward_badge_id]
              );
              
              if (badgeRewardRes.rows.length > 0) {
                const badgeReward = badgeRewardRes.rows[0];
                
                // Salvar na tabela user_badges
                await client.query(
                  'INSERT INTO user_badges (user_id, badge_id, reason) VALUES ($1, $2, $3)',
                  [userId, badgeReward.id, `Recompensa da campanha "${campaign.title}".`]
                );
                
                // Adicionar ao ownedBadgeIds para evitar concessão duplicada no fluxo
                ownedBadgeIds.add(badgeReward.id);
                
                // Adicionar na lista de novas insígnias
                unlockedBadges.push({
                  id: badgeReward.id,
                  name: badgeReward.name,
                  icon: badgeReward.icon,
                  description: badgeReward.description,
                  colorGradient: badgeReward.color_gradient || 'from-gray-400 to-gray-600',
                  imageUrl: badgeReward.image_url || undefined
                });
              }
            }
          }
        }
        
        campaignUpdates.push({
          campaignId: campaign.id,
          title: campaign.title,
          progress: Math.min(progress, campaign.target_value),
          target: campaign.target_value,
          completed,
          rewardXp: campaign.reward_xp
        });
      }
    }
    
    // Se ganhou XP extra das campanhas, atualiza o total no banco
    let finalXpTotal = xpTotal;
    if (extraXpFromCampaigns > 0) {
      finalXpTotal += extraXpFromCampaigns;
      
      // Atualizar XP de novo com a recompensa da campanha
      await client.query(
        'UPDATE gamification_profiles SET xp_total = $1 WHERE user_id = $2',
        [finalXpTotal, userId]
      );
      
      // Recalcular badges com o novo total
      for (const badge of allBadgesRes.rows) {
        if (!ownedBadgeIds.has(badge.id) && !unlockedBadges.some(b => b.id === badge.id)) {
          let isEligible = false;
          if (badge.badge_type === 'level' && finalXpTotal >= badge.min_xp) {
            isEligible = true;
          }
          
          if (isEligible) {
            await client.query(
              'INSERT INTO user_badges (user_id, badge_id, reason) VALUES ($1, $2, $3)',
              [userId, badge.id, `Conquistado com bônus de campanha. total: ${finalXpTotal} XP.`]
            );
            ownedBadgeIds.add(badge.id); // Adicionar ao ownedBadgeIds para evitar duplicações
            unlockedBadges.push({
              id: badge.id,
              name: badge.name,
              icon: badge.icon,
              description: badge.description,
              colorGradient: badge.color_gradient || 'from-gray-400 to-gray-600',
              imageUrl: badge.image_url || undefined
            });
          }
        }
      }
    }
    
    await client.query('COMMIT');
    
    return {
      xpAdded: xpAdded + extraXpFromCampaigns,
      xpTotal: finalXpTotal,
      level: calculatedLevel,
      levelUp,
      currentStreak: newStreak,
      newBadges: unlockedBadges,
      campaignUpdates
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error awarding XP in gamificationEngine:', error);
    throw error;
  } finally {
    client.release();
  }
};
