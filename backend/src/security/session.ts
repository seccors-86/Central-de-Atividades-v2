import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/security.js';

export const createSessionToken = (user: any, extra: Record<string, unknown> = {}, expiresIn: string = '8h') =>
  jwt.sign(
    { id: user.id, area_id: user.area_id, role: user.role, pode_publicar: user.pode_publicar, token_version: user.token_version || 0, ...extra },
    getJwtSecret(),
    { expiresIn: expiresIn as any, issuer: 'nuvyo-api', audience: 'nuvyo-web' }
  );

export const setSessionCookie = (res: Response, token: string, maxAge = 8 * 60 * 60 * 1000) => {
  res.cookie('nuvyo_session', token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge, path: '/'
  });
};

export const setMfaChallengeCookie = (res: Response, token: string) => {
  res.cookie('nuvyo_mfa_challenge', token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 5 * 60 * 1000, path: '/api/auth/mfa'
  });
};

export const clearMfaChallengeCookie = (res: Response) => {
  res.clearCookie('nuvyo_mfa_challenge', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/mfa' });
};
