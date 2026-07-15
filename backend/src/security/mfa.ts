import crypto from 'crypto';
import { authenticator } from 'otplib';

authenticator.options = { step: 30, window: 1 };

const getEncryptionKey = () => {
  const raw = process.env.MFA_ENCRYPTION_KEY || '';
  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.alloc(0);
  if (key.length !== 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('MFA_ENCRYPTION_KEY deve conter 64 caracteres hexadecimais.');
    return crypto.createHash('sha256').update('development-only-mfa-key').digest();
  }
  return key;
};

export const encryptMfaSecret = (secret: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString('base64url')).join('.');
};

export const decryptMfaSecret = (payload: string) => {
  const [iv, tag, encrypted] = payload.split('.').map(value => Buffer.from(value, 'base64url'));
  if (!iv || !tag || !encrypted) throw new Error('Segredo MFA inválido.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

export const generateMfaSecret = () => authenticator.generateSecret();
export const verifyTotp = (token: string, secret: string) => /^\d{6}$/.test(token) && authenticator.check(token, secret);
export const getTotpStep = (token: string, secret: string): number | null => {
  if (!/^\d{6}$/.test(token)) return null;
  const delta = authenticator.checkDelta(token, secret);
  return delta === null ? null : Math.floor(Date.now() / 30000) + delta;
};

export const generateRecoveryCodes = () => Array.from({ length: 10 }, () => {
  const value = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12)}`;
});

export const hashRecoveryCode = (code: string) => crypto
  .createHmac('sha256', getEncryptionKey())
  .update(code.replace(/[^a-f0-9]/gi, '').toUpperCase())
  .digest('hex');

export const buildOtpAuthUrl = (secret: string, accountName: string) =>
  authenticator.keyuri(accountName, 'NUVYO - Gestão Inteligente', secret);
