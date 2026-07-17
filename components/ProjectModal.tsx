import React, { useState, useLayoutEffect } from 'react';
import { Project } from '../services/projects';
import { User, Area, Client, ProjectPhase } from '../types';
import { X, Briefcase, Calendar, Users, AlignLeft, Plus, Trash2, ChevronUp, ChevronDown, MapPin, Building, Target } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { MultiSelect } from './MultiSelect';
import { RichTextEditor } from './RichTextEditor';
import type { ProjectCategoryConfig, ProjectStatusConfig, ProjectKpiConfig } from '../services/projectConfig';

interface ProjectModalProps {
  project?: Project | null;
  mode?: 'create' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Project>) => void;
  users: User[];
  areas: Area[];
  clients: Client[];
  currentUser: User;
  projects?: Project[];
  projectPhases: ProjectPhase[];
  onArchive?: (id: string) => void;
  projectCategories?: ProjectCategoryConfig[];
  projectStatuses?: ProjectStatusConfig[];
  projectKpis?: ProjectKpiConfig[];
}

const formatDateToInput = (dateStr?: string | null) => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

const normalizePhases = (phases: unknown): string[] => {
  if (Array.isArray(phases)) return phases;
  if (typeof phases === 'string' && phases.startsWith('[')) {
    try {
      const parsed = JSON.parse(phases);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return typeof phases === 'string' && phases ? [phases] : [];
};

const buildProjectFormData = (
  project: Project | null | undefined,
  currentUser: User,
  projectPhases: ProjectPhase[],
  mode: 'create' | 'edit' = project ? 'edit' : 'create'
): Partial<Project> => {
  if (project) {
    const selectedPhases = normalizePhases(project.selected_phases);
    return {
      ...project,
      name: project.name || '',
      description: project.description || '',
      category: project.category || 'Sustentação',
      status: project.status || 'Não iniciado/Backlog',
      owner_id: project.owner_id || '',
      dono_id: project.dono_id || '',
      demandante_area_id: project.demandante_area_id || '',
      client_id: project.client_id || '',
      start_date: formatDateToInput(project.start_date),
      end_date: formatDateToInput(project.end_date),
      phase: project.phase || 'Backlog',
      parent_id: project.parent_id || '',
      depends_on_id: project.depends_on_id || '',
      selected_phases: selectedPhases,
      kpi_ids: Array.isArray(project.kpi_ids)
        ? project.kpi_ids
        : (project.kpis || []).map(kpi => kpi.id),
      private: Boolean(project.private),
      other_members: project.shared_with ? project.shared_with.map(m => typeof m === 'string' ? m : m.user_id) : []
    };
  }

  if (mode === 'edit') {
    return {
      name: '',
      description: '',
      category: '',
      status: '',
      owner_id: '',
      dono_id: '',
      demandante_area_id: '',
      client_id: '',
      start_date: '',
      end_date: '',
      phase: '',
      parent_id: '',
      depends_on_id: '',
      selected_phases: [],
      kpi_ids: [],
      private: false,
      other_members: []
    };
  }

  return {
    name: '',
    description: '',
    category: 'Sustentação',
    status: 'Não iniciado/Backlog',
    owner_id: currentUser.id || '',
    dono_id: currentUser.id || '',
    demandante_area_id: currentUser.areaId || '',
    client_id: '',
    start_date: '',
    end_date: '',
    phase: 'Backlog',
    parent_id: '',
    depends_on_id: '',
    selected_phases: projectPhases.length > 0
      ? Array.from(new Set([...projectPhases.map(p => p.name), 'Sem fase específica']))
      : ['Backlog', 'Planejamento', 'Execução', 'Sem fase específica'],
    kpi_ids: [],
    private: false,
    other_members: []
  };
};

export const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  mode: explicitMode,
  isOpen,
  onClose,
  onSave,
  users,
  areas,
  clients,
  currentUser,
  projects = [],
  projectPhases = [],
  onArchive,
  projectCategories = [],
  projectStatuses = [],
  projectKpis = []
}) => {
  const mode = explicitMode || (project ? 'edit' : 'create');
  const [newPhase, setNewPhase] = useState('');
  const [formData, setFormData] = useState<Partial<Project>>(() => buildProjectFormData(project, currentUser, projectPhases, mode));

  useLayoutEffect(() => {
    if (!isOpen) return;
    setFormData(buildProjectFormData(project, currentUser, projectPhases, mode));
  }, [project?.id, isOpen, currentUser.id, currentUser.areaId, projectPhases, mode]);

  if (!isOpen) return null;

  if (mode === 'edit' && !project) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-8 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-[#0E1116] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Carregando dados atuais do projeto...</span>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-200">
                {mode === 'edit' ? 'Editar Projeto' : 'Novo Projeto'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Gestão de Portfólio de Projetos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="project-form" onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Nome do Projeto *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-gray-800 dark:text-gray-200"
                  placeholder="Ex: Migração Cloud..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <AlignLeft className="w-3 h-3" /> Descrição
                </label>
                <div className="z-0 relative">
                  <RichTextEditor
                    value={formData.description || ''}
                    onChange={val => setFormData({ ...formData, description: val })}
                    placeholder="Qual o objetivo principal deste projeto?"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Categoria</label>
                  <select
                    value={formData.category || 'Sustentação'}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
                  >
                    {(projectCategories.length > 0
                      ? projectCategories
                      : [
                          { id: 'sustentacao', name: 'Sustentação', position: 1 },
                          { id: 'estrategico', name: 'Estratégico', position: 2 },
                          { id: 'inovacao', name: 'Inovação', position: 3 },
                          { id: 'rpa', name: 'RPA', position: 4 },
                          { id: 'processos', name: 'Melhoria de Processos', position: 5 }
                        ]
                    ).map(category => <option key={category.id} value={category.name}>{category.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formData.status || 'Ativo'}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
                  >
                    {(projectStatuses.length > 0
                      ? projectStatuses
                      : [
                          { id: 'ativo', name: 'Ativo', color: '#374A67', position: 1 },
                          { id: 'impedido', name: 'Impedido', color: '#ef4444', position: 2 },
                          { id: 'atrasado', name: 'Atrasado', color: '#f97316', position: 3 },
                          { id: 'pausado', name: 'Pausado', color: '#6b7280', position: 4 },
                          { id: 'concluido', name: 'Concluído', color: '#0E1116', position: 5 },
                          { id: 'backlog', name: 'Não iniciado/Backlog', color: '#64748b', position: 6 },
                          { id: 'cancelado', name: 'Cancelado', color: '#991b1b', position: 7 }
                        ]
                    ).map(status => <option key={status.id} value={status.name}>{status.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  <Target className="w-4 h-4 text-[#374A67]" /> KPIs relacionados
                </label>
                <MultiSelect
                  label="KPIs"
                  emptyLabel="Nenhum KPI"
                  options={projectKpis.map(kpi => ({ label: kpi.name, value: kpi.id }))}
                  selectedValues={formData.kpi_ids || []}
                  onChange={kpiIds => setFormData({ ...formData, kpi_ids: kpiIds })}
                />
                <p className="mt-1.5 text-[10px] text-gray-400 font-medium">
                  Selecione um ou mais indicadores aos quais este projeto contribui.
                </p>
              </div>

              {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                <div className="flex items-center gap-3 p-3.5 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                  <input
                    type="checkbox"
                    id="project-private"
                    checked={formData.private || false}
                    onChange={e => setFormData({ ...formData, private: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="project-private" className="block text-sm font-bold text-gray-800 dark:text-gray-200 cursor-pointer">
                      Projeto Privado
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Apenas você e Administradores globais poderão visualizar este projeto e suas tarefas atreladas.
                    </p>
                  </div>
                </div>
              )}

              {(currentUser.role === 'admin' || currentUser.pode_publicar) ? (
                <div className="flex items-center gap-3 p-3.5 bg-green-50/40 dark:bg-green-950/20 rounded-xl border border-green-100/50 dark:border-green-900/30">
                  <input
                    type="checkbox"
                    id="project-publicar-portal"
                    checked={formData.publicar_portal || false}
                    onChange={e => setFormData({ ...formData, publicar_portal: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="project-publicar-portal" className="block text-sm font-bold text-gray-800 dark:text-gray-200 cursor-pointer">
                      Publicar no Portal de Transparência
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Este projeto ficará visível publicamente no Portal de Transparência do cliente.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3.5 bg-gray-50/55 dark:bg-gray-900/20 rounded-xl border border-gray-150 dark:border-gray-700/50 opacity-75">
                  <input
                    type="checkbox"
                    id="project-publicar-portal-disabled"
                    checked={formData.publicar_portal || false}
                    disabled
                    className="w-4 h-4 text-gray-400 border-gray-300 rounded cursor-not-allowed"
                  />
                  <div>
                    <label htmlFor="project-publicar-portal-disabled" className="block text-sm font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed">
                      Publicar no Portal de Transparência
                    </label>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Apenas administradores ou gestores autorizados podem alterar a publicação deste projeto.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Projeto Pai (Subprojeto de)</label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
                  >
                    <option value="">Nenhum (Projeto Principal)</option>
                    {projects.filter(p => p.id !== project?.id).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Depende do Projeto</label>
                  <select
                    value={formData.depends_on_id || ''}
                    onChange={e => setFormData({ ...formData, depends_on_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
                  >
                    <option value="">Nenhum</option>
                    {projects.filter(p => p.id !== project?.id).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Data de Início</label>
                  <input
                    type="date"
                    value={formData.start_date || ''}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Data Estimada / Fim</label>
                  <input
                    type="date"
                    value={formData.end_date || ''}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                   <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                     <Users className="w-3 h-3" /> Dono do Projeto
                   </label>
                   <SearchableSelect
                     options={users.map(u => ({ label: u.name, value: u.id }))}
                     value={formData.dono_id || ''}
                     onChange={val => setFormData({ ...formData, dono_id: val })}
                     placeholder="Selecione um Dono..."
                   />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                     <Users className="w-3 h-3" /> Responsável Principal
                   </label>
                   <SearchableSelect
                     options={users.map(u => ({ label: u.name, value: u.id }))}
                     value={formData.owner_id || ''}
                     onChange={val => setFormData({ ...formData, owner_id: val })}
                     placeholder="Selecione um Responsável..."
                   />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-gray-300 uppercase mb-2">
                  <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Outros Envolvidos
                </label>
                <div className="mb-4">
                  <MultiSelect
                    label="Outros Envolvidos"
                    options={users
                      .filter(u => u.id !== formData.owner_id && u.id !== formData.dono_id)
                      .map(u => ({ label: u.name, value: u.id }))}
                    selectedValues={formData.other_members || []}
                    onChange={val => setFormData({ ...formData, other_members: val })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                     <MapPin className="w-3 h-3" /> Área Demandante
                   </label>
                   <SearchableSelect
                     options={areas.map(a => ({ label: a.name, value: a.id }))}
                     value={formData.demandante_area_id || ''}
                     onChange={val => setFormData({ ...formData, demandante_area_id: val })}
                     placeholder="Selecione uma área..."
                   />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Building className="w-3 h-3" /> Cliente Demandante
                </label>
                <select
                  value={formData.client_id || ''}
                  onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
                >
                  <option value="">Selecione o Cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Jornada do Projeto (Fases/Etapas)
                </label>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <select
                      value={newPhase}
                      onChange={e => setNewPhase(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-gray-800 dark:text-gray-200"
                    >
                      <option value="">Selecione uma fase...</option>
                      {projectPhases.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (newPhase.trim()) {
                           const current = formData.selected_phases || [];
                           if (!current.includes(newPhase.trim())) {
                             setFormData({...formData, selected_phases: [...current, newPhase.trim()]});
                           }
                           setNewPhase('');
                        }
                      }}
                      className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all flex items-center gap-2"
                    >
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    {(formData.selected_phases || []).map((phase, index) => {
                      const isFirst = index === 0;
                      const isLast = index === (formData.selected_phases?.length || 0) - 1;
                      const isFixed = false;
                      return (
                        <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg group">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-6 h-6 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-[10px] font-black text-gray-400 shrink-0">
                              {index + 1}
                            </div>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{phase}</span>
                            {isFixed && (
                              <span className="text-[9px] uppercase tracking-widest bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full font-black">Fixa</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                            <button
                              type="button"
                              disabled={isFirst || isFixed || (index > 0 && (formData.selected_phases || [])[index - 1] === 'Sem fase específica')}
                              onClick={() => {
                                const current = [...(formData.selected_phases || [])];
                                const temp = current[index - 1];
                                current[index - 1] = current[index];
                                current[index] = temp;
                                setFormData({...formData, selected_phases: current});
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md transition-colors"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={isLast || isFixed || (index < (formData.selected_phases?.length || 0) - 1 && (formData.selected_phases || [])[index + 1] === 'Sem fase específica')}
                              onClick={() => {
                                const current = [...(formData.selected_phases || [])];
                                const temp = current[index + 1];
                                current[index + 1] = current[index];
                                current[index] = temp;
                                setFormData({...formData, selected_phases: current});
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md transition-colors"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={isFixed}
                              onClick={() => {
                                if (window.confirm("Tarefas desta etapa ficarão na etapa 'Sem Fase Específica'. Deseja Aprovar ou Cancelar?")) {
                                  const current = formData.selected_phases || [];
                                  setFormData({...formData, selected_phases: current.filter((_, i) => i !== index)});
                                }
                              }}
                              className={`p-1.5 ml-1 rounded-md transition-all ${isFixed ? 'text-gray-300 dark:text-gray-600 opacity-50 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 border border-transparent hover:border-red-100 dark:hover:border-red-800'}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {(formData.selected_phases || []).length === 0 && (
                      <span className="text-xs font-medium text-gray-400">Nenhuma fase adicionada. Adicione pelo menos uma.</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between items-center rounded-b-2xl">
          <div>
            {project && onArchive && (
              <button
                type="button"
                onClick={() => onArchive(project.id)}
                className="px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all flex items-center gap-2"
              >
                <Trash2 size={16} /> Arquivar Projeto
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:text-gray-200 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="project-form"
              className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow shadow-blue-200 rounded-xl transition-all flex items-center gap-2"
            >
              {project ? 'Salvar Alterações' : 'Criar Projeto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
