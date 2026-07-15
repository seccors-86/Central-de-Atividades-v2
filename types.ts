export interface Client {
  id: string;
  name: string;
}

export interface Area {
  id: string;
  name: string;
  parentId?: string; // ID da Gerência Superior (se for subárea)
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'member';
  areaId: string;
  avatarUrl?: string;
  cpf?: string;
  phone?: string;
  available_hours?: number;
  password?: string;
  pode_publicar?: boolean;
  mfaEnabled?: boolean;
}

export interface TaskTag {
  id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  entity_type: 'project' | 'task' | 'suggestion';
  entity_id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  content: string;
  created_at: string;
  task_title?: string;
}

export interface Suggestion {
  id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  title: string;
  description: string;
  status: 'Em Avaliação' | 'Em Desenvolvimento' | 'Lançado' | 'Recusado';
  created_at: string;
  updated_at: string;
  votes: number;
  voted_by: string[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface KanbanBucket {
  id: string;
  name: string;
  color: string;
  position: number;
  created_at?: string;
}

export interface ProjectPhase {
  id: string;
  name: string;
  color: string;
  position: number;
  created_at?: string;
}

export interface StatusConfig {
  id: string;
  label: string;
  color: string; // Tailwind class string for background/text
  type: 'success' | 'warning' | 'neutral' | 'error';
}

export interface ActivityLog {
  id: string;
  userId: string;
  date: string; // ISO String YYYY-MM-DD
  content: string;
  status: string; // References StatusConfig.id
  tagIds: string[];
  timestamp: number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TimeLog {
  id?: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  subtaskId?: string; // Vincula este tempo a uma subtarefa específica
}

export interface Task {
  id: string;
  title: string;
  description: string;
  notes?: string;
  ownerId: string; // Responsável principal
  memberIds: string[]; // Outros envolvidos
  startDate: string;
  deadline: string;
  progress: number; // 0-100
  status: string;
  areaId: string;
  tagIds: string[]; // Tags classificatórias
  subtasks?: Subtask[]; // Checklist
  projectId?: string; // Se existir, é uma Atividade de Projeto. Se não, é uma Tarefa Local.
  projectName?: string; // Nome do projeto para exibição rápida no board unificado.
  flowStep?: string; // Jornada do projeto / fase
  priority?: string;
  hours?: string;
  timeLogs?: TimeLog[];
  taskType: 'activity' | 'support';
  archived?: boolean;
  client?: string; // Para vínculo de esforço com cliente
  demandanteAreaId?: string;
  publicarPortal?: boolean;
  commentsCount?: number;
}

export interface AISummary {
  id: string;
  date: string;
  content: string;
  periodStart: string;
  periodEnd: string;
}

export interface AISummaryRequest {
  logs: ActivityLog[];
  users: User[];
}

// Gamification Types
export interface Badge {
  id: string;
  name: string;
  icon: string; // Lucide icon name or emoji
  minXp: number;
  color?: string;
  description: string;
  badgeType?: 'level' | 'streak';
  colorGradient?: string;
  imageUrl?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface UserBadge extends Badge {
  unlockedAt: string;
  reason?: string;
}

export interface SuggestionVoter {
  id: string;
  name: string;
  photo: string | null;
  area_name: string | null;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  rewardXp: number;
  rewardBadgeId?: string;
  targetMetric: 'tasks_done' | 'board_streak' | 'support_closed';
  targetValue: number;
  active: boolean;
}

export interface UserCampaign extends Campaign {
  progress: number;
  completed: boolean;
  completedAt?: string | null;
}

export interface GamificationProfile {
  userId: string;
  name: string;
  photo?: string | null;
  areaName?: string | null;
  xpTotal: number;
  level: number;
  currentStreak: number;
  maxStreak: number;
  lastActivityDate?: string | null;
  badges: UserBadge[];
  campaigns: UserCampaign[];
}

export interface XPResult {
  xpAdded: number;
  xpTotal: number;
  level: number;
  levelUp: boolean;
  currentStreak: number;
  newBadges: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    colorGradient: string;
    imageUrl?: string;
  }>;
  campaignUpdates: Array<{
    campaignId: string;
    title: string;
    progress: number;
    target: number;
    completed: boolean;
    rewardXp: number;
  }>;
}

export interface ScoringRule {
  id: string;
  name: string;
  xpValue: number;
  updatedAt?: string;
}
