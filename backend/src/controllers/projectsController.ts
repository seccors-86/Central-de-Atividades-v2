import { Request, Response } from 'express';
import pool from '../config/database.js';
import { randomBytes } from 'crypto';
import { getSubtreeAreaIds, getRootAreaId } from '../utils/hierarchy.js';
import { triggerPortalSync } from '../utils/portalWebhook.js';

const genId = () => randomBytes(4).toString('hex').toUpperCase();

const normalizeKpiIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string').map(id => id.trim()).filter(Boolean))].slice(0, 50);
};

const getProjectKpis = async (db: { query: Function }, projectId: string) => {
  const result = await db.query(
    `SELECT pk.id, pk.name, pk.position
     FROM project_kpi_links pkl
     JOIN project_kpis pk ON pk.id = pkl.kpi_id
     WHERE pkl.project_id = $1
     ORDER BY pk.position, LOWER(pk.name)`,
    [projectId]
  );
  return result.rows;
};

const syncProjectKpis = async (db: { query: Function }, projectId: string, rawKpiIds: unknown) => {
  const kpiIds = normalizeKpiIds(rawKpiIds);
  if (kpiIds.length > 0) {
    const existing = await db.query('SELECT id FROM project_kpis WHERE id = ANY($1::text[])', [kpiIds]);
    if (existing.rows.length !== kpiIds.length) {
      const error = new Error('Um ou mais KPIs selecionados não existem.');
      (error as any).code = 'INVALID_PROJECT_KPI';
      throw error;
    }
  }
  await db.query('DELETE FROM project_kpi_links WHERE project_id = $1', [projectId]);
  if (kpiIds.length > 0) {
    await db.query(
      `INSERT INTO project_kpi_links (project_id, kpi_id)
       SELECT $1, UNNEST($2::text[])`,
      [projectId, kpiIds]
    );
  }
  return kpiIds;
};

// ─── HELPER ─────────────────────────────────────────────────────────────────
// Retorna a cláusula WHERE de acesso: o usuário vê apenas projetos da sua área
// OU projetos em que ele foi explicitamente adicionado como membro.
// Isso se aplica tanto a gestores quanto a membros.
const buildAccessFilter = async (user: any, paramStart: number) => {
  if (user && user.role === 'admin') {
    return {
      clause: '1=1',
      params: [],
    };
  }
  const userId = user?.id || '';
  const areaId = user?.area_id || '';
  
  let areaIds: string[] = [];
  if (areaId) {
    const rootAreaId = await getRootAreaId(areaId);
    areaIds = await getSubtreeAreaIds(rootAreaId);
  }
  
  if (areaIds.length === 0) {
    return {
      clause: `(
        p.creator_id = $${paramStart}
        OR p.dono_id = $${paramStart + 1}
        OR p.owner_id = $${paramStart + 2}
        OR (p.private = false AND EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = $${paramStart + 3}
        ))
      )`,
      params: [userId, userId, userId, userId],
    };
  }

  return {
    clause: `(
      p.area_id = ANY($${paramStart})
      OR p.demandante_area_id = ANY($${paramStart + 1})
      OR p.creator_id = $${paramStart + 2}
      OR p.dono_id = $${paramStart + 3}
      OR p.owner_id = $${paramStart + 4}
      OR p.creator_id IN (SELECT id FROM users WHERE area_id = ANY($${paramStart + 5}))
      OR p.dono_id IN (SELECT id FROM users WHERE area_id = ANY($${paramStart + 6}))
      OR p.owner_id IN (SELECT id FROM users WHERE area_id = ANY($${paramStart + 7}))
      OR EXISTS (
        SELECT 1
        FROM project_members pm_scope
        JOIN users member_user ON member_user.id = pm_scope.user_id
        WHERE pm_scope.project_id = p.id
          AND member_user.area_id = ANY($${paramStart + 8})
      )
      OR EXISTS (
        SELECT 1 FROM project_members pm_me
        WHERE pm_me.project_id = p.id AND pm_me.user_id = $${paramStart + 9}
      )
    )`,
    params: [areaIds, areaIds, userId, userId, userId, areaIds, areaIds, areaIds, areaIds, userId],
  };
};

// ─── PROJECTS ───────────────────────────────────────────────────────────────

