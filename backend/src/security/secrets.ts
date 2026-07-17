import crypto from 'crypto';

const getMasterKey = () => {
  const raw = process.env.MFA_ENCRYPTION_KEY || '';
  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MFA_ENCRYPTION_KEY deve conter 64 caracteres hexadecimais.');
  }
  return crypto.createHash('sha256').update('development-only-secrets-key').digest();
};

const deriveKey = (purpose: string) =>
  crypto.createHmac('sha256', getMasterKey()).update(`nuvyo:${purpose}`).digest();

export const encryptApplicationSecret = (value: string, purpose: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(purpose), iv);
  cipher.setAAD(Buffer.from(purpose, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
};

export const decryptApplicationSecret = (payload: string, purpose: string) => {
  const [version, ivValue, tagValue, encryptedValue] = payload.split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) throw new Error('Segredo criptografado inválido.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(purpose), Buffer.from(ivValue, 'base64url'));
  decipher.setAAD(Buffer.from(purpose, 'utf8'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
};
