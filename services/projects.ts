import { get, post, put, del } from './api';

export interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  phase: string;
  selected_phases: string[];
  status: string;
  start_date?: string;
  end_date?: string;
  owner_id?: string;
  dono_id?: string;
  client_id?: string;
  demandante_area_id?: string;
  other_members?: string[];
  documents?: { id: string; name: string; url: string; size: number; uploadedAt: string }[];
  creator_id: string;
  area_id: string;
  total_activities: number;
  completed_activities: number;
  total_hours?: number;
  progress: number;
  shared_with: ProjectMember[];
  created_at: string;
  updated_at: string;
  archived?: boolean;
  parent_id?: string | null;
  depends_on_id?: string | null;
  private?: boolean;
  publicar_portal?: boolean;
  kpi?: string;
}

export interface ProjectMember {
  user_id: string;
  role: 'viewer' | 'editor' | 'owner';
  name: string;
  avatar_url?: string;
  user_role?: string;
  area_name?: string;
  area_id?: string;
}

export interface ProjectActivity {
  id: string;
  project_id: string;
  flow_step: string;
  title: string;
  status: string;
  progress?: number;
  responsible: string;
  responsible_id: string | null;
  priority: string;
  hours: string;
  description: string;
  notes: string;
  created_at: string;
  in_progress_at: string | null;
  completed_at: string | null;
  tagIds?: string[];
  memberIds?: string[];
  archived?: boolean;
  start_date?: string;
  deadline?: string;
  time_logs?: any[];
  subtasks?: any[];
  task_type?: string;
  client_id?: string | null;
  demandante_area_id?: string | null;
  publicar_portal?: boolean;
}

export interface ProjectKPIs {
  active_projects: number;
  completed_projects: number;
  overdue_projects: number;
  impediments: number;
  active_tickets: number;
  urgent_tickets: number;
  avg_sla_hours: string;
  by_status: { status: string; total: number }[];
}

export interface ProjectsResponse {
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export const getProjects = (params?: Record<string, string>): Promise<ProjectsResponse> => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return get(`/projects${qs}`);
};

export const getProjectById = (id: string): Promise<Project> =>
  get(`/projects/${id}`);

export const createProject = (data: Partial<Project>): Promise<Project> =>
  post('/projects', data);

export const updateProject = (id: string, data: Partial<Project>): Promise<Project> =>
  put(`/projects/${id}`, data);

export const deleteProject = (id: string): Promise<void> =>
  del(`/projects/${id}`);

export const permanentDeleteProject = (id: string): Promise<void> =>
  del(`/projects/permanent/${id}`);

export const getProjectKPIs = (): Promise<ProjectKPIs> =>
  get('/projects/kpis');

// ─── Activities ───────────────────────────────────────────────────────────────

export const getProjectActivities = (projectId: string): Promise<ProjectActivity[]> =>
  get(`/projects/${projectId}/activities`);

export const createActivity = (projectId: string, data: Partial<ProjectActivity>): Promise<ProjectActivity> =>
  post(`/projects/${projectId}/activities`, data);

export const updateActivity = (activityId: string, data: Partial<ProjectActivity>): Promise<ProjectActivity> =>
  put(`/projects/activities/${activityId}`, data);

export const deleteActivity = (activityId: string): Promise<void> =>
  del(`/projects/activities/${activityId}`);

// ─── Members (Compartilhamento) ───────────────────────────────────────────────

export const getProjectMembers = (projectId: string): Promise<ProjectMember[]> =>
  get(`/projects/${projectId}/members`);

export const addProjectMember = (
  projectId: string,
  userId: string,
  role: 'viewer' | 'editor' = 'viewer'
): Promise<ProjectMember> =>
  post(`/projects/${projectId}/members`, { user_id: userId, role });

export const removeProjectMember = (projectId: string, userId: string): Promise<void> =>
  del(`/projects/${projectId}/members/${userId}`);
