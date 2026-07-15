import * as api from './api';
import { ProjectPhase } from '../types';

export const getPhases = async (): Promise<ProjectPhase[]> => {
  const response = await api.get('/project-phases');
  return response;
};

export const createPhase = async (phaseData: Partial<ProjectPhase>): Promise<ProjectPhase> => {
  const response = await api.post('/project-phases', phaseData);
  return response;
};

export const updatePhase = async (id: string, phaseData: Partial<ProjectPhase>): Promise<ProjectPhase> => {
  const response = await api.put(`/project-phases/${id}`, phaseData);
  return response;
};

export const deletePhase = async (id: string): Promise<void> => {
  await api.del(`/project-phases/${id}`);
};
