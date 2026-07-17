import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import crypto from 'crypto';
import { recordSecurityEvent } from '../security/audit.js';
import { createSessionToken, setMfaChallengeCookie, setSessionCookie } from '../security/session.js';
import {
  hashPasswordResetCode,
  isPasswordRecoveryConfigured,
  secureCodeEquals,
  sendPasswordResetCode
} from '../security/passwordRecovery.js';

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
      email: user.email,
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

const RECOVERY_RESPONSE = 'Se os dados estiverem cadastrados, enviaremos um código para o e-mail associado.';

export const getRecoveryConfig = async (_req: Request, res: Response) => {
  res.json({ enabled: isPasswordRecoveryConfigured() });
};

export const recover = async (req: Request, res: Response) => {
  const rawLogin = typeof req.body?.login === 'string' ? req.body.login.trim() : '';
  const login = rawLogin.replace(/\D/g, '');
  const identifierHash = crypto.createHash('sha256').update(login || 'invalid').digest('hex').slice(0, 16);

  // A resposta é sempre neutra para não revelar se CPF, telefone ou e-mail existem.
  if (!/^\d{11,20}$/.test(login) || !isPasswordRecoveryConfigured()) {
    void recordSecurityEvent(req, 'password_reset_requested', 202, { identifier_hash: identifierHash, deliverable: false });
    return res.status(202).json({ message: RECOVERY_RESPONSE });
  }

  try {
    const result = await pool.query(
      `SELECT id, email FROM users
       WHERE (cpf = $1 OR phone = $1) AND email IS NOT NULL
       LIMIT 1`,
      [login]
    );
    const user = result.rows[0];
    if (!user) {
      void recordSecurityEvent(req, 'password_reset_requested', 202, { identifier_hash: identifierHash, deliverable: false });
      return res.status(202).json({ message: RECOVERY_RESPONSE });
    }

    const recent = await pool.query(
      `SELECT 1 FROM password_reset_codes
       WHERE user_id = $1 AND consumed_at IS NULL
         AND created_at > NOW() - INTERVAL '2 minutes'
       LIMIT 1`,
      [user.id]
    );
    if (recent.rows.length > 0) {
      void recordSecurityEvent(req, 'password_reset_throttled', 202, { user_id: user.id });
      return res.status(202).json({ message: RECOVERY_RESPONSE });
    }

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const id = crypto.randomUUID();
    await pool.query("DELETE FROM password_reset_codes WHERE expires_at < NOW() - INTERVAL '1 day'");
    await pool.query(
      `UPDATE password_reset_codes SET consumed_at = NOW()
       WHERE user_id = $1 AND consumed_at IS NULL`,
      [user.id]
    );
    await pool.query(
      `INSERT INTO password_reset_codes (id, user_id, code_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [id, user.id, hashPasswordResetCode(user.id, code)]
    );

    try {
      await sendPasswordResetCode(user.email, code);
      void recordSecurityEvent(req, 'password_reset_code_sent', 202, { user_id: user.id });
    } catch (deliveryError) {
      await pool.query('UPDATE password_reset_codes SET consumed_at = NOW() WHERE id = $1', [id]);
      console.error('Falha no envio do código de recuperação:', (deliveryError as Error).message);
      void recordSecurityEvent(req, 'password_reset_delivery_failed', 202, { user_id: user.id });
    }

    return res.status(202).json({ message: RECOVERY_RESPONSE });
  } catch (error) {
    console.error('Erro ao solicitar recuperação de senha:', error);
    return res.status(202).json({ message: RECOVERY_RESPONSE });
  }
};

export const resetRecoveredPassword = async (req: Request, res: Response) => {
  const login = typeof req.body?.login === 'string' ? req.body.login.replace(/\D/g, '') : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.replace(/\D/g, '') : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!/^\d{11,20}$/.test(login) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Código inválido ou expirado.' });
  }
  if (newPassword.length < 12 || newPassword.length > 200 || newPassword === login) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 12 caracteres e não pode ser igual ao login.' });
  }

  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const userResult = await db.query(
      'SELECT id FROM users WHERE cpf = $1 OR phone = $1 LIMIT 1 FOR UPDATE',
      [login]
    );
    const user = userResult.rows[0];
    if (!user) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'Código inválido ou expirado.' });
    }

    const resetResult = await db.query(
      `SELECT id, code_hash, attempts FROM password_reset_codes
       WHERE user_id = $1 AND consumed_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [user.id]
    );
    const reset = resetResult.rows[0];
    const validCode = reset && reset.attempts < 5 && secureCodeEquals(
      reset.code_hash,
      hashPasswordResetCode(user.id, code)
    );

    if (!validCode) {
      if (reset) {
        const attempts = Math.min(Number(reset.attempts) + 1, 5);
        await db.query(
          `UPDATE password_reset_codes
           SET attempts = $1, consumed_at = CASE WHEN $1 >= 5 THEN NOW() ELSE consumed_at END
           WHERE id = $2`,
          [attempts, reset.id]
        );
      }
      await db.query('COMMIT');
      req.user = { id: user.id };
      void recordSecurityEvent(req, 'password_reset_code_failed', 400);
      return res.status(400).json({ error: 'Código inválido ou expirado.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.query(
      `UPDATE users SET password_hash = $1, token_version = token_version + 1,
         failed_login_attempts = 0, locked_until = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );
    await db.query(
      'UPDATE password_reset_codes SET consumed_at = NOW() WHERE user_id = $1 AND consumed_at IS NULL',
      [user.id]
    );
    await db.query('COMMIT');

    req.user = { id: user.id };
    res.clearCookie('nuvyo_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.clearCookie('nuvyo_mfa_challenge', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/mfa' });
    void recordSecurityEvent(req, 'password_reset_succeeded', 200);
    return res.json({ message: 'Senha alterada com sucesso. Entre novamente com a nova senha.' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao concluir recuperação de senha:', error);
    return res.status(500).json({ error: 'Não foi possível alterar a senha.' });
  } finally {
    db.release();
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('nuvyo_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  res.clearCookie('nuvyo_mfa_challenge', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/mfa' });
  void recordSecurityEvent(req, 'logout', 204);
  res.status(204).send();
};
