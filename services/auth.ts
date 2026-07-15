const API_URL = import.meta.env.VITE_API_URL || '/api';
export const authService = {
  login: async (loginInfo: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ login: loginInfo, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao realizar login');
    }

    const data = await response.json();
    if (data.user && !data.mfaSetupRequired) sessionStorage.setItem('@CentralAtividades:user', JSON.stringify(data.user));
    return data;
  },

  verifyMfa: async (code: string) => {
    const response = await fetch(`${API_URL}/auth/mfa/verify`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Código MFA inválido.');
    sessionStorage.setItem('@CentralAtividades:user', JSON.stringify(data.user));
    return data;
  },

  recover: async (loginInfo: string) => {
    const response = await fetch(`${API_URL}/auth/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ login: loginInfo }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao recuperar senha');
    }

    return response.json();
  },

  logout: () => {
    sessionStorage.removeItem('@CentralAtividades:user');
    fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => undefined);
    window.location.reload();
  },

  getToken: () => {
    return null;
  },

  getUser: () => {
    const user = sessionStorage.getItem('@CentralAtividades:user');
    return user ? JSON.parse(user) : null;
  },

  updateUser: (user: any) => {
    sessionStorage.setItem('@CentralAtividades:user', JSON.stringify(user));
  },

  isAuthenticated: () => {
    return !!sessionStorage.getItem('@CentralAtividades:user');
  }
};