export const getProjects = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, category, responsible, search, page = '1', limit = '50' } = req.query;

    const access = await buildAccessFilter(user, 1);
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `
      SELECT p.*,
        COALESCE((
          SELECT json_agg(json_build_object('id', pk.id, 'name', pk.name, 'position', pk.position) ORDER BY pk.position, LOWER(pk.name))
          FROM project_kpi_links pkl JOIN project_kpis pk ON pk.id = pkl.kpi_id
          WHERE pkl.project_id = p.id
        ), '[]'::json) AS kpis,
        COALESCE((
          SELECT json_agg(pk.id ORDER BY pk.position, LOWER(pk.name))
          FROM project_kpi_links pkl JOIN project_kpis pk ON pk.id = pkl.kpi_id
          WHERE pkl.project_id = p.id
        ), '[]'::json) AS kpi_ids,
        COUNT(DISTINCT pa.id)::int AS total_activities,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.status = 'done' OR pa.progress = 100)::int AS completed_activities,
        COALESCE((
          SELECT SUM((log->>'durationSeconds')::int)
          FROM tasks t
          CROSS JOIN jsonb_array_elements(t.time_logs) AS log
          WHERE t.project_id = p.id
        ), 0)::int AS total_duration_seconds,
        json_agg(DISTINCT jsonb_build_object(
          'user_id', pm.user_id, 'role', pm.role,
          'name', u.name, 'avatar_url', u.avatar_url, 'area_id', u.area_id
        )) FILTER (WHERE pm.user_id IS NOT NULL) AS shared_with
      FROM projects p
      LEFT JOIN tasks pa ON pa.project_id = p.id AND COALESCE(pa.archived, false) = false
      LEFT JOIN project_members pm ON pm.project_id = p.id
      LEFT JOIN users u ON u.id = pm.user_id
      WHERE ${access.clause}
    `;
    const params: any[] = [...access.params];
    let idx = params.length + 1;

    if (status) { query += ` AND p.status = $${idx}`; params.push(status); idx++; }
    if (category) { query += ` AND p.category = $${idx}`; params.push(category); idx++; }
    if (responsible) {
      query += ` AND EXISTS (
        SELECT 1 FROM users responsible_user
        WHERE responsible_user.id = p.owner_id
          AND responsible_user.name ILIKE $${idx}
      )`;
      params.push(`%${responsible}%`);
      idx++;
    }
    if (search) {
      query += ` AND (p.name ILIKE $${idx} OR p.description ILIKE $${idx})`;
      params.push(`%${search}%`); idx++;
    }

    query += ` GROUP BY p.id ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);

    // Contagem total para paginação
    const countQuery = `
      SELECT COUNT(DISTINCT p.id)::int AS total
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE ${access.clause}
    `;
    const countResult = await pool.query(countQuery, access.params);

    const projects = result.rows.map((p) => {
      let calcProgress = 0;
      if (p.total_activities > 0) {
        calcProgress = Math.round((p.completed_activities / p.total_activities) * 100);
      }
      return {
        ...p,
        progress: calcProgress,
        total_hours: Number((p.total_duration_seconds / 3600).toFixed(1)) || 0,
        selected_phases: p.selected_phases || [],
        documents: p.documents || [],
        shared_with: p.shared_with || [],
      };
    });

    res.json({
      data: projects,
      total: countResult.rows[0].total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (err) {
    console.error('getProjects error:', err);
    res.status(500).json({ error: 'Erro ao buscar projetos.' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const result = await pool.query(
      `SELECT p.*,
        COALESCE((
          SELECT json_agg(json_build_object('id', pk.id, 'name', pk.name, 'position', pk.position) ORDER BY pk.position, LOWER(pk.name))
          FROM project_kpi_links pkl JOIN project_kpis pk ON pk.id = pkl.kpi_id
          WHERE pkl.project_id = p.id
        ), '[]'::json) AS kpis,
        COALESCE((
          SELECT json_agg(pk.id ORDER BY pk.position, LOWER(pk.name))
          FROM project_kpi_links pkl JOIN project_kpis pk ON pk.id = pkl.kpi_id
          WHERE pkl.project_id = p.id
        ), '[]'::json) AS kpi_ids,
        COUNT(DISTINCT pa.id)::int AS total_activities,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.status = 'done' OR pa.progress = 100)::int AS completed_activities,
        COALESCE((
          SELECT SUM((log->>'durationSeconds')::int)
          FROM tasks t
          CROSS JOIN jsonb_array_elements(t.time_logs) AS log
          WHERE t.project_id = p.id
        ), 0)::int AS total_duration_seconds,
        json_agg(DISTINCT jsonb_build_object(
          'user_id', pm.user_id, 'role', pm.role,
          'name', u.name, 'avatar_url', u.avatar_url, 'area_id', u.area_id
        )) FILTER (WHERE pm.user_id IS NOT NULL) AS shared_with
       FROM projects p
       LEFT JOIN tasks pa ON pa.project_id = p.id AND COALESCE(pa.archived, false) = false
       LEFT JOIN project_members pm ON pm.project_id = p.id
       LEFT JOIN users u ON u.id = pm.user_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado.' });
    }

    const project = result.rows[0];

    // Verifica acesso usando a mesma regra da listagem:
    // admin vê tudo; demais veem projetos da gerência/subáreas,
    // projetos demandados por essas áreas, ou onde estão envolvidos.
    let allowedAreaIds: string[] = [];
    if (user.area_id) {
      const rootAreaId = await getRootAreaId(user.area_id);
      allowedAreaIds = await getSubtreeAreaIds(rootAreaId);
    }

    const projectUserIds = [project.creator_id, project.dono_id, project.owner_id].filter(Boolean);
    const linkedUsers = projectUserIds.length > 0
      ? await pool.query('SELECT id, area_id FROM users WHERE id = ANY($1)', [projectUserIds])
      : { rows: [] };

    const hasAccess =
      user.role === 'admin' ||
      allowedAreaIds.includes(project.area_id) ||
      allowedAreaIds.includes(project.demandante_area_id) ||
      project.creator_id === user.id ||
      project.dono_id === user.id ||
      project.owner_id === user.id ||
      (project.shared_with || []).some((m: any) => m.user_id === user.id) ||
      linkedUsers.rows.some((projectUser: any) => projectUser.area_id && allowedAreaIds.includes(projectUser.area_id)) ||
      (project.shared_with || []).some((m: any) => m.area_id && allowedAreaIds.includes(m.area_id));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Sem permissão para acessar este projeto.' });
    }

    let calcProgress = 0;
    if (project.total_activities > 0) {
      calcProgress = Math.round((project.completed_activities / project.total_activities) * 100);
    }
    
    res.json({ 
      ...project, 
      progress: calcProgress,
      total_hours: Number((project.total_duration_seconds / 3600).toFixed(1)) || 0,
      shared_with: project.shared_with || [] 
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar projeto.' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const user = (req as any).user;
    const {
      name, description, category, phase, selected_phases, status,
      start_date, end_date, owner_id, dono_id, client_id, demandante_area_id, documents,
      area_id, parent_id, depends_on_id, private: isPrivate, publicar_portal, other_members, kpi_ids
    } = req.body;

    if (!name || !category || !phase) {
      return res.status(400).json({ error: 'Nome, categoria e fase são obrigatórios.' });
    }

    const userRes = await db.query('SELECT pode_publicar FROM users WHERE id = $1', [user.id]);
    const userPodePublicar = userRes.rows[0]?.pode_publicar === true;
    const canPublish = user.role === 'admin' || userPodePublicar;
    const finalPublicarPortal = canPublish ? Boolean(publicar_portal) : false;

    const id = `PRJ-${genId()}`;
    const result = await db.query(
      `INSERT INTO projects
        (id, name, description, category, phase, selected_phases, status,
         start_date, end_date, owner_id, dono_id, client_id, demandante_area_id,
         documents, creator_id, area_id, parent_id, depends_on_id, private, publicar_portal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        id, name, description || '', category, phase,
        JSON.stringify(selected_phases || []),
        status || 'Não iniciado/Backlog',
        start_date || null, end_date || null,
        owner_id || null, dono_id || null,
        client_id || null, demandante_area_id || null,
        JSON.stringify(documents || []),
        user.id, area_id || user.area_id,
        parent_id || null,
        depends_on_id || null,
        isPrivate || false,
        finalPublicarPortal
      ]
    );

    await syncProjectKpis(db, id, kpi_ids);

    if (Array.isArray(other_members)) {
      for (const memberId of other_members) {
        await db.query(
          'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3',
          [id, memberId, 'editor']
        );
      }
    }

    const linkedKpis = await getProjectKpis(db, id);
    await db.query('COMMIT');

    if (finalPublicarPortal) {
      triggerPortalSync();
    }

    res.status(201).json({
      ...result.rows[0],
      kpis: linkedKpis,
      kpi_ids: linkedKpis.map((kpi: any) => kpi.id),
      shared_with: other_members || []
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('createProject error:', err);
    if ((err as any)?.code === 'INVALID_PROJECT_KPI') {
      return res.status(400).json({ error: (err as Error).message });
    }
    res.status(500).json({ error: 'Erro ao criar projeto.' });
  } finally {
    db.release();
  }
};

export const updateProject = async (req: Request, res: Response) => {
  let db: any;
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const fields = req.body;
    const kpiIdsProvided = Object.prototype.hasOwnProperty.call(fields, 'kpi_ids');

    // Verifica se tem permissão de edição (dono da área ou editor/owner compartilhado)
    const access = await pool.query(
      `SELECT p.area_id, p.creator_id, p.publicar_portal, pm.role FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE p.id = $2`,
      [user.id, id]
    );

    if (access.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const { area_id, creator_id, role, publicar_portal: currentPublicarPortal } = access.rows[0];
    const canEdit = user.role === 'admin' || area_id === user.area_id || creator_id === user.id || role === 'editor' || role === 'owner';
    if (!canEdit) return res.status(403).json({ error: 'Sem permissão para editar este projeto.' });

    const allowedFields = [
      'name', 'description', 'category', 'phase', 'selected_phases',
      'status', 'start_date', 'end_date', 'owner_id', 'dono_id',
      'client_id', 'demandante_area_id', 'documents', 'area_id',
      'parent_id', 'depends_on_id', 'private', 'publicar_portal', 'archived'
    ];

    // Travamento de segurança para publicação de projetos
    const userRes = await pool.query('SELECT pode_publicar FROM users WHERE id = $1', [user.id]);
    const userPodePublicar = userRes.rows[0]?.pode_publicar === true;
    const canPublish = user.role === 'admin' || userPodePublicar;
    if ('publicar_portal' in fields && !canPublish) {
      fields.publicar_portal = currentPublicarPortal;
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const key of allowedFields) {
      if (key in fields) {
        let val = fields[key];
        if (['selected_phases', 'documents'].includes(key)) {
          val = JSON.stringify(val);
        } else if (['start_date', 'end_date', 'owner_id', 'dono_id', 'parent_id', 'depends_on_id', 'demandante_area_id', 'client_id'].includes(key) && val === '') {
          setClauses.push(`${key} = NULL`);
          continue;
        } else if (val !== undefined && val !== null) {
          setClauses.push(`${key} = $${idx}`);
          values.push(val);
          idx++;
          continue;
        } else if (val === null) {
            setClauses.push(`${key} = NULL`);
            continue;
        }
      }
    }

    if (setClauses.length === 0 && !kpiIdsProvided && !Array.isArray(fields.other_members)) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
    }

    db = await pool.connect();
    await db.query('BEGIN');

    let result;
    if (setClauses.length > 0) {
      setClauses.push(`updated_at = NOW()`);
      values.push(id);
      result = await db.query(
        `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
    } else {
      result = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    }

    if (kpiIdsProvided) {
      await syncProjectKpis(db, id, fields.kpi_ids);
    }

    if (Array.isArray(fields.selected_phases)) {
      await db.query(
        `UPDATE tasks SET flow_step = 'Sem fase específica' 
         WHERE project_id = $1 AND flow_step NOT IN (SELECT jsonb_array_elements_text($2::jsonb))`,
        [id, JSON.stringify(fields.selected_phases)]
      );
    }

    if (fields.archived === true) {
      await db.query('UPDATE tasks SET archived = true WHERE project_id = $1', [id]);
    }

    if (Array.isArray(fields.other_members)) {
      // First, get current members added via this UI (we don't want to remove 'owner' role or people added specifically via share modal? Actually, the share modal allows managing all editors/viewers. To be safe, we just clear and add, but preserving owner is handled by owner_id field on projects table, though project_members might have role='owner'. Better to just sync 'editor' role for the provided IDs, and remove editors not in the list. To avoid deleting members added via share modal, maybe we shouldn't delete, or we just sync completely.)
      // Let's do a full sync: remove all editors/viewers that are not in `other_members` (and keep owners, though owner is usually set via owner_id in projects).
      await db.query('DELETE FROM project_members WHERE project_id = $1 AND role != $2', [id, 'owner']);
      for (const memberId of fields.other_members) {
        await db.query(
          'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3',
          [id, memberId, 'editor']
        );
      }
    }

    const linkedKpis = await getProjectKpis(db, id);
    await db.query('COMMIT');

    if (fields.publicar_portal !== undefined && (fields.publicar_portal || currentPublicarPortal)) {
      triggerPortalSync();
    }
    res.json({
      ...result.rows[0],
      kpis: linkedKpis,
      kpi_ids: linkedKpis.map((kpi: any) => kpi.id),
      shared_with: fields.other_members || []
    });
  } catch (err) {
    if (db) await db.query('ROLLBACK');
    console.error('updateProject error:', {
      message: (err as any)?.message,
      detail: (err as any)?.detail,
      code: (err as any)?.code,
      stack: (err as any)?.stack,
    });
    if ((err as any)?.code === 'INVALID_PROJECT_KPI') {
      return res.status(400).json({ error: (err as Error).message });
    }
    res.status(500).json({ error: 'Erro ao atualizar projeto.' });
  } finally {
    if (db) db.release();
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const project = await pool.query(
      `SELECT p.area_id, p.creator_id, pm.role 
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE p.id = $2`, 
      [user.id, id]
    );

    if (project.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const { area_id, creator_id, role } = project.rows[0];
    const canDelete = user.role === 'admin' || area_id === user.area_id || creator_id === user.id || role === 'owner';

    if (!canDelete) {
      return res.status(403).json({ error: 'Apenas o criador, gestor da área ou owner pode excluir o projeto.' });
    }

    await pool.query('UPDATE projects SET archived = true WHERE id = $1', [id]);
    await pool.query('UPDATE tasks SET archived = true WHERE project_id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir projeto.' });
  }
};

