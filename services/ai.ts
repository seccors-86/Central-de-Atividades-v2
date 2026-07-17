import { AIConfiguration, AIModelOption, AIReportTemplate, AIReportVariable, AISummary, AISummaryRequest, AIStatus, AIProvider } from '../types';
import * as api from './api';

export const aiService = {
  getStatus: (): Promise<AIStatus> => api.get('/ai/status'),
  getTemplates: (): Promise<AIReportTemplate[]> => api.get('/ai/templates'),
  getTemplateVariables: (): Promise<AIReportVariable[]> => api.get('/ai/template-variables'),
  createTemplate: (template: Omit<AIReportTemplate, 'id' | 'builtIn'>): Promise<AIReportTemplate> => api.post('/ai/templates', template),
  updateTemplate: (id: string, template: Omit<AIReportTemplate, 'id' | 'builtIn'>): Promise<AIReportTemplate> =>
    api.put(`/ai/templates/${encodeURIComponent(id)}`, template),
  deleteTemplate: (id: string): Promise<void> => api.del(`/ai/templates/${encodeURIComponent(id)}`),
  resetTemplates: (): Promise<AIReportTemplate[]> => api.post('/ai/templates/reset', {}),
  getConfiguration: (): Promise<AIConfiguration> => api.get('/ai/config'),
  listModels: (provider: AIProvider, apiKey?: string): Promise<{ models: AIModelOption[] }> =>
    api.post('/ai/models', { provider, apiKey: apiKey || undefined }),
  saveConfiguration: (configuration: { enabled: boolean; provider: AIProvider; model: string; apiKey?: string }) =>
    api.put('/ai/config', configuration),
  generateReport: (request: AISummaryRequest): Promise<AISummary> => api.post('/ai/reports', request),
  getHistory: (): Promise<AISummary[]> => api.get('/ai-summaries'),
  deleteReport: (id: string): Promise<void> => api.del(`/ai-summaries/${encodeURIComponent(id)}`)
};
