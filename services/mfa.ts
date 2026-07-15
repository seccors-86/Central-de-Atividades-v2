import { API_BASE_URL } from './api';
import { authService } from './auth';

const request = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}/mfa${path}`, {
    ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao configurar MFA.');
  return data;
};

export const mfaService = {
  getConfig: () => request('/config'),
  setRequired: (enabled: boolean) => request('/config', { method: 'PUT', body: JSON.stringify({ enabled }) }),
  beginSetup: () => request('/setup', { method: 'POST' }),
  confirmSetup: async (code: string) => {
    const data = await request('/confirm', { method: 'POST', body: JSON.stringify({ code }) });
    if (data.user) authService.updateUser(data.user);
    return data;
  },
  disable: (password: string, code: string) => request('/disable', { method: 'POST', body: JSON.stringify({ password, code }) }),
  resetUser: (userId: string) => request(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
};
