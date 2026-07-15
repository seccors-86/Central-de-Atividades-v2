import { Request, Response } from 'express';
import pool from '../config/database.js';
import crypto from 'crypto';
import { canAccessEntity } from '../security/accessControl.js';

export const getComments = async (req: Request, res: Response) => {
  try {
    const { entity_type, entity_id } = req.params;
    if (!['task', 'project'].includes(entity_type)) return res.status(400).json({ error: 'Tipo inválido.' });
    if (!await canAccessEntity(req.user, entity_type, entity_id, 'read')) {
      return res.status(403).json({ error: 'Sem permissão para acessar comentários desta entidade.' });
    }
    const result = await pool.query(`
      SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.entity_type = $1 AND c.entity_id = $2
      ORDER BY c.created_at DESC
    `, [entity_type, entity_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProjectAllComments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!await canAccessEntity(req.user, 'project', id, 'read')) {
      return res.status(403).json({ error: 'Sem permissão para acessar comentários deste projeto.' });
    }
    // Puxa comentários da entidade projeto + entidades tasks pertencentes ao projeto
    const result = await pool.query(`
      SELECT c.*, u.name as user_name, u.avatar_url as user_avatar, t.title as task_title
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN tasks t ON c.entity_type = 'task' AND c.entity_id = t.id
      WHERE (c.entity_type = 'project' AND c.entity_id = $1)
         OR (c.entity_type = 'task' AND t.project_id = $1)
      ORDER BY c.created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all project comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const { entity_type, entity_id, content } = req.body;
    const user_id = req.user?.id;
    if (!user_id || !['task', 'project'].includes(entity_type) || typeof entity_id !== 'string' ||
        typeof content !== 'string' || !content.trim() || content.length > 10000) {
      return res.status(400).json({ error: 'Comentário inválido.' });
    }
    if (!await canAccessEntity(req.user, entity_type, entity_id, 'write')) {
      return res.status(403).json({ error: 'Sem permissão para comentar nesta entidade.' });
    }
    const id = crypto.randomUUID();
    
    const result = await pool.query(`
      INSERT INTO comments (id, entity_type, entity_id, user_id, content)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, entity_type, entity_id, user_id, content]);
    
    const userResult = await pool.query(`SELECT name as user_name, avatar_url as user_avatar FROM users WHERE id = $1`, [user_id]);
    
    res.status(201).json({
      ...result.rows[0],
      ...userResult.rows[0]
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    const checkResult = await pool.query('SELECT user_id FROM comments WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Comentário não encontrado' });
    
    if (checkResult.rows[0].user_id !== user.id && user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ error: 'Sem permissão para excluir' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const user = (req as any).user;
    
    const checkResult = await pool.query('SELECT user_id FROM comments WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Comentário não encontrado' });
    
    if (checkResult.rows[0].user_id !== user.id && user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ error: 'Sem permissão para editar' });
    }

    const result = await pool.query(`
      UPDATE comments 
      SET content = $1
      WHERE id = $2
      RETURNING *
    `, [content, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
