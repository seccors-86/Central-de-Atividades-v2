import { Request, Response } from 'express';
import { query } from '../config/database.js';
import crypto from 'crypto';

export const ensureNotificationsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      link TEXT,
      read_at TIMESTAMP NULL,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type = 'info',
  link: string | null = null,
  createdBy: string | null = null
) => {
  await ensureNotificationsTable();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO notifications (id, user_id, title, message, type, link, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, userId, title, message, type, link, createdBy]
  );
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    await ensureNotificationsTable();
    const result = await query(
      `SELECT n.*, creator.name AS created_by_name
       FROM notifications n
       LEFT JOIN users creator ON creator.id = n.created_by
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [(req as any).user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    await ensureNotificationsTable();
    const result = await query(
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, (req as any).user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notificação não encontrada.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('markNotificationRead error:', error);
    res.status(500).json({ error: 'Erro ao marcar notificação.' });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    await ensureNotificationsTable();
    await query(
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND read_at IS NULL`,
      [(req as any).user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    res.status(500).json({ error: 'Erro ao marcar notificações.' });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    await ensureNotificationsTable();
    const result = await query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, (req as any).user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notificação não encontrada.' });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteNotification error:', error);
    res.status(500).json({ error: 'Erro ao excluir notificação.' });
  }
};

export const clearNotifications = async (req: Request, res: Response) => {
  try {
    await ensureNotificationsTable();
    await query('DELETE FROM notifications WHERE user_id = $1', [(req as any).user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('clearNotifications error:', error);
    res.status(500).json({ error: 'Erro ao limpar notificações.' });
  }
};

export const sendBroadcast = async (req: Request, res: Response) => {
  try {
    await ensureNotificationsTable();
    const { title, message, type = 'info', userIds } = req.body;
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios.' });
    }

    const usersResult = Array.isArray(userIds) && userIds.length > 0
      ? await query('SELECT id FROM users WHERE id = ANY($1)', [userIds])
      : await query('SELECT id FROM users');

    for (const row of usersResult.rows) {
      await createNotification(row.id, title.trim(), message.trim(), type, null, (req as any).user.id);
    }

    res.status(201).json({ sent: usersResult.rows.length });
  } catch (error) {
    console.error('sendBroadcast error:', error);
    res.status(500).json({ error: 'Erro ao enviar notificação.' });
  }
};
