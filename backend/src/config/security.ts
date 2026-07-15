import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (isProduction) {
      throw new Error('JWT_SECRET deve ser configurado com pelo menos 32 caracteres.');
    }
    return 'development-only-secret-change-me-32chars';
  }
  return secret;
};

export const getAllowedOrigins = (): string[] => {
  const configured = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
  return configured.split(',').map(origin => origin.trim()).filter(Boolean);
};
