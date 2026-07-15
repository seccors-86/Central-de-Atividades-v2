import { Request, Response } from 'express';
import pool from '../config/database.js';
import { randomBytes } from 'crypto';
import { awardXP } from '../utils/gamificationEngine.js';
import { getSubtreeAreaIds, getRootAreaId } from '../utils/hierarchy.js';
import { canAccessSupportTicket } from '../security/accessControl.js';

const genId = () => randomBytes(4).toString('hex').toUpperCase();

export const getSupportTickets = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, queue, responsible, search, page = '1', limit = '100' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `SELECT st.*, a.name as area_name
      FROM support_tickets st
      LEFT JOIN areas a ON a.id = st.area_id`;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (user.role !== 'admin') {
      if (user.role === 'manager') {
        conditions.push(`st.area_id = ANY($${idx})`);
        params.push(await getSubtreeAreaIds(user.area_id));
        idx++;
      } else {
        conditions.push(`(st.creator_id = $${idx} OR st.responsible_id = $${idx})`);
        params.push(user.id);
        idx++;
      }
    }

    if (status) {
      conditions.push(`st.status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (queue) {
      conditions.push(`st.queue = $${idx}`);
      params.push(queue);
      idx++;
    }
    if (responsible) {
      conditions.push(`st.responsible ILIKE $${idx}`);
      params.push(`%${responsible}%`);
      idx++;
    }
    if (search) {
      conditions.push(`(st.title ILIKE $${idx} OR st.demand_description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY st.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getSupportTickets error:', err);
    res.status(500).json({ error: 'Erro ao buscar tickets.' });
  }
};

export const createSupportTicket = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      title, queue, category, priority, responsible, responsible_id,
      requesting_area, demand_description, details, time_spent, outcome, attachments
    } = req.body;

    if (!title || !queue) {
      return res.status(400).json({ error: 'Título e fila são obrigatórios.' });
    }

    const count = await pool.query('SELECT COUNT(*) FROM support_tickets');
    const num = String(parseInt(count.rows[0].count) + 1).padStart(3, '0');
    const id = `SUP-${num}`;

    const result = await pool.query(
      `INSERT INTO support_tickets
        (id, title, queue, category, status, priority, responsible, responsible_id,
         requesting_area, demand_description, details, time_spent, outcome, attachments, creator_id, area_id)
       VALUES ($1,$2,$3,$4,'A fazer',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        id, title, queue, category || 'Dúvida', priority || 'Média',
        responsible || '', responsible_id || null, requesting_area || '',
        demand_description || '', details || '', time_spent || '',
        outcome || null, JSON.stringify(attachments || []), user.id, user.area_id
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createSupportTicket error:', err);
    res.status(500).json({ error: 'Erro ao criar ticket.' });
  }
};

export const updateSupportTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!await canAccessSupportTicket(req.user, id, 'write')) {
      return res.status(403).json({ error: 'Sem permissão para alterar este chamado.' });
    }
    const {
      title, queue, category, status, priority, responsible, responsible_id,
      requesting_area, demand_description, details, time_spent, outcome, attachments
    } = req.body;

    // Obter o estado antigo do ticket para verificar a conclusão
    const oldTicketRes = await pool.query('SELECT status, responsible_id FROM support_tickets WHERE id = $1', [id]);
    if (oldTicketRes.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }
    const oldTicket = oldTicketRes.rows[0];

    // Timestamps automáticos por status
    const isStarting = status === 'Em andamento';
    const isFinished = status === 'Concluído';

    const result = await pool.query(
      `UPDATE support_tickets SET
        title = COALESCE($1, title),
        queue = COALESCE($2, queue),
        category = COALESCE($3, category),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        responsible = COALESCE($6, responsible),
        responsible_id = COALESCE($7, responsible_id),
        requesting_area = COALESCE($8, requesting_area),
        demand_description = COALESCE($9, demand_description),
        details = COALESCE($10, details),
        time_spent = COALESCE($11, time_spent),
        outcome = COALESCE($12, outcome),
        attachments = COALESCE($13::jsonb, attachments),
        in_progress_at = CASE WHEN $14::boolean THEN NOW() ELSE in_progress_at END,
        completed_at = CASE WHEN $15::boolean THEN NOW() ELSE completed_at END
       WHERE id = $16 RETURNING *`,
      [
        title, queue, category, status, priority, responsible, responsible_id,
        requesting_area, demand_description, details, time_spent, outcome,
        attachments ? JSON.stringify(attachments) : null,
        isStarting, isFinished, id
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket não encontrado.' });
    
    const updatedTicket = result.rows[0];
    const isNowCompleted = updatedTicket.status === 'Concluído' && oldTicket.status !== 'Concluído';
    
    let gamificationResult = null;
    if (isNowCompleted && updatedTicket.responsible_id) {
      try {
        gamificationResult = await awardXP(updatedTicket.responsible_id, 'support_resolved', {
          onTime: true
        });
      } catch (gErr) {
        console.error('Erro ao conceder XP para chamado de suporte resolvido:', gErr);
      }
    }

    res.json({
      ...updatedTicket,
      gamification: gamificationResult
    });
  } catch (err) {
    console.error('updateSupportTicket error:', err);
    res.status(500).json({ error: 'Erro ao atualizar ticket.' });
  }
};

export const deleteSupportTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!await canAccessSupportTicket(req.user, id, 'delete')) {
      return res.status(403).json({ error: 'Sem permissão para excluir este chamado.' });
    }
    await pool.query('DELETE FROM support_tickets WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir ticket.' });
  }
};

export const getSupportStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let whereClause = '';
    const params: any[] = [];
    if (user.role !== 'admin') {
      if (user.role === 'manager') {
        whereClause = 'WHERE area_id = ANY($1)';
        params.push(await getSubtreeAreaIds(user.area_id));
      } else {
        whereClause = 'WHERE creator_id = $1 OR responsible_id = $1';
        params.push(user.id);
      }
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'A fazer') AS todo_count,
        COUNT(*) FILTER (WHERE status = 'Em andamento') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'Validação') AS validation_count,
        COUNT(*) FILTER (WHERE status = 'Concluído') AS done_count,
        COUNT(*) FILTER (WHERE priority = 'Urgente' AND status != 'Concluído') AS urgent_count,
        AVG(EXTRACT(EPOCH FROM (completed_at - in_progress_at))/3600)
          FILTER (WHERE status = 'Concluído' AND in_progress_at IS NOT NULL) AS avg_resolution_hours
      FROM support_tickets
      ${whereClause}
    `, params);

    const byQueue = await pool.query(`
      SELECT queue, COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'Concluído') as resolved
      FROM support_tickets
      ${whereClause}
      GROUP BY queue ORDER BY total DESC
    `, params);

    const byCategory = await pool.query(`
      SELECT category, COUNT(*) as total
      FROM support_tickets
      ${whereClause}
      GROUP BY category ORDER BY total DESC
    `, params);

    res.json({
      ...result.rows[0],
      by_queue: byQueue.rows,
      by_category: byCategory.rows,
    });
  } catch (err) {
    console.error('getSupportStats error:', err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
};