export const permanentDeleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const project = await pool.query(
      `SELECT p.area_id, p.creator_id, pm.role 
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE p.id = $2`, 
      [user.id, id]
    );

    if (project.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const { area_id, creator_id, role } = project.rows[0];
    const canDelete = user.role === 'admin' || area_id === user.area_id || creator_id === user.id || role === 'owner';

    if (!canDelete) {
      return res.status(403).json({ error: 'Apenas o criador, gestor da área, owner ou administrador pode excluir permanentemente o projeto.' });
    }

    // Deleta tarefas associadas primeiro (CASCADE faz isso, mas por segurança)
    await pool.query('DELETE FROM tasks WHERE project_id = $1', [id]);
    // Deleta membros do projeto
    await pool.query('DELETE FROM project_members WHERE project_id = $1', [id]);
    // Deleta o projeto permanentemente
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado.' });
    }

    res.json({ success: true, message: 'Projeto excluído permanentemente.' });
  } catch (err) {
    console.error('permanentDeleteProject error:', err);
    res.status(500).json({ error: 'Erro ao excluir projeto permanentemente.' });
  }
};

// ─── PROJECT MEMBERS (COMPARTILHAMENTO) ─────────────────────────────────────

export const getProjectMembers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT pm.*, u.name, u.avatar_url, u.role as user_role, a.name as area_name
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       JOIN areas a ON a.id = u.area_id
       WHERE pm.project_id = $1
       ORDER BY pm.added_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar membros do projeto.' });
  }
};

