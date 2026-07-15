import crypto from 'crypto';
import type { Request } from 'express';
import pool from '../config/database.js';

export const ensureSecurityAuditTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS security_audit_events (
      id UUID PRIMARY KEY,
      user_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      method TEXT NULL,
      path TEXT NULL,
      status_code INTEGER NULL,
      ip_address TEXT NULL,
      user_agent TEXT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit_events(created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_events(user_id)');
};

export const recordSecurityEvent = async (
  req: Request,
  eventType: string,
  statusCode?: number,
  metadata: Record<string, unknown> = {}
) => {
  try {
    await pool.query(
      `INSERT INTO security_audit_events
       (id, user_id, event_type, method, path, status_code, ip_address, user_agent, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [
        crypto.randomUUID(), req.user?.id || null, eventType, req.method, req.path,
        statusCode || null, req.ip || null, String(req.headers['user-agent'] || '').slice(0, 500) || null,
        JSON.stringify(metadata)
      ]
    );
  } catch (error) {
    console.error('Falha ao registrar evento de segurança:', error);
  }
};
