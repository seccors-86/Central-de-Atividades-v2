import { Router } from 'express';
import pool from '../config/database.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const result = await pool.query(
      `SELECT id, user_id, event_type, method, path, status_code, ip_address, user_agent, metadata, created_at
         FROM security_audit_events ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Erro ao consultar eventos de segurança.' });
  }
});

export default router;
