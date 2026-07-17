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

    // A carga completa é opcional e existe apenas no compose de demonstração.
    // Quando ela estiver presente, garante conteúdo visível também para o perfil Colaborador.
    await client.query(
      `INSERT INTO task_members (task_id, user_id)
       SELECT 'demo-task-crm-tests', 'demo-member'
       WHERE EXISTS (SELECT 1 FROM tasks WHERE id = 'demo-task-crm-tests')
       ON CONFLICT (task_id, user_id) DO NOTHING`
    );
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role, added_by)
       SELECT 'demo-project-crm', 'demo-member', 'viewer', 'demo-superadmin'
       WHERE EXISTS (SELECT 1 FROM projects WHERE id = 'demo-project-crm')
       ON CONFLICT (project_id, user_id) DO NOTHING`
    );
    await client.query(
      `INSERT INTO activity_logs (id, user_id, date, content, status, "timestamp", task_id)
       SELECT 'demo-log-09', 'demo-member', CURRENT_DATE,
              'Executei os primeiros testes de aceite do CRM e registrei as evidências para a equipe.',
              'doing', (EXTRACT(EPOCH FROM NOW() - INTERVAL '40 minutes') * 1000)::bigint,
              'demo-task-crm-tests'
       WHERE EXISTS (SELECT 1 FROM tasks WHERE id = 'demo-task-crm-tests')
       ON CONFLICT (id) DO UPDATE SET
         date = EXCLUDED.date, content = EXCLUDED.content,
         status = EXCLUDED.status, "timestamp" = EXCLUDED."timestamp",
         task_id = EXCLUDED.task_id`
    );
    await client.query(
      `INSERT INTO support_tickets
         (id, title, queue, category, status, priority, responsible, responsible_id,
          requesting_area, demand_description, details, time_spent, creator_id, area_id, created_at)
       SELECT 'demo-support-007', 'Dúvida sobre os testes do CRM', 'Sistemas', 'Dúvida',
              'A fazer', 'Média', 'Diego Rocha', 'demo-user-diego', 'NUVYO Demonstração',
              'Solicitação criada pela conta Colaborador para demonstrar a visão individual.',
              'Orientar como anexar as evidências do teste.', '', 'demo-member', 'demo-area',
              NOW() - INTERVAL '30 minutes'
       WHERE EXISTS (SELECT 1 FROM users WHERE id = 'demo-user-diego')
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title, status = EXCLUDED.status, creator_id = EXCLUDED.creator_id,
         responsible_id = EXCLUDED.responsible_id, created_at = EXCLUDED.created_at`
    );
    await client.query(
      `INSERT INTO notifications (id, user_id, title, message, type, created_by, created_at) VALUES
         ('demo-notification-admin', 'demo-superadmin', 'Demonstração preparada', 'A base fictícia da NUVYO está pronta para apresentação.', 'success', NULL, NOW() - INTERVAL '10 minutes'),
         ('demo-notification-manager', 'demo-manager', 'Atenção ao portfólio', 'Há um projeto impedido e um projeto atrasado que precisam de acompanhamento.', 'warning', 'demo-superadmin', NOW() - INTERVAL '20 minutes'),
         ('demo-notification-member', 'demo-member', 'Tarefa compartilhada', 'Você foi incluído nos testes de aceite do CRM.', 'info', 'demo-manager', NOW() - INTERVAL '25 minutes')
       ON CONFLICT (id) DO UPDATE SET message = EXCLUDED.message, created_at = EXCLUDED.created_at`
    );
    await client.query(
      `UPDATE gamification_profiles SET
         xp_total = CASE user_id
           WHEN 'demo-superadmin' THEN 2400 WHEN 'demo-manager' THEN 1450 ELSE 420 END,
         level = CASE user_id
           WHEN 'demo-superadmin' THEN 5 WHEN 'demo-manager' THEN 3 ELSE 1 END,
         current_streak = CASE user_id
           WHEN 'demo-superadmin' THEN 10 WHEN 'demo-manager' THEN 6 ELSE 2 END,
         max_streak = CASE user_id
           WHEN 'demo-superadmin' THEN 18 WHEN 'demo-manager' THEN 11 ELSE 3 END,
         last_activity_date = CURRENT_DATE
       WHERE user_id IN ('demo-superadmin', 'demo-manager', 'demo-member')`
    );

    await client.query('COMMIT');
    console.warn('⚠️  Modo demonstração ativo. As três contas locais previsíveis foram provisionadas.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
