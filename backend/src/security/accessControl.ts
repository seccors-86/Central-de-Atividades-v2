import { query } from '../config/database.js';
import { getSubtreeAreaIds } from '../utils/hierarchy.js';

export type AuthUser = {
  id: string;
  role: 'admin' | 'manager' | 'member';
  area_id?: string;
};

const managerAreas = async (user: AuthUser): Promise<string[]> =>
  user.role === 'manager' && user.area_id ? getSubtreeAreaIds(user.area_id) : [];

export const canAccessProject = async (
  user: AuthUser,
  projectId: string,
  action: 'read' | 'write' | 'delete' = 'read'
): Promise<boolean> => {
  if (user.role === 'admin') return true;
  const result = await query(
    `SELECT p.area_id, p.demandante_area_id, p.creator_id, p.owner_id, p.dono_id,
            pm.role AS member_role
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
      WHERE p.id = $1`,
    [projectId, user.id]
  );
  if (!result.rows[0]) return false;
  const p = result.rows[0];
  if (p.creator_id === user.id || p.owner_id === user.id || p.dono_id === user.id) return true;
  if (action === 'read' && p.member_role) return true;
  if (action === 'write' && ['editor', 'owner'].includes(p.member_role)) return true;
  if (action === 'delete' && p.member_role === 'owner') return true;
  if (user.role !== 'manager') return false;
  const areas = await managerAreas(user);
  return areas.includes(p.area_id) || areas.includes(p.demandante_area_id);
};

export const canAccessTask = async (
  user: AuthUser,
  taskId: string,
  action: 'read' | 'write' | 'delete' = 'read'
): Promise<boolean> => {
  if (user.role === 'admin') return true;
  const result = await query(
    `SELECT t.area_id, t.owner_id, t.project_id,
            EXISTS (SELECT 1 FROM task_members tm WHERE tm.task_id = t.id AND tm.user_id = $2) AS is_member
       FROM tasks t WHERE t.id = $1`,
    [taskId, user.id]
  );
  const task = result.rows[0];
  if (!task) return false;
  if (task.owner_id === user.id || task.is_member) return action !== 'delete' || task.owner_id === user.id;
  if (task.project_id && await canAccessProject(user, task.project_id, action === 'read' ? 'read' : 'write')) return true;
  if (user.role !== 'manager') return false;
  return (await managerAreas(user)).includes(task.area_id);
};

export const canAccessSupportTicket = async (
  user: AuthUser,
  ticketId: string,
  action: 'read' | 'write' | 'delete' = 'read'
): Promise<boolean> => {
  if (user.role === 'admin') return true;
  const result = await query(
    'SELECT area_id, creator_id, responsible_id FROM support_tickets WHERE id = $1',
    [ticketId]
  );
  const ticket = result.rows[0];
  if (!ticket) return false;
  if (action !== 'delete' && (ticket.creator_id === user.id || ticket.responsible_id === user.id)) return true;
  if (user.role !== 'manager') return false;
  return (await managerAreas(user)).includes(ticket.area_id);
};

export const canAccessActivityLog = async (
  user: AuthUser,
  logId: string,
  action: 'read' | 'write' | 'delete' = 'read'
): Promise<boolean> => {
  if (user.role === 'admin') return true;
  const result = await query(
    `SELECT al.user_id, u.area_id
       FROM activity_logs al JOIN users u ON u.id = al.user_id
      WHERE al.id = $1`,
    [logId]
  );
  const log = result.rows[0];
  if (!log) return false;
  if (log.user_id === user.id) return true;
  if (user.role !== 'manager') return false;
  return (await managerAreas(user)).includes(log.area_id);
};

export const canAccessEntity = async (
  user: AuthUser,
  type: string,
  id: string,
  action: 'read' | 'write' = 'read'
): Promise<boolean> => {
  if (type === 'task') return canAccessTask(user, id, action);
  if (type === 'project') return canAccessProject(user, id, action);
  return false;
};
