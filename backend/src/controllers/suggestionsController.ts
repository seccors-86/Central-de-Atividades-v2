import { Request, Response } from 'express';
import pool from '../config/database.js';
import crypto from 'crypto';

export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.*, 
        u.name as user_name, 
        u.avatar_url as user_avatar,
        (SELECT COUNT(*) FROM suggestion_votes v WHERE v.suggestion_id = s.id) as votes,
        COALESCE((
          SELECT json_agg(v.user_id) 
          FROM suggestion_votes v 
          WHERE v.suggestion_id = s.id
        ), '[]'::json) as voted_by
      FROM suggestions s
      JOIN users u ON s.user_id = u.id
      ORDER BY votes DESC, s.created_at DESC
    `);
    
    // Formata o retorno
    const suggestions = result.rows.map(row => ({
      ...row,
      votes: parseInt(row.votes, 10)
    }));
    
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSuggestion = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const user_id = req.user?.id;
    if (!user_id || typeof title !== 'string' || !title.trim() || title.length > 200 ||
        typeof description !== 'string' || !description.trim() || description.length > 10000) {
      return res.status(400).json({ error: 'Sugestão inválida.' });
    }
    const id = crypto.randomUUID();
    
    const result = await pool.query(`
      INSERT INTO suggestions (id, user_id, title, description, status)
      VALUES ($1, $2, $3, $4, 'Em Avaliação')
      RETURNING *
    `, [id, user_id, title, description]);
    
    const userResult = await pool.query(`SELECT name as user_name, avatar_url as user_avatar FROM users WHERE id = $1`, [user_id]);
    
    res.status(201).json({
      ...result.rows[0],
      ...userResult.rows[0],
      votes: 0,
      voted_by: []
    });
  } catch (error) {
    console.error('Error creating suggestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSuggestionStatus = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Apenas administradores podem alterar o status.' });
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['Em Avaliação', 'Em Desenvolvimento', 'Lançado', 'Recusado'];
    if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Status inválido.' });
    
    const result = await pool.query(`
      UPDATE suggestions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating suggestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleVote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Não autenticado.' });
    
    // Check if vote exists
    const checkResult = await pool.query('SELECT * FROM suggestion_votes WHERE suggestion_id = $1 AND user_id = $2', [id, user_id]);
    
    if (checkResult.rows.length > 0) {
      // Remove vote
      await pool.query('DELETE FROM suggestion_votes WHERE suggestion_id = $1 AND user_id = $2', [id, user_id]);
      res.json({ action: 'removed' });
    } else {
      // Add vote
      await pool.query('INSERT INTO suggestion_votes (suggestion_id, user_id) VALUES ($1, $2)', [id, user_id]);
      res.json({ action: 'added' });
    }
  } catch (error) {
    console.error('Error toggling vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSuggestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const user = (req as any).user;
    
    // Check ownership or admin
    const checkResult = await pool.query('SELECT user_id FROM suggestions WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Sugestão não encontrada' });
    
    const ownerId = checkResult.rows[0].user_id;
    if (ownerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Sem permissão para editar' });
    }

    const result = await pool.query(`
      UPDATE suggestions 
      SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [title, description, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating suggestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSuggestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    // Check ownership or admin
    const checkResult = await pool.query('SELECT user_id FROM suggestions WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Sugestão não encontrada' });
    
    const ownerId = checkResult.rows[0].user_id;
    if (ownerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Sem permissão para excluir' });
    }

    // Votos são excluídos em cascata via chave estrangeira no DB, se não, excluímos manual:
    await pool.query('DELETE FROM suggestion_votes WHERE suggestion_id = $1', [id]);
    await pool.query('DELETE FROM suggestions WHERE id = $1', [id]);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting suggestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSuggestionVoters = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.avatar_url as photo, a.name as area_name
      FROM suggestion_votes sv
      JOIN users u ON sv.user_id = u.id
      LEFT JOIN areas a ON u.area_id = a.id
      WHERE sv.suggestion_id = $1
      ORDER BY u.name ASC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching suggestion voters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