export const addProjectMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { user_id, role = 'viewer' } = req.body;

    if (!user_id) return res.status(400).json({ error: 'user_id é obrigatório.' });

    // Verifica se o solicitante tem permissão (deve ser dono/gestor da área do projeto)
    const project = await pool.query(
      'SELECT area_id, creator_id FROM projects WHERE id = $1', [id]
    );
    if (project.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const { area_id, creator_id } = project.rows[0];
    if (area_id !== user.area_id && creator_id !== user.id) {
      return res.status(403).json({ error: 'Apenas o gestor da área pode compartilhar este projeto.' });
    }

    // Verifica se o usuário alvo existe
    const targetUser = await pool.query('SELECT id, name FROM users WHERE id = $1', [user_id]);
    if (targetUser.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // Não permite adicionar o próprio criador/dono da área
    if (user_id === creator_id || (await pool.query('SELECT id FROM users WHERE id=$1 AND area_id=$2', [user_id, area_id])).rows.length > 0) {
      return res.status(400).json({ error: 'Este usuário já tem acesso ao projeto pela sua área.' });
    }

    const result = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role, added_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [id, user_id, role, user.id]
    );

    res.status(201).json({
      ...result.rows[0],
      name: targetUser.rows[0].name,
    });
  } catch (err) {
    console.error('addProjectMember error:', err);
    res.status(500).json({ error: 'Erro ao compartilhar projeto.' });
  }
};

