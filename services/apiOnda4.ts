import { Comment, Suggestion } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = () => {
  return { 'Content-Type': 'application/json' };
};

export const getProjectAllComments = async (projectId: string): Promise<Comment[]> => {
  const response = await fetch(`${API_URL}/comments/project/${projectId}/all`, {
    headers: getHeaders(), credentials: 'include'
  });
  if (!response.ok) throw new Error('Falha ao buscar comentários');
  return response.json();
};

export const getComments = async (entityType: string, entityId: string): Promise<Comment[]> => {
  const response = await fetch(`${API_URL}/comments/${entityType}/${entityId}`, {
    headers: getHeaders(), credentials: 'include'
  });
  if (!response.ok) throw new Error('Falha ao buscar comentários');
  return response.json();
};

export const createComment = async (comment: Partial<Comment>): Promise<Comment> => {
  const response = await fetch(`${API_URL}/comments`, {
    method: 'POST',
    headers: getHeaders(), credentials: 'include',
    body: JSON.stringify(comment)
  });
  if (!response.ok) throw new Error('Falha ao criar comentário');
  return response.json();
};

export const deleteComment = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/comments/${id}`, {
    method: 'DELETE',
    headers: getHeaders(), credentials: 'include'
  });
  if (!response.ok) throw new Error('Falha ao excluir comentário');
};

export const updateComment = async (id: string, content: string): Promise<Comment> => {
  const response = await fetch(`${API_URL}/comments/${id}`, {
    method: 'PUT',
    headers: getHeaders(), credentials: 'include',
    body: JSON.stringify({ content })
  });
  if (!response.ok) throw new Error('Falha ao atualizar comentário');
  return response.json();
};

export const getSuggestions = async (): Promise<Suggestion[]> => {
  const response = await fetch(`${API_URL}/suggestions`, {
    headers: getHeaders(), credentials: 'include'
  });
  if (!response.ok) throw new Error('Falha ao buscar sugestões');
  return response.json();
};

export const createSuggestion = async (suggestion: Partial<Suggestion>): Promise<Suggestion> => {
  const response = await fetch(`${API_URL}/suggestions`, {
    method: 'POST',
    headers: getHeaders(), credentials: 'include',
    body: JSON.stringify(suggestion)
  });
  if (!response.ok) throw new Error('Falha ao criar sugestão');
  return response.json();
};

export const updateSuggestionStatus = async (id: string, status: string): Promise<Suggestion> => {
  const response = await fetch(`${API_URL}/suggestions/${id}/status`, {
    method: 'PUT',
    headers: getHeaders(), credentials: 'include',
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Falha ao atualizar status da sugestão');
  return response.json();
};

export const toggleVote = async (id: string, userId: string): Promise<{ action: string }> => {
  const response = await fetch(`${API_URL}/suggestions/${id}/vote`, {
    method: 'POST',
    headers: getHeaders(), credentials: 'include',
    body: JSON.stringify({ user_id: userId })
  });
  if (!response.ok) throw new Error('Falha ao computar voto');
  return response.json();
};
export const updateSuggestion = async (id: string, data: Partial<Suggestion>): Promise<Suggestion> => {
  const response = await fetch(`${API_URL}/suggestions/${id}`, {
    method: 'PUT',
    headers: getHeaders(), credentials: 'include',
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Falha ao atualizar sugestão');
  return response.json();
};

export const deleteSuggestion = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/suggestions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(), credentials: 'include'
  });
  if (!response.ok) throw new Error('Falha ao excluir sugestão');
};

export const getSuggestionVoters = async (id: string): Promise<{ id: string, name: string, photo: string, area_name: string }[]> => {
  const response = await fetch(`${API_URL}/suggestions/${id}/voters`, {
    headers: getHeaders(), credentials: 'include'
  });
  if (!response.ok) throw new Error('Falha ao buscar votos');
  return response.json();
};
