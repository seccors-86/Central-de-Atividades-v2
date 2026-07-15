import { del, get, post, put } from './api';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read_at?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
}

export const getNotifications = (): Promise<AppNotification[]> => get('/notifications');
export const markNotificationRead = (id: string): Promise<AppNotification> => put(`/notifications/${id}/read`, {});
export const markAllNotificationsRead = (): Promise<{ success: boolean }> => put('/notifications/read-all', {});
export const deleteNotification = (id: string): Promise<{ success: boolean }> => del(`/notifications/${id}`);
export const clearNotifications = (): Promise<{ success: boolean }> => del('/notifications/clear');
export const sendBroadcastNotification = (data: { title: string; message: string; type?: string; userIds?: string[] }) =>
  post('/notifications/broadcast', data);
