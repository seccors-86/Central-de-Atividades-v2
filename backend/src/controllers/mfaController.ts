import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import pool from '../config/database.js';
import { getJwtSecret } from '../config/security.js';
import { recordSecurityEvent } from '../security/audit.js';
import { buildOtpAuthUrl, decryptMfaSecret, encryptMfaSecret, generateMfaSecret, generateRecoveryCodes, getTotpStep, hashRecoveryCode, verifyTotp } from '../security/mfa.js';
import { clearMfaChallengeCookie, createSessionToken, setSessionCookie } from '../security/session.js';

const publicUser = (user: any) => ({
  id: user.id, name: user.name, role: user.role, area_id: user.area_id, cpf: user.cpf,
  phone: user.phone, avatar_url: user.avatar_url, available_hours: user.available_hours,
  pode_publicar: user.pode_publicar, mfa_enabled: user.mfa_enabled
});

export const getMfaConfig = async (req: Request, res: Response) => {
  const setting = await pool.query("SELECT value FROM system_settings WHERE key = 'mfa_required'");
  const user = await pool.query('SELECT mfa_enabled FROM users WHERE id = $1', [req.user.id]);
  res.json({ required: setting.rows[0]?.value === true, userEnabled: user.rows[0]?.mfa_enabled === true });
};

export const setMfaRequired = async (req: Request, res: Response) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'Valor inválido.' });
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_by) VALUES ('mfa_required', $1::jsonb, $2)
     ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_by = $2, updated_at = NOW()`,
    [JSON.stringify(enabled), req.user.id]
  );
  await pool.query('UPDATE users SET token_version = token_version + 1');
  void recordSecurityEvent(req, enabled ? 'mfa_required_enabled' : 'mfa_required_disabled', 200);
  res.json({ required: enabled, sessionsRevoked: true });
};

export const beginMfaSetup = async (req: Request, res: Response) => {
  const userResult = await pool.query('SELECT id, name, cpf, phone FROM users WHERE id = $1', [req.user.id]);
  if (!userResult.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const secret = generateMfaSecret();
  await pool.query('UPDATE users SET mfa_secret_encrypted = $1, mfa_enabled = false, mfa_recovery_hashes = $2::jsonb, mfa_last_used_step = 0 WHERE id = $3',
    [encryptMfaSecret(secret), '[]', req.user.id]);
  const account = userResult.rows[0].name || userResult.rows[0].cpf || userResult.rows[0].phone || req.user.id;
  const otpAuthUrl = buildOtpAuthUrl(secret, account);
  res.json({ qrCodeDataUrl: await QRCode.toDataURL(otpAuthUrl), manualKey: secret });
};

export const confirmMfaSetup = async (req: Request, res: Response) => {
  const code = String(req.body.code || '').replace(/\s/g, '');
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];
  if (!user?.mfa_secret_encrypted || !verifyTotp(code, decryptMfaSecret(user.mfa_secret_encrypted))) {
    void recordSecurityEvent(req, 'mfa_setup_failed', 400);
    return res.status(400).json({ error: 'Código inválido.' });
  }
  const recoveryCodes = generateRecoveryCodes();
  const recoveryHashes = recoveryCodes.map(hashRecoveryCode);
  const updated = await pool.query(
    `UPDATE users SET mfa_enabled = true, mfa_enabled_at = NOW(), mfa_recovery_hashes = $1::jsonb,
       token_version = token_version + 1 WHERE id = $2 RETURNING *`,
    [JSON.stringify(recoveryHashes), user.id]
  );
  setSessionCookie(res, createSessionToken(updated.rows[0]));
  void recordSecurityEvent(req, 'mfa_enabled', 200);
  res.json({ user: publicUser(updated.rows[0]), recoveryCodes });
};

export const verifyMfaLogin = async (req: Request, res: Response) => {
  try {
    const cookie = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('nuvyo_mfa_challenge='))?.split('=').slice(1).join('=');
    if (!cookie) return res.status(401).json({ error: 'Desafio MFA expirado.' });
    const challenge: any = jwt.verify(cookie, getJwtSecret(), { issuer: 'nuvyo-api', audience: 'nuvyo-web' });
    if (!challenge.mfa_challenge) return res.status(401).json({ error: 'Desafio MFA inválido.' });
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [challenge.id]);
    const user = result.rows[0];
    if (!user?.mfa_enabled || Number(user.token_version) !== Number(challenge.token_version)) return res.status(401).json({ error: 'Desafio MFA inválido.' });
    const supplied = String(req.body.code || '');
    const totpStep = getTotpStep(supplied, decryptMfaSecret(user.mfa_secret_encrypted));
    let totpValid = totpStep !== null;
    if (totpValid) {
      const claimed = await pool.query(
        'UPDATE users SET mfa_last_used_step = $1 WHERE id = $2 AND mfa_last_used_step < $1 RETURNING id',
        [totpStep, user.id]
      );
      totpValid = claimed.rows.length === 1;
    }
    const recoveryHash = hashRecoveryCode(supplied);
    const recoveryHashes: string[] = Array.isArray(user.mfa_recovery_hashes) ? user.mfa_recovery_hashes : [];
    const recoveryIndex = recoveryHashes.indexOf(recoveryHash);
    if (!totpValid && recoveryIndex < 0) {
      req.user = { id: user.id, role: user.role, area_id: user.area_id };
      void recordSecurityEvent(req, 'mfa_login_failed', 401);
      return res.status(401).json({ error: 'Código MFA inválido.' });
    }
    if (recoveryIndex >= 0) {
      recoveryHashes.splice(recoveryIndex, 1);
      await pool.query('UPDATE users SET mfa_recovery_hashes = $1::jsonb WHERE id = $2', [JSON.stringify(recoveryHashes), user.id]);
    }
    req.user = { id: user.id, role: user.role, area_id: user.area_id };
    setSessionCookie(res, createSessionToken(user));
    clearMfaChallengeCookie(res);
    void recordSecurityEvent(req, recoveryIndex >= 0 ? 'mfa_recovery_used' : 'mfa_login_succeeded', 200);
    res.json({ user: publicUser(user) });
  } catch {
    res.status(401).json({ error: 'Desafio MFA inválido ou expirado.' });
  }
};

export const disableOwnMfa = async (req: Request, res: Response) => {
  const { password, code } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];
  if (!user || !await bcrypt.compare(String(password || ''), user.password_hash) ||
      !user.mfa_secret_encrypted || !verifyTotp(String(code || ''), decryptMfaSecret(user.mfa_secret_encrypted))) {
    return res.status(403).json({ error: 'Senha ou código inválido.' });
  }
  await pool.query(`UPDATE users SET mfa_enabled = false, mfa_secret_encrypted = NULL,
    mfa_recovery_hashes = '[]'::jsonb, mfa_enabled_at = NULL, mfa_last_used_step = 0,
    token_version = token_version + 1 WHERE id = $1`, [user.id]);
  void recordSecurityEvent(req, 'mfa_disabled', 200);
  res.clearCookie('nuvyo_session', { path: '/' });
  res.json({ disabled: true });
};

export const resetUserMfa = async (req: Request, res: Response) => {
  const result = await pool.query(`UPDATE users SET mfa_enabled = false, mfa_secret_encrypted = NULL,
    mfa_recovery_hashes = '[]'::jsonb, mfa_enabled_at = NULL, mfa_last_used_step = 0,
    token_version = token_version + 1 WHERE id = $1 RETURNING id`, [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' });
  void recordSecurityEvent(req, 'mfa_reset_by_admin', 200, { target_user_id: req.params.id });
  res.json({ reset: true });
};
