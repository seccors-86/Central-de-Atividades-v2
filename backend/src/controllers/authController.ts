import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import crypto from 'crypto';
import { recordSecurityEvent } from '../security/audit.js';
import { createSessionToken, setMfaChallengeCookie, setSessionCookie } from '../security/session.js';

const DUMMY_PASSWORD_HASH = '$2b$12$pgZLlqnYs2eplwT256sWtugxEq5MxIXokrlAQnWVOyJn68wd6S70S';

export const login = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;

    if (!login || !password || typeof login !== 'string' || typeof password !== 'string' || login.length > 50 || password.length > 200) {
      return res.status(400).json({ error: 'Login e senha são obrigatórios.' });
    }

    // Busca usuário por CPF ou Phone
    const normalizedLogin = login.trim();
    const identifierHash = crypto.createHash('sha256').update(normalizedLogin).digest('hex').slice(0, 16);
    const result = await pool.query(
      'SELECT * FROM users WHERE cpf = $1 OR phone = $1',
      [normalizedLogin]
    );

    const user = result.rows[0];

    if (!user) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      void recordSecurityEvent(req, 'login_failed', 401, { identifier_hash: identifierHash });
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      void recordSecurityEvent(req, 'login_blocked', 429, { user_id: user.id });
      return res.status(429).json({ error: 'Conta temporariamente bloqueada. Tente novamente mais tarde.' });
    }

    // Verifica senha
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      const failedAttempts = Number(user.failed_login_attempts || 0) + 1;
      await pool.query(
        `UPDATE users SET failed_login_attempts = $1,
          locked_until = CASE WHEN $1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END
         WHERE id = $2`,
        [failedAttempts >= 5 ? 0 : failedAttempts, user.id]
      );
      void recordSecurityEvent(req, 'login_failed', 401, { user_id: user.id });
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1', [user.id]);
    req.user = { id: user.id, role: user.role, area_id: user.area_id };
    void recordSecurityEvent(req, 'login_succeeded', 200);

    const userWithoutPassword = {
      id: user.id, name: user.name, role: user.role, area_id: user.area_id,
      cpf: user.cpf, phone: user.phone, avatar_url: user.avatar_url,
      available_hours: user.available_hours, pode_publicar: user.pode_publicar,
      mfa_enabled: user.mfa_enabled === true
    };

    const setting = await pool.query("SELECT value FROM system_settings WHERE key = 'mfa_required'");
    const mfaRequired = setting.rows[0]?.value === true;
    if (mfaRequired && user.mfa_enabled) {
      setMfaChallengeCookie(res, createSessionToken(user, { mfa_challenge: true }, '5m'));
      return res.json({ mfaRequired: true });
    }
    if (mfaRequired && !user.mfa_enabled) {
      setSessionCookie(res, createSessionToken(user, { mfa_pending: true }, '10m'), 10 * 60 * 1000);
      return res.json({ mfaSetupRequired: true, user: userWithoutPassword });
    }

    setSessionCookie(res, createSessionToken(user));
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const recover = async (req: Request, res: Response) => {
  // Recuperação automática foi desativada: redefinir para CPF/telefone permitia
  // tomada de conta por qualquer pessoa que conhecesse um desses identificadores.
  res.status(503).json({
    error: 'Recuperação automática indisponível. Contate um administrador.'
  });
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('nuvyo_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  res.clearCookie('nuvyo_mfa_challenge', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/mfa' });
  void recordSecurityEvent(req, 'logout', 204);
  res.status(204).send();
};