export const removeProjectMember = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const user = (req as any).user;

    const project = await pool.query('SELECT area_id, creator_id FROM projects WHERE id = $1', [id]);
    if (project.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const { area_id, creator_id } = project.rows[0];
    if (area_id !== user.area_id && creator_id !== user.id) {
      return res.status(403).json({ error: 'Sem permissão para remover membros deste projeto.' });
    }

    await pool.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [id, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover membro do projeto.' });
  }
};

// ─── PROJECT ACTIVITIES ──────────────────────────────────────────────────────

export const getProjectActivities = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { flow_step } = req.query;

    let query = `
      SELECT t.id, t.project_id, t.flow_step, t.title, t.status, t.progress,
        u.name as responsible, t.owner_id as responsible_id, t.priority, t.hours, t.description, t.notes,
        t.start_date, t.deadline, t.time_logs, t.subtasks, t.task_type, t.client_id,
        t.demandante_area_id, t.publicar_portal, t.created_at, t.archived,
        COALESCE(
          (SELECT array_agg(tag_id) FROM task_tags WHERE task_id = t.id),
          '{}'
        ) as "tagIds",
        COALESCE(
          (SELECT array_agg(user_id) FROM task_members WHERE task_id = t.id),
          '{}'
        ) as "memberIds"
      FROM tasks t
      LEFT JOIN users u ON u.id = t.owner_id
      WHERE t.project_id = $1 AND COALESCE(t.archived, false) = false
    `;
    const params: any[] = [projectId];

    if (flow_step) {
      query += ' AND t.flow_step = $2';
      params.push(flow_step);
    }

    query += ' ORDER BY t.created_at ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar atividades.' });
  }
};

