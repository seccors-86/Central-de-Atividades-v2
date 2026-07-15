import { Router, Request, Response } from 'express';
import pool from '../config/database.js';

const router = Router();

// Endpoint público (sem autenticação) apenas para listar projetos marcados com publicar_portal
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT p.id, p.name, p.description, p.category, p.phase, p.status,
        p.start_date, p.end_date, p.area_id, p.demandante_area_id,
        area_exec.name AS area_name,
        area_demandante.name AS demandante_area_name,
        COALESCE(dono.name, owner.name) AS responsible_name,
        COALESCE(dono.avatar_url, owner.avatar_url) AS responsible_avatar_url,
        COALESCE((
          SELECT jsonb_agg(DISTINCT jsonb_build_object(
            'user_id', involved.user_id,
            'name', involved.name,
            'avatar_url', involved.avatar_url,
            'role', involved.role
          ))
          FROM (
            SELECT u.id AS user_id, u.name, u.avatar_url, 'responsavel' AS role
            FROM users u
            WHERE u.id = p.owner_id

            UNION ALL

            SELECT u.id AS user_id, u.name, u.avatar_url, 'dono' AS role
            FROM users u
            WHERE u.id = p.dono_id

            UNION ALL

            SELECT u.id AS user_id, u.name, u.avatar_url, COALESCE(pm.role, 'membro') AS role
            FROM project_members pm
            JOIN users u ON u.id = pm.user_id
            WHERE pm.project_id = p.id

            UNION ALL

            SELECT u.id AS user_id, u.name, u.avatar_url, 'atividade' AS role
            FROM tasks task_members
            JOIN users u ON u.id = task_members.owner_id
            WHERE task_members.project_id = p.id
              AND COALESCE(task_members.archived, false) = false
          ) involved
          WHERE involved.name IS NOT NULL
        ), '[]'::jsonb) AS involved_members,
        COUNT(DISTINCT pa.id)::int AS total_activities,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.status = 'done')::int AS completed_activities
      FROM projects p
      LEFT JOIN tasks pa ON pa.project_id = p.id AND COALESCE(pa.archived, false) = false
      LEFT JOIN users owner ON owner.id = p.owner_id
      LEFT JOIN users dono ON dono.id = p.dono_id
      LEFT JOIN areas area_exec ON area_exec.id = p.area_id
      LEFT JOIN areas area_demandante ON area_demandante.id = p.demandante_area_id
      WHERE p.publicar_portal = true AND COALESCE(p.archived, false) = false
      GROUP BY p.id
        , owner.name, owner.avatar_url
        , dono.name, dono.avatar_url
        , area_exec.name
        , area_demandante.name
      ORDER BY p.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    const projects = result.rows.map((p) => {
      const normalizedStatus = String(p.status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const isCompleted = normalizedStatus.includes('concluido') || normalizedStatus === 'done' || normalizedStatus === 'closed';

      return {
        ...p,
        progress: isCompleted ? 100 : (p.total_activities > 0
        ? Math.round((p.completed_activities / p.total_activities) * 100)
        : 0),
      };
    });
    
    res.json(projects);
  } catch (err) {
    console.error('getPublicProjects error:', err);
    res.status(500).json({ error: 'Erro ao buscar projetos públicos.' });
  }
});

// Tarefas públicas
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT t.id, t.project_id, t.title, t.description, t.status, t.progress,
        t.start_date, t.deadline, t.priority, t.area_id
      FROM tasks t
      WHERE t.publicar_portal = true AND COALESCE(t.archived, false) = false
      ORDER BY t.created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('getPublicTasks error:', err);
    res.status(500).json({ error: 'Erro ao buscar tarefas públicas.' });
  }
});

export default router;
