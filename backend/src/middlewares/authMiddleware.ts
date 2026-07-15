import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/security.js';
import pool from '../config/database.js';

const JWT_SECRET = getJwtSecret();

// Estende o tipo Request do Express para incluir o user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const cookieToken = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('nuvyo_session='))?.split('=').slice(1).join('=');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, { issuer: 'nuvyo-api', audience: 'nuvyo-web' }, async (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
    
    try {
      const current = await pool.query('SELECT role, area_id, pode_publicar, token_version FROM users WHERE id = $1', [user.id]);
      if (!current.rows[0] || Number(current.rows[0].token_version || 0) !== Number(user.token_version || 0)) {
        return res.status(403).json({ error: 'Sessão revogada.' });
      }
      req.user = { ...user, role: current.rows[0].role, area_id: current.rows[0].area_id, pode_publicar: current.rows[0].pode_publicar };
      if (user.mfa_pending && !req.originalUrl.startsWith('/api/mfa/')) {
        return res.status(403).json({ error: 'Cadastro do MFA obrigatório.', code: 'MFA_SETUP_REQUIRED' });
      }
      next();
    } catch {
      return res.status(503).json({ error: 'Serviço temporariamente indisponível.' });
    }
  });
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores possuem acesso a esta funcionalidade.' });
  }
  next();
};

export const requireManagerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso negado. Permissão de gestor necessária.' });
  }
  next();
};