export const createProjectActivity = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { title, flow_step, responsible, responsible_id, priority, hours, description, notes, tagIds, memberIds, start_date, deadline, status, progress, time_logs, subtasks, task_type, client_id, demandante_area_id, publicar_portal } = req.body;
    const user = (req as any).user;

    if (!title || !flow_step) {
      return res.status(400).json({ error: 'Título e etapa são obrigatórios.' });
    }

    const userRes = await pool.query('SELECT pode_publicar FROM users WHERE id = $1', [user.id]);
    const userPodePublicar = userRes.rows[0]?.pode_publicar === true;
    const canPublish = user.role === 'admin' || userPodePublicar;
    const finalPublicarPortal = canPublish ? Boolean(publicar_portal) : false;

    const id = `TSK-${genId()}`;
    const owner = responsible_id || user.id;
    const result = await pool.query(
      `INSERT INTO tasks
        (id, project_id, flow_step, title, status, owner_id, area_id, priority, hours, description, notes, start_date, deadline, progress, time_logs, subtasks, task_type, client_id, demandante_area_id, publicar_portal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [id, projectId, flow_step, title, status || 'todo', owner, user.area_id,
       priority || 'Média', hours || '', description || '', notes || '',
       start_date || new Date().toISOString().split('T')[0],
       deadline || new Date().toISOString().split('T')[0],
       progress ?? 0, JSON.stringify((time_logs || []).filter(Boolean)), JSON.stringify(subtasks || []),
       task_type || 'activity', client_id || null, demandante_area_id || null, finalPublicarPortal]
    );

    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      for (const memberId of memberIds) {
        await pool.query(
          'INSERT INTO task_members (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, memberId]
        );
      }
    }

    // Associar Tags
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await pool.query(
          'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, tagId]
        );
      }
    }

    if (finalPublicarPortal) {
      triggerPortalSync();
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createProjectActivity error:', err);
    res.status(500).json({ error: 'Erro ao criar atividade.' });
  }
};

export const updateProjectActivity = async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;
    const { status, title, responsible, responsible_id, priority, hours, description, notes, tagIds, memberIds, flow_step, start_date, deadline, progress, time_logs, subtasks, task_type, client_id, demandante_area_id, publicar_portal } = req.body;
    const user = (req as any).user;

    // Usar o status exatamente como recebido do frontend (pode ser ID de bucket ou 'todo'/'doing'/'done')
    const dbStatus = status || null;

    const oldTaskRes = await pool.query('SELECT publicar_portal FROM tasks WHERE id = $1', [activityId]);
    if (oldTaskRes.rows.length === 0) return res.status(404).json({ error: 'Atividade não encontrada.' });
    const currentPublicarPortal = oldTaskRes.rows[0]?.publicar_portal === true;

    const userRes = await pool.query('SELECT pode_publicar FROM users WHERE id = $1', [user.id]);
    const userPodePublicar = userRes.rows[0]?.pode_publicar === true;
    const canPublish = user.role === 'admin' || userPodePublicar;
    const finalPublicarPortal = publicar_portal !== undefined
      ? (canPublish ? Boolean(publicar_portal) : currentPublicarPortal)
      : currentPublicarPortal;

    const result = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        status = COALESCE($2, status),
        owner_id = COALESCE($3, owner_id),
        priority = COALESCE($4, priority),
        hours = COALESCE($5, hours),
        description = COALESCE($6, description),
        notes = COALESCE($7, notes),
        flow_step = COALESCE($8, flow_step),
        start_date = COALESCE($10, start_date),
        deadline = COALESCE($11, deadline),
        progress = COALESCE($12, progress),
        time_logs = COALESCE($13, time_logs),
        subtasks = COALESCE($14, subtasks),
        task_type = COALESCE($15, task_type),
        client_id = COALESCE($16, client_id),
        demandante_area_id = COALESCE($17, demandante_area_id),
        publicar_portal = $18,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [title, dbStatus, responsible_id, priority, hours, description, notes, flow_step, activityId,
       start_date || null, deadline || null, progress !== undefined ? progress : null,
       time_logs ? JSON.stringify((time_logs || []).filter(Boolean)) : null,
       subtasks ? JSON.stringify(subtasks) : null,
       task_type || null,
       client_id || null,
       demandante_area_id || null,
       finalPublicarPortal]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Atividade não encontrada.' });

    const updatedTask = result.rows[0];

    // Lógica de propagação do status Impedimento (Tarefa -> Projeto)
    if (updatedTask.project_id) {
      if (dbStatus === 'impedimento') {
        await pool.query("UPDATE projects SET status = 'Impedido' WHERE id = $1 AND status != 'Impedido'", [updatedTask.project_id]);
      } else if (dbStatus !== null) {
        // Verifica se ainda há alguma tarefa impedida neste projeto
        const impedimentCheck = await pool.query(
          "SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND status = 'impedimento' AND COALESCE(archived, false) = false",
          [updatedTask.project_id]
        );
        if (parseInt(impedimentCheck.rows[0].count) === 0) {
          // Reverte o projeto para Ativo apenas se o motivo do status atual for o impedimento anterior
          await pool.query("UPDATE projects SET status = 'Ativo' WHERE id = $1 AND status = 'Impedido'", [updatedTask.project_id]);
        }
      }
    }

    // Atualizar Tags
    if (tagIds !== undefined) {
      await pool.query('DELETE FROM task_tags WHERE task_id = $1', [activityId]);
      if (Array.isArray(tagIds) && tagIds.length > 0) {
        for (const tagId of tagIds) {
          await pool.query(
            'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [activityId, tagId]
          );
        }
      }
    }

    if (memberIds !== undefined) {
      await pool.query('DELETE FROM task_members WHERE task_id = $1', [activityId]);
      if (Array.isArray(memberIds) && memberIds.length > 0) {
        for (const memberId of memberIds) {
          await pool.query(
            'INSERT INTO task_members (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [activityId, memberId]
          );
        }
      }
    }

    if (publicar_portal !== undefined && (finalPublicarPortal || currentPublicarPortal)) {
      triggerPortalSync();
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateProjectActivity error:', err);
    res.status(500).json({ error: 'Erro ao atualizar atividade.' });
  }
};

export const deleteProjectActivity = async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;
    console.log(`[deleteProjectActivity] Tentando excluir atividade com id: "${activityId}"`);
    const result = await pool.query('UPDATE tasks SET archived = true WHERE id = $1', [activityId]);
    console.log(`[deleteProjectActivity] Linhas afetadas: ${result.rowCount}`);
    res.json({ success: true, rowCount: result.rowCount });
  } catch (err) {
    console.error('[deleteProjectActivity] Erro ao excluir atividade:', err);
    res.status(500).json({ error: 'Erro ao excluir atividade.' });
  }
};

// ─── KPIs DASHBOARD ─────────────────────────────────────────────────────────

export const getProjectKPIs = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const access = await buildAccessFilter(user, 1);

    // KPIs de projetos com filtro de acesso correto
    const kpiResult = await pool.query(`
      SELECT
        COUNT(DISTINCT p.id) FILTER (
          WHERE p.status NOT IN ('Não iniciado/Backlog','Concluído','Cancelado')
        )::int AS active_projects,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'Concluído')::int AS completed_projects,
        COUNT(DISTINCT p.id) FILTER (
          WHERE p.end_date < CURRENT_DATE
          AND p.status NOT IN ('Concluído','Cancelado')
        )::int AS overdue_projects,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.priority = 'Urgente' AND COALESCE(pa.archived, false) = false)::int AS impediments
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      LEFT JOIN tasks pa ON pa.project_id = p.id
      WHERE ${access.clause} AND COALESCE(p.archived, false) = false
    `, access.params);

    // KPIs de suporte filtrados por subárvore da área para não-admins
    let supportQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status != 'Concluído')::int AS active_tickets,
        COUNT(*) FILTER (WHERE priority = 'Urgente' AND status != 'Concluído')::int AS urgent_tickets,
        ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - in_progress_at))/3600)
          FILTER (WHERE status = 'Concluído' AND in_progress_at IS NOT NULL), 1) AS avg_sla_hours
      FROM support_tickets
    `;
    const supportParams: any[] = [];
    if (user && user.role !== 'admin') {
      const rootAreaId = await getRootAreaId(user.area_id);
      const allowedAreas = await getSubtreeAreaIds(rootAreaId);
      supportQuery += ` WHERE area_id = ANY($1)`;
      supportParams.push(allowedAreas);
    }
    const supportResult = await pool.query(supportQuery, supportParams);

    // Projetos por status
    const byStatus = await pool.query(`
      SELECT p.status, COUNT(DISTINCT p.id)::int AS total
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE ${access.clause} AND COALESCE(p.archived, false) = false
      GROUP BY p.status ORDER BY total DESC
    `, access.params);

    res.json({
      ...kpiResult.rows[0],
      ...supportResult.rows[0],
      avg_sla_hours: supportResult.rows[0].avg_sla_hours || '0.0',
      by_status: byStatus.rows,
    });
  } catch (err) {
    console.error('getProjectKPIs error:', err);
    res.status(500).json({ error: 'Erro ao buscar KPIs.' });
  }
};

