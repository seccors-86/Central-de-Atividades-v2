import { authService } from './auth';

// API Base URL Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function for API requests
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, defaultOptions);

    if (response.status === 401) {
      // Token inválido ou expirado - limpar sessão e redirecionar para login
      // Não lançar erro para evitar tela de erro intermediária
      authService.logout();
      return new Promise(() => {}); // Nunca resolve - aguarda reload da página
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

// GET request
export async function get(endpoint: string) {
  return apiRequest(endpoint, { method: 'GET' });
}

// POST request
export async function post(endpoint: string, data: any) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// PUT request
export const put = async (endpoint: string, data: any): Promise<any> => {
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// DELETE request
export async function del(endpoint: string) {
  return apiRequest(endpoint, { method: 'DELETE' });
}
