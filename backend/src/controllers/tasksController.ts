import { Request, Response } from 'express';
import { query, getClient } from '../config/database.js';
import { getSubtreeAreaIds } from '../utils/hierarchy.js';
import { canAccessProject, canAccessTask } from '../security/accessControl.js';
import { awardXP } from '../utils/gamificationEngine.js';
import { triggerPortalSync } from '../utils/portalWebhook.js';

const safeParseJSON = (data: any) => {
  if (!data) return [];
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed === 'string') {
        return JSON.parse(parsed);
      }
      return parsed;
    } catch (e) {
      return [];
    }
  }
  return data;
};

// Get all tasks with members and tags
export const getAllTasks = async (req: Request, res: Response) => {
  try {
    // req.user injetado pelo authMiddleware
    const { id: userId, area_id: areaId, role } = req.user;

    let tasksResult;
    if (role === 'admin') {
      tasksResult = await query(`
        SELECT t.*,
               json_agg(DISTINCT tm.user_id) FILTER (WHERE tm.user_id IS NOT NULL) as member_ids,
               json_agg(DISTINCT tt.tag_id) FILTER (WHERE tt.tag_id IS NOT NULL) as tag_ids, t.client_id, t.demandante_area_id,
               p.name as project_name, (SELECT COUNT(*) FROM comments c WHERE c.entity_id = t.id AND c.entity_type = 'task') as comments_count
        FROM tasks t
        LEFT JOIN task_members tm ON t.id = tm.task_id
        LEFT JOIN task_tags tt ON t.id = tt.task_id
        LEFT JOIN projects p ON t.project_id = p.id
        GROUP BY t.id, p.name
        ORDER BY t.deadline ASC
      `);
    } else {
      const allowedAreas = role === 'manager' ? await getSubtreeAreaIds(areaId) : [];
      tasksResult = await query(`
        SELECT t.*,
               json_agg(DISTINCT tm.user_id) FILTER (WHERE tm.user_id IS NOT NULL) as member_ids,
               json_agg(DISTINCT tt.tag_id) FILTER (WHERE tt.tag_id IS NOT NULL) as tag_ids, t.client_id, t.demandante_area_id,
               p.name as project_name, (SELECT COUNT(*) FROM comments c WHERE c.entity_id = t.id AND c.entity_type = 'task') as comments_count
        FROM tasks t
        LEFT JOIN task_members tm ON t.id = tm.task_id
        LEFT JOIN task_tags tt ON t.id = tt.task_id
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE (
            t.area_id = ANY($1)
            OR t.id IN (SELECT task_id FROM task_members WHERE user_id = $2)
            OR t.owner_id = $2
            OR t.owner_id IN (SELECT id FROM users WHERE area_id = ANY($1))
            OR t.id IN (
              SELECT tm_area.task_id
              FROM task_members tm_area
              JOIN users member_user ON member_user.id = tm_area.user_id
              WHERE member_user.area_id = ANY($1)
            )
          )
          AND (p.id IS NULL OR p.private = false OR p.creator_id = $2)
        GROUP BY t.id, p.name
        ORDER BY t.deadline ASC
      `, [allowedAreas, userId]);
    }
    
    // Transform to camelCase
    const tasks = tasksResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      ownerId: row.owner_id,
      memberIds: row.member_ids || [],
      startDate: row.start_date,
      deadline: row.deadline,
      progress: row.progress,
      status: row.status,
      areaId: row.area_id,
      tagIds: row.tag_ids || [],
      subtasks: safeParseJSON(row.subtasks),
      projectId: row.project_id,
      projectName: row.project_name || null,
      flowStep: row.flow_step,
      priority: row.priority,
      hours: row.hours,
      notes: row.notes,
      timeLogs: safeParseJSON(row.time_logs),
      taskType: row.task_type || 'activity',
      client: row.client_id,
      demandanteAreaId: row.demandante_area_id,
      archived: row.archived || false,
      publicarPortal: row.publicar_portal || false,
      commentsCount: parseInt(row.comments_count) || 0
    }));
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// Get task by ID
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!await canAccessTask(req.user, id, 'read')) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta tarefa.' });
    }
    
    const result = await query(`
      SELECT t.*,
             json_agg(DISTINCT tm.user_id) FILTER (WHERE tm.user_id IS NOT NULL) as member_ids,
             json_agg(DISTINCT tt.tag_id) FILTER (WHERE tt.tag_id IS NOT NULL) as tag_ids, t.client_id, t.demandante_area_id
      FROM tasks t
      LEFT JOIN task_members tm ON t.id = tm.task_id
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const row = result.rows[0];
    const task = {
      id: row.id,
      title: row.title,
      description: row.description,
      ownerId: row.owner_id,
      memberIds: row.member_ids || [],
      startDate: row.start_date,
      deadline: row.deadline,
      progress: row.progress,
      status: row.status,
      areaId: row.area_id,
      tagIds: row.tag_ids || [],
      subtasks: safeParseJSON(row.subtasks),
      projectId: row.project_id,
      flowStep: row.flow_step,
      priority: row.priority,
      hours: row.hours,
      notes: row.notes,
      timeLogs: safeParseJSON(row.time_logs),
      taskType: row.task_type || 'activity',
      client: row.client_id,
      demandanteAreaId: row.demandante_area_id,
      archived: row.archived || false,
      publicarPortal: row.publicar_portal || false
    };
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

// Create new task
export const createTask = async (req: Request, res: Response) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { id, title, description, ownerId, memberIds, startDate, deadline, progress, status, areaId, tagIds, subtasks, projectId, flowStep, priority, hours, notes, timeLogs, taskType, client: clientId, demandanteAreaId, publicarPortal } = req.body;
    if (!id || typeof title !== 'string' || !title.trim() || title.length > 300 || !ownerId || !areaId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Dados da tarefa inválidos.' });
    }
    if (req.user.role === 'member' && (ownerId !== req.user.id || areaId !== req.user.area_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Colaboradores só podem criar tarefas próprias em sua área.' });
    }
    if (req.user.role === 'manager' && !(await getSubtreeAreaIds(req.user.area_id)).includes(areaId)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'A tarefa deve pertencer à área gerenciada.' });
    }
    if (projectId && !await canAccessProject(req.user, projectId, 'write')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Sem permissão para incluir tarefas neste projeto.' });
    }
    
    // Validar se o usuário tem a permissão de publicação
    const userRes = await client.query('SELECT pode_publicar FROM users WHERE id = $1', [req.user.id]);
    const userPodePublicar = userRes.rows[0]?.pode_publicar === true;
    const canPublish = req.user.role === 'admin' || userPodePublicar;
    const finalPublicarPortal = canPublish ? Boolean(publicarPortal) : false;

    // Insert task
    const taskResult = await client.query(
      'INSERT INTO tasks (id, title, description, owner_id, start_date, deadline, progress, status, area_id, subtasks, project_id, flow_step, priority, hours, notes, time_logs, task_type, client_id, demandante_area_id, publicar_portal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *',
      [id, title, description, ownerId, startDate, deadline, progress || 0, status, areaId, JSON.stringify(subtasks || []), projectId || null, flowStep || null, priority || 'Média', hours || null, notes || null, JSON.stringify(timeLogs || []), taskType || 'activity', clientId || null, demandanteAreaId || null, finalPublicarPortal]
    );
    
    // Insert members
    if (memberIds && memberIds.length > 0) {
      for (const memberId of memberIds) {
        await client.query(
          'INSERT INTO task_members (task_id, user_id) VALUES ($1, $2)',
          [id, memberId]
        );
      }
    }
    
    // Insert tags
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await client.query(
          'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)',
          [id, tagId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    const row = taskResult.rows[0];
    const task = {
      id: row.id,
      title: row.title,
      description: row.description,
      ownerId: row.owner_id,
      memberIds: memberIds || [],
      startDate: row.start_date,
      deadline: row.deadline,
      progress: row.progress,
      status: row.status,
      areaId: row.area_id,
      tagIds: tagIds || [],
      subtasks: safeParseJSON(row.subtasks),
      projectId: row.project_id,
      flowStep: row.flow_step,
      priority: row.priority,
      hours: row.hours,
      notes: row.notes,
      timeLogs: safeParseJSON(row.time_logs),
      taskType: row.task_type || 'activity',
      client: row.client_id,
      demandanteAreaId: row.demandante_area_id,
      archived: row.archived || false,
      publicarPortal: row.publicar_portal || false
    };

    if (finalPublicarPortal) {
      triggerPortalSync();
    }
    
    res.status(201).json(task);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  } finally {
    client.release();
  }
};

// Update task
export const updateTask = async (req: Request, res: Response) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    if (!await canAccessTask(req.user, id, 'write')) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Sem permissão para alterar esta tarefa.' });
    }
    const { title, description, ownerId, memberIds, startDate, deadline, progress, status, areaId, tagIds, subtasks, projectId, flowStep, priority, hours, notes, timeLogs, taskType, client: clientId, demandanteAreaId, archived, publicarPortal } = req.body;
    
    // Obter o estado antigo para comparar se a tarefa foi concluída
    const oldTaskRes = await client.query('SELECT status, progress, deadline, owner_id, publicar_portal FROM tasks WHERE id = $1 FOR UPDATE', [id]);
    if (oldTaskRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }
    const oldTask = oldTaskRes.rows[0];
    const currentPublicarPortal = oldTask.publicar_portal;

    // Travamento de segurança para permissão de publicação
    const userRes = await client.query('SELECT pode_publicar FROM users WHERE id = $1', [req.user.id]);
    const userPodePublicar = userRes.rows[0]?.pode_publicar === true;
    const canPublish = req.user.role === 'admin' || userPodePublicar;
    let finalPublicarPortal = currentPublicarPortal;
    if (publicarPortal !== undefined) {
      finalPublicarPortal = canPublish ? Boolean(publicarPortal) : currentPublicarPortal;
    }
    
    // Update task
    const taskResult = await client.query(
      'UPDATE tasks SET title = $1, description = $2, owner_id = $3, start_date = $4, deadline = $5, progress = $6, status = $7, area_id = $8, subtasks = $9, project_id = $10, flow_step = $11, priority = $12, hours = $13, notes = $14, time_logs = $15, task_type = $16, client_id = $17, demandante_area_id = $18, archived = $19, publicar_portal = $20, updated_at = CURRENT_TIMESTAMP WHERE id = $21 RETURNING *',
      [title, description, ownerId, startDate, deadline, progress, status, areaId, JSON.stringify(subtasks || []), projectId || null, flowStep || null, priority || 'Média', hours || null, notes || null, JSON.stringify(timeLogs || []), taskType || 'activity', clientId || null, demandanteAreaId || null, archived || false, finalPublicarPortal, id]
    );
    
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Delete existing members and tags
    await client.query('DELETE FROM task_members WHERE task_id = $1', [id]);
    await client.query('DELETE FROM task_tags WHERE task_id = $1', [id]);
    
    // Insert new members
    if (memberIds && memberIds.length > 0) {
      for (const memberId of memberIds) {
        await client.query(
          'INSERT INTO task_members (task_id, user_id) VALUES ($1, $2)',
          [id, memberId]
        );
      }
    }
    
    // Insert new tags
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await client.query(
          'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)',
          [id, tagId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    const row = taskResult.rows[0];
    const task = {
      id: row.id,
      title: row.title,
      description: row.description,
      ownerId: row.owner_id,
      memberIds: memberIds || [],
      startDate: row.start_date,
      deadline: row.deadline,
      progress: row.progress,
      status: row.status,
      areaId: row.area_id,
      tagIds: tagIds || [],
      subtasks: safeParseJSON(row.subtasks),
      projectId: row.project_id,
      flowStep: row.flow_step,
      priority: row.priority,
      hours: row.hours,
      notes: row.notes,
      timeLogs: safeParseJSON(row.time_logs),
      taskType: row.task_type || 'activity',
      client: row.client_id,
      demandanteAreaId: row.demandante_area_id,
      archived: row.archived || false,
      publicarPortal: row.publicar_portal || false
    };

    // Verificar se a tarefa mudou para concluída para acionar o motor de gamificação
    const isNowCompleted = (row.status === 'done' || row.progress === 100) && 
                           (oldTask.status !== 'done' && oldTask.progress < 100);
    
    let gamificationResults = [];
    if (isNowCompleted) {
      // Dono da tarefa ganha XP
      if (row.owner_id) {
        try {
          const ownerXp = await awardXP(row.owner_id, 'task_completed', {
            deadline: row.deadline,
            completedDate: new Date().toISOString().split('T')[0]
          });
          gamificationResults.push({ userId: row.owner_id, role: 'owner', ...ownerXp });
        } catch (gErr) {
          console.error('Erro ao processar XP do dono na conclusão da tarefa:', gErr);
        }
      }
      
      // Membros da tarefa ganham XP
      if (memberIds && memberIds.length > 0) {
        for (const memberId of memberIds) {
          if (memberId !== row.owner_id) { // Evita conceder XP duplo se o dono for também membro
            try {
              const memberXp = await awardXP(memberId, 'task_completed', {
                deadline: row.deadline,
                completedDate: new Date().toISOString().split('T')[0]
              });
              gamificationResults.push({ userId: memberId, role: 'member', ...memberXp });
            } catch (gErr) {
              console.error('Erro ao processar XP de membro na conclusão da tarefa:', gErr);
            }
          }
        }
      }
    }

    if (publicarPortal !== undefined && (publicarPortal || currentPublicarPortal)) {
      triggerPortalSync();
    }
    
    res.json({
      ...task,
      gamification: gamificationResults.length > 0 ? gamificationResults : null
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  } finally {
    client.release();
  }
};

// Delete task
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!await canAccessTask(req.user, id, 'delete')) {
      return res.status(403).json({ error: 'Sem permissão para excluir esta tarefa.' });
    }
    
    const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
