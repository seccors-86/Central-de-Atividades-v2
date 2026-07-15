import { ActivityLog, User } from '../types';
import { API_BASE_URL } from './api';

export const generateWeeklySummary = async (logs: ActivityLog[], users: User[]): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/weekly-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ logs, users })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha ao gerar resumo.');
    return data.content;
  } catch (error: any) {
    console.error('Erro ao gerar resumo:', error);
    return error.message || 'Ocorreu um erro ao gerar o resumo com IA.';
  }
};
