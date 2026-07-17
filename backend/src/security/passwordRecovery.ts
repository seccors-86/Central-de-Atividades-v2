import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pool from '../config/database.js';
import { getJwtSecret } from '../config/security.js';

export const ensurePasswordRecoverySchema = async () => {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(320)');
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
    ON users (LOWER(email)) WHERE email IS NOT NULL
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id UUID PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash CHAR(64) NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user ON password_reset_codes(user_id, created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expiry ON password_reset_codes(expires_at) WHERE consumed_at IS NULL');
};

export const ensureProjectKpiSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_kpi_links (
      project_id VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      kpi_id TEXT NOT NULL REFERENCES project_kpis(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (project_id, kpi_id)
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_project_kpi_links_kpi ON project_kpi_links(kpi_id)');
};

const getResetPepper = () => process.env.MFA_ENCRYPTION_KEY || getJwtSecret();

export const hashPasswordResetCode = (userId: string, code: string) =>
  crypto.createHmac('sha256', getResetPepper()).update(`${userId}:${code}`).digest('hex');

export const secureCodeEquals = (expectedHex: string, actualHex: string) => {
  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = Buffer.from(actualHex, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
};

export const isPasswordRecoveryConfigured = () =>
  Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());

export const sendPasswordResetCode = async (email: string, code: string) => {
  if (!isPasswordRecoveryConfigured()) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true';
  const requireTLS = process.env.SMTP_REQUIRE_TLS !== 'false';
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS,
    auth: user && password ? { user, pass: password } : undefined,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Código de recuperação de senha — NUVYO',
    text: `Seu código de recuperação da NUVYO é ${code}. Ele expira em 10 minutos. Se você não solicitou esta troca, ignore esta mensagem.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0E1116">
        <h2 style="color:#374A67">Recuperação de senha — NUVYO</h2>
        <p>Use o código abaixo para criar uma nova senha:</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#E6FAFC;padding:18px;text-align:center;border-radius:12px">${code}</div>
        <p>O código expira em <strong>10 minutos</strong> e pode ser usado uma única vez.</p>
        <p style="color:#6b7280;font-size:13px">Se você não solicitou esta troca, ignore esta mensagem. Sua senha atual continuará válida.</p>
      </div>
    `
  });
};
