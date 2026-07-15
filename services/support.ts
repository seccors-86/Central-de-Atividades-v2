import { get, post, put, del } from './api';

export interface SupportTicket {
  id: string;
  title: string;
  queue: string;
  category: string;
  status: string;
  priority: string;
  responsible: string;
  responsible_id: string | null;
  requesting_area: string;
  demand_description: string;
  details: string;
  time_spent: string;
  outcome: string | null;
  attachments: any[];
  creator_id: string;
  area_id: string;
  area_name?: string;
  created_at: string;
  in_progress_at: string | null;
  completed_at: string | null;
}

export interface SupportStats {
  todo_count: number;
  in_progress_count: number;
  validation_count: number;
  done_count: number;
  urgent_count: number;
  avg_resolution_hours: number | null;
  by_queue: { queue: string; total: number; resolved: number }[];
  by_category: { category: string; total: number }[];
}

export const QUEUES = ['LUNA', 'AUTOMATE', 'GERAL', 'OUTROS'] as const;
export const CATEGORIES = ['Dúvida', 'Erro / Bug', 'Nova demanda', 'Melhoria', 'Acesso / Permissão'] as const;
export const PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente'] as const;
export const TICKET_STATUSES = ['A fazer', 'Em andamento', 'Validação', 'Concluído'] as const;

// ─── Tickets ─────────────────────────────────────────────────────────────────

export const getTickets = (params?: Record<string, string>): Promise<SupportTicket[]> => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return get(`/support${qs}`);
};

export const createTicket = (data: Partial<SupportTicket>): Promise<SupportTicket> =>
  post('/support', data);

export const updateTicket = (id: string, data: Partial<SupportTicket>): Promise<SupportTicket> =>
  put(`/support/${id}`, data);

export const deleteTicket = (id: string): Promise<void> =>
  del(`/support/${id}`);

export const getSupportStats = (): Promise<SupportStats> =>
  get('/support/stats');
