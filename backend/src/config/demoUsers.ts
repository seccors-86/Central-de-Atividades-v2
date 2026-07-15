import bcrypt from 'bcrypt';
import pool from './database.js';

const DEMO_USERS = [
  { id: 'demo-superadmin', name: 'Super Admin', role: 'admin', login: '88888888888', podePublicar: true },
  { id: 'demo-manager', name: 'Gestor', role: 'manager', login: '88888888899', podePublicar: false },
  { id: 'demo-member', name: 'Colaborador', role: 'member', login: '88888888800', podePublicar: false }
] as const;

export const provisionDemoUsers = async (): Promise<void> => {
  if (process.env.DEMO_USERS_ENABLED !== 'true') return;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DEMO_USERS_ENABLED não pode ser ativado em produção. Use apenas o docker-compose.demo.yml localmente.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO areas (id, name, parent_id)
       VALUES ('demo-area', 'Área de Demonstração', NULL)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`
    );

    for (const user of DEMO_USERS) {
      const passwordHash = await bcrypt.hash(user.login, 12);
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM users
         WHERE id = $1 OR cpf = $2 OR phone = $2
         ORDER BY CASE WHEN id = $1 THEN 0 ELSE 1 END
         LIMIT 1`,
        [user.id, user.login]
      );

      if (existing.rows[0]) {
        await client.query(
          `UPDATE users
           SET name = $1, role = $2, area_id = 'demo-area', cpf = $3, phone = NULL,
               password_hash = $4, pode_publicar = $5, token_version = token_version + 1,
               failed_login_attempts = 0, locked_until = NULL, mfa_enabled = FALSE,
               mfa_secret_encrypted = NULL, mfa_recovery_hashes = '[]'::jsonb,
               mfa_enabled_at = NULL, mfa_last_used_step = 0
           WHERE id = $6`,
          [user.name, user.role, user.login, passwordHash, user.podePublicar, existing.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO users
             (id, name, role, area_id, cpf, password_hash, avatar_url, pode_publicar)
           VALUES ($1, $2, $3, 'demo-area', $4, $5, $6, $7)`,
          [
            user.id,
            user.name,
            user.role,
            user.login,
            passwordHash,
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=374A67&color=E6FAFC`,
            user.podePublicar
          ]
        );
      }
    }

    await client.query('COMMIT');
    console.warn('⚠️  Modo demonstração ativo. As três contas locais previsíveis foram provisionadas.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