export const syncFromPortal = async (req: Request, res: Response) => {
  try {
    const { title, description, tipo_registro, category, status, priority_score } = req.body;

    // Usuário "Portal de Transparência" como criador padrão das demandas do robô
    const PORTAL_USER_ID = 'a4cf0233-ecb0-47a3-b2b2-e7ccb6fe41d7';
    const PORTAL_AREA_ID = '072cbfff-22e4-4c62-9a8a-4693b5079da8';

    // Garantir prefixo |ROBO| no título
    const finalTitle = title
      ? (title.startsWith('|ROBO|') ? title : `|ROBO| ${title}`)
      : '|ROBO| Nova Demanda do Portal';

    if (tipo_registro === 'Suporte') {
      const taskId = `TSK-${genId()}`;
      await pool.query(
        `INSERT INTO tasks (id, title, description, status, owner_id, area_id)
         VALUES ($1, $2, $3, 'todo', $4, $5) RETURNING *`,
        [taskId, finalTitle, description || '', PORTAL_USER_ID, PORTAL_AREA_ID]
      );
      res.status(201).json({ success: true, type: 'task', id: taskId });
    } else {
      const prjId = `PRJ-${genId()}`;
      await pool.query(
        `INSERT INTO projects
         (id, name, description, category, phase, status, creator_id, owner_id, area_id, client_id, publicar_portal)
         VALUES ($1, $2, $3, $4, 'Backlog', $5, $6, $6, $7, NULL, true) RETURNING *`,
        [prjId, finalTitle, description || '', category || 'Processos', status || 'Não iniciado/Backlog', PORTAL_USER_ID, PORTAL_AREA_ID]
      );
      res.status(201).json({ success: true, type: 'project', id: prjId });
    }
  } catch (err) {
    console.error('syncFromPortal error:', err);
    res.status(500).json({ error: 'Erro ao sincronizar do portal.' });
  }
};

/**
 * PATCH /api/projects/sync/:id
 * Atualiza um projeto existente na Central via API do Portal (robô).
 * Permite atualizar: name, description, creator_id, area_id.
 * Requer role=admin no JWT (não verifica user_id no banco).
 */
export const updateFromPortal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Somente admin pode atualizar via portal
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas admin pode atualizar via portal.' });
    }

    const { name, description, creator_id, owner_id, area_id } = req.body;

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(name); }
    if (description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(description); }
    if (creator_id !== undefined) { setClauses.push(`creator_id = $${idx++}`); values.push(creator_id); }
    if (owner_id !== undefined) { setClauses.push(`owner_id = $${idx++}`); values.push(owner_id); }
    if (area_id !== undefined) { setClauses.push(`area_id = $${idx++}`); values.push(area_id); }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateFromPortal error:', err);
    res.status(500).json({ error: 'Erro ao atualizar projeto via portal.' });
  }
};
