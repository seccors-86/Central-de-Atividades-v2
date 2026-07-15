import { get, post, put, del } from './api';

export interface ProjectCategoryConfig {
  id: string;
  name: string;
  position: number;
}

export interface ProjectStatusConfig {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface ProjectKpiConfig {
  id: string;
  name: string;
  position: number;
}

export interface ProjectConfigResponse {
  categories: ProjectCategoryConfig[];
  statuses: ProjectStatusConfig[];
  kpis: ProjectKpiConfig[];
}

const sortByName = <T extends { name: string }>(items: T[] = []) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

export const sortProjectConfig = (data: ProjectConfigResponse): ProjectConfigResponse => ({
  categories: sortByName(data.categories),
  statuses: sortByName(data.statuses),
  kpis: sortByName(data.kpis)
});

export const getProjectConfig = async (): Promise<ProjectConfigResponse> => {
  const config = await get('/project-config') as ProjectConfigResponse;
  return sortProjectConfig(config);
};
export const createProjectCategory = (data: Partial<ProjectCategoryConfig>) => post('/project-config/categories', data);
export const updateProjectCategory = (id: string, data: Partial<ProjectCategoryConfig>) => put(`/project-config/categories/${id}`, data);
export const deleteProjectCategory = (id: string) => del(`/project-config/categories/${id}`);
export const createProjectStatus = (data: Partial<ProjectStatusConfig>) => post('/project-config/statuses', data);
export const updateProjectStatus = (id: string, data: Partial<ProjectStatusConfig>) => put(`/project-config/statuses/${id}`, data);
export const deleteProjectStatus = (id: string) => del(`/project-config/statuses/${id}`);
export const createProjectKpi = (data: Partial<ProjectKpiConfig>) => post('/project-config/kpis', data);
export const updateProjectKpi = (id: string, data: Partial<ProjectKpiConfig>) => put(`/project-config/kpis/${id}`, data);
export const deleteProjectKpi = (id: string) => del(`/project-config/kpis/${id}`);
