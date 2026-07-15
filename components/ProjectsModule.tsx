import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Filter, Clock, ChevronRight, ChevronDown, ChevronUp,
  Briefcase, CircleAlert, TriangleAlert, CircleCheck,
  ChartPie, Pen, Trash2, SquareCheckBig, User as UserIcon, Users,
  LayoutGrid, List, Layers, Archive, ArrowUpDown, Lock, Globe2
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Project, ProjectKPIs, getProjects, getProjectKPIs, getProjectById, deleteProject, createProject, updateProject } from '../services/projects';
import { ProjectModal } from './ProjectModal';
import { ProjectDetails } from './ProjectDetails';
import { ProjectKanbanBoard } from './ProjectKanbanBoard';
import { GanttChart } from './GanttChart';
import { User, Area, Client, Tag, KanbanBucket, ProjectPhase } from '../types';
import { MultiSelect } from './MultiSelect';
import { HierarchicalAreaSelect } from './HierarchicalAreaSelect';
import { getAreaDescendants, getHierarchicalAreaFilterIds } from '../utils';
import { FilterSidebar } from './FilterSidebar';
import type { ProjectCategoryConfig, ProjectStatusConfig, ProjectKpiConfig } from '../services/projectConfig';
interface ProjectsModuleProps {
  currentUser: User;
  users: User[];
  areas: Area[];
  tags: Tag[];
  clients: Client[];
  isManager: boolean;
  buckets?: KanbanBucket[];
  projectPhases?: ProjectPhase[];
  projectCategories?: ProjectCategoryConfig[];
  projectStatuses?: ProjectStatusConfig[];
  projectKpis?: ProjectKpiConfig[];
  notificationTarget?: string | null;
  onNotificationTargetHandled?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Não iniciado/Backlog': 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-700',
  'Em andamento': 'text-blue-600 bg-blue-50 border-blue-100 dark:border-blue-800',
  'Concluído': 'text-[#0E1116] bg-[#E6FAFC] border-[#0E1116]/20',
  'Cancelado': 'text-red-600 bg-red-50 border-red-100 dark:border-red-800'
};

function StatusIndicator({ label, count, color, icon: Icon }: any) {
  const styles: any = {
    red: "bg-red-50 text-red-700 border-red-100 dark:border-red-800",
    yellow: "bg-orange-50 text-orange-700 border-orange-100 dark:border-orange-800",
    green: "bg-[#E6FAFC] text-[#0E1116] border-[#0E1116]/20"
  };
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${styles[color]}`}>
      <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
        <Icon size={14} /> {label}
      </div>
      <span className="text-sm font-black">{count}</span>
    </div>
  );
}

function TypeProgress({ label, val, total, color }: any) {
  const pct = total > 0 ? (val / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1.5 font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        <span>{label}</span>
        <span className="text-gray-900 dark:text-gray-300 font-black">{val}</span>
      </div>
      <div className="w-full bg-gray-50 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden shadow-inner">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }}></div>
      </div>
    </div>
  );
}

const getPlainProjectDescription = (description?: string | null) => {
  if (!description) return '';

  return description
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

export const ProjectsModule: React.FC<ProjectsModuleProps> = ({ currentUser, users, areas, tags, clients, isManager, buckets = [], projectPhases = [] }) => {
  const defaultAreaFilter = useMemo(() => [], []);
  const currentAreaName = useMemo(
    () => areas.find(area => area.id === currentUser.areaId)?.name || '',
    [areas, currentUser.areaId]
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [kpis, setKpis] = useState<ProjectKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Filters & Views
  const [search, setSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<'mine' | 'area'>('area');
  const [areaFilter, setAreaFilter] = useState<string[]>(defaultAreaFilter);
  const [portalVisibilityFilter, setPortalVisibilityFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [dateStartFilter, setDateStartFilter] = useState('');
  const [dateEndFilter, setDateEndFilter] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'deadline' | 'execution'>('deadline');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban' | 'gantt'>('grid');
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'category' | 'responsible'>('none');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('deadline');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const expandedAreaFilter = useMemo(() => getHierarchicalAreaFilterIds(areaFilter, areas), [areaFilter, areas]);
  const activeFilterCount = (memberFilter.length > 0 ? 1 : 0) +
                            (ownerFilter.length > 0 ? 1 : 0) +
                            (areaFilter.length > 0 ? 1 : 0) +
                            (portalVisibilityFilter !== 'all' ? 1 : 0) +
                            (dateStartFilter || dateEndFilter ? 1 : 0) +
                            (groupBy !== 'none' ? 1 : 0);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortProjects = (projectsToSort: Project[]) => {
    return [...projectsToSort].sort((a, b) => {
      let valA: any, valB: any;
      switch (sortColumn) {
        case 'name':
          valA = a.name?.toLowerCase() || '';
          valB = b.name?.toLowerCase() || '';
          break;
        case 'category':
          valA = a.category?.toLowerCase() || '';
          valB = b.category?.toLowerCase() || '';
          break;
        case 'coop_area':
          valA = ((clients.find(c => c.id === a.client_id)?.name || '') + ' / ' + (areas.find(ar => ar.id === a.demandante_area_id)?.name || '')).toLowerCase();
          valB = ((clients.find(c => c.id === b.client_id)?.name || '') + ' / ' + (areas.find(ar => ar.id === b.demandante_area_id)?.name || '')).toLowerCase();
          break;
        case 'responsible':
          valA = (users.find(u => u.id === a.owner_id)?.name || 'Sem Responsável').toLowerCase();
          valB = (users.find(u => u.id === b.owner_id)?.name || 'Sem Responsável').toLowerCase();
          break;
        case 'status':
          valA = a.status || '';
          valB = b.status || '';
          break;
        case 'deadline':
          valA = a.end_date || '9999-12-31';
          valB = b.end_date || '9999-12-31';
          break;
        case 'progress':
          valA = a.progress || 0;
          valB = b.progress || 0;
          break;
        default:
          valA = a.end_date || '9999-12-31';
          valB = b.end_date || '9999-12-31';
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsRes, kpisRes] = await Promise.all([
        getProjects({ limit: '100' }),
        getProjectKPIs()
      ]);

      const sanitized = projectsRes.data.map((p: any) => ({
        ...p,
        selected_phases: Array.isArray(p.selected_phases)
          ? p.selected_phases
          : (typeof p.selected_phases === 'string' && p.selected_phases.startsWith('[')
              ? JSON.parse(p.selected_phases)
              : (p.selected_phases ? [p.selected_phases] : []))
      }));

      setProjects(sanitized);
      setKpis(kpisRes);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  useEffect(() => {
    setAreaFilter(defaultAreaFilter);
  }, [defaultAreaFilter]);

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete);
      setProjectToDelete(null);
      loadData();
    }
  };

  const handleSaveProject = async (data: Partial<Project>) => {
    try {
      if (editingProject) {
        const updatedProject = await updateProject(editingProject.id, data);
        if (selectedProject?.id === editingProject.id) {
          setSelectedProject(updatedProject);
        }
      } else {
        await createProject(data);
      }
      setIsModalOpen(false);
      setProjectModalMode(null);
      setEditingProject(null);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar projeto', error);
      alert('Erro ao salvar projeto. Tente novamente.');
    }
  };

  const openEditProject = async (project: Project) => {
    setProjectModalMode('edit');
    setEditingProject(null);
    setIsModalOpen(true);
    try {
      const freshProject = await getProjectById(project.id);
      setEditingProject({
        ...freshProject,
        selected_phases: Array.isArray(freshProject.selected_phases)
          ? freshProject.selected_phases
          : (typeof (freshProject.selected_phases as any) === 'string' && (freshProject.selected_phases as any).startsWith('[')
              ? JSON.parse(freshProject.selected_phases as any)
              : ((freshProject.selected_phases as any) ? [freshProject.selected_phases as any] : []))
      });
    } catch (error) {
      console.error('Erro ao carregar projeto atualizado para edição:', error);
      setEditingProject(project);
    }
  };

  const openProjectDetails = async (project: Project) => {
    try {
      const freshProject = await getProjectById(project.id);
      setSelectedProject(freshProject);
    } catch (error) {
      console.error('Erro ao carregar projeto atualizado:', error);
      setSelectedProject(project);
    }
  };

  const userAllowedAreas = useMemo(() => {
    if (currentUser.role === 'admin') return areas.map(a => a.id);
    const currentArea = areas.find(a => a.id === currentUser.areaId);
    const rootAreaId = currentArea?.parentId || currentUser.areaId;
    return getAreaDescendants([rootAreaId], areas);
  }, [currentUser, areas]);

  const getProjectAreaIds = (project: Project) => [
    project.area_id,
    project.demandante_area_id
  ].filter(Boolean) as string[];

  const projectMatchesAreaFilter = (project: Project, allowedAreaIds: string[]) => {
    if (allowedAreaIds.length === 0) return true;
    return getProjectAreaIds(project).some(areaId => allowedAreaIds.includes(areaId));
  };

  const isUserInTeamScope = (userId?: string | null) => {
    if (!userId) return false;
    const user = users.find(u => u.id === userId);
    return Boolean(user?.areaId && userAllowedAreas.includes(user.areaId));
  };

  const isProjectInTeamScope = (project: Project) => {
    if (currentUser.role === 'admin') return true;

    const isAllowedArea = getProjectAreaIds(project).some(areaId => userAllowedAreas.includes(areaId));
    const isDirectlyLinkedToMe =
      project.owner_id === currentUser.id ||
      project.dono_id === currentUser.id ||
      project.creator_id === currentUser.id ||
      project.shared_with?.some((m: any) => m.user_id === currentUser.id);

    const isLinkedToTeamUser =
      isUserInTeamScope(project.owner_id) ||
      isUserInTeamScope(project.dono_id) ||
      isUserInTeamScope(project.creator_id);

    const isSharedWithTeam = project.shared_with?.some((m: any) => {
      if (m.area_id && userAllowedAreas.includes(m.area_id)) return true;
      return isUserInTeamScope(m.user_id);
    });

    return isAllowedArea || isDirectlyLinkedToMe || isLinkedToTeamUser || Boolean(isSharedWithTeam);
  };

  const filteredProjects = projects.filter(p => {
    // RESTRIÇÃO GLOBAL: equipe vê projetos ligados à gerência ou compartilhados com ela.
    if (currentUser.role !== 'admin') {
      if (!isProjectInTeamScope(p)) {
        return false;
      }
    }

    // 1. Text Search (Name, Description, and Cross-filters)
    const plainDescription = getPlainProjectDescription(p.description);
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (plainDescription && plainDescription.toLowerCase().includes(search.toLowerCase())) ||
      (users.find(u => u.id === p.owner_id)?.name.toLowerCase().includes(search.toLowerCase())) ||
      (users.find(u => u.id === p.dono_id)?.name.toLowerCase().includes(search.toLowerCase())) ||
      (areas.find(a => a.id === p.demandante_area_id)?.name.toLowerCase().includes(search.toLowerCase())) ||
      (clients.find(c => c.id === p.client_id)?.name.toLowerCase().includes(search.toLowerCase()));

    const matchMember = memberFilter.length === 0 || (p.owner_id && memberFilter.includes(p.owner_id));
    const matchOwner = ownerFilter.length === 0 || (p.dono_id && ownerFilter.includes(p.dono_id));
    const matchArea = projectMatchesAreaFilter(p, expandedAreaFilter);
    const matchPortalVisibility = portalVisibilityFilter === 'all' ||
      (portalVisibilityFilter === 'published' && !!p.publicar_portal) ||
      (portalVisibilityFilter === 'unpublished' && !p.publicar_portal);
    const matchMine = userFilter === 'area' || p.owner_id === currentUser.id || p.dono_id === currentUser.id || p.creator_id === currentUser.id || (p.shared_with && p.shared_with.some((m: any) => m.user_id === currentUser.id));
    let matchDate = true;
    if (dateStartFilter || dateEndFilter) {
      if (dateFilterType === 'deadline') {
        if (dateStartFilter) matchDate = matchDate && (p.end_date !== null && p.end_date.substring(0, 10) >= dateStartFilter);
        if (dateEndFilter) matchDate = matchDate && (p.end_date !== null && p.end_date.substring(0, 10) <= dateEndFilter);
      } else {
        if (dateStartFilter) matchDate = matchDate && (p.end_date === null || p.end_date.substring(0, 10) >= dateStartFilter);
        if (dateEndFilter) matchDate = matchDate && (p.created_at !== null && p.created_at.substring(0, 10) <= dateEndFilter);
      }
    }

    return matchesSearch && matchMember && matchOwner && matchArea && matchPortalVisibility && matchDate && matchMine && !p.archived;
  });

  const availableUsers = useMemo(() => {
    const ids = new Set<string>();
    const baseProjects = expandedAreaFilter.length > 0 ? projects.filter(p => projectMatchesAreaFilter(p, expandedAreaFilter)) : projects;
    baseProjects.forEach(p => {
      if (p.owner_id) ids.add(p.owner_id);
      if (p.dono_id) ids.add(p.dono_id);
    });
    return users.filter(u => ids.has(u.id));
  }, [projects, users, expandedAreaFilter]);

  const groupedProjects = useMemo(() => {
    if (groupBy === 'none') return { 'Todos os Projetos': filteredProjects };
    return filteredProjects.reduce((acc, project) => {
      let key = 'Outros';
      if (groupBy === 'status') key = project.status || 'Sem status';
      else if (groupBy === 'category') key = project.category || 'Sem Categoria';
      else if (groupBy === 'responsible') key = users.find(u => u.id === project.owner_id)?.name || 'Sem Responsável';

      if (!acc[key]) acc[key] = [];
      acc[key].push(project);
      return acc;
    }, {} as Record<string, Project[]>);
  }, [filteredProjects, groupBy]);

  const getDeadlineStatus = (endDate: string | undefined) => {
    if (!endDate) return 'prazo';
    const today = new Date();
    const deadline = parseISO(endDate);
    const diffDays = differenceInDays(deadline, today);

    if (diffDays < 0) return 'atrasado';
    if (diffDays <= 10) return 'risco';
    return 'prazo';
  };

  const deadlineStats = useMemo(() => {
    return projects.reduce((acc, p) => {
      if (p.status === 'Concluído' || p.status === 'Cancelado') return acc;
      const status = getDeadlineStatus(p.end_date);
      acc[status]++;
      return acc;
    }, { atrasado: 0, risco: 0, prazo: 0 });
  }, [projects]);

  const categoryStats = useMemo(() => {
    return projects.reduce((acc, p) => {
      const cat = p.category || 'Outros';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [projects]);

  if (selectedProject) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <ProjectDetails
          project={selectedProject}
          onBack={() => {
            setSelectedProject(null);
            loadData();
          }}
          onEdit={() => {
            openEditProject(selectedProject);
          }}
          onUpdate={(updated) => setSelectedProject(updated)}
          users={users}
          tags={tags}
          areas={areas}
          clients={clients}
          currentUser={currentUser}
          isManager={isManager}
          buckets={buckets}
          projects={projects}
        />

        <ProjectModal
          key={`${projectModalMode || 'closed'}-${editingProject?.id || 'new'}`}
          isOpen={isModalOpen && (projectModalMode === 'create' || projectModalMode === 'edit')}
          onClose={() => {
            setIsModalOpen(false);
            setProjectModalMode(null);
            setEditingProject(null);
          }}
          onSave={handleSaveProject}
          mode={projectModalMode || 'create'}
          project={projectModalMode === 'edit' ? editingProject : null}
          users={users}
          areas={areas}
          clients={clients}
          currentUser={currentUser}
          projects={projects}
          projectPhases={projectPhases}
          onArchive={(id) => {
            setProjectToDelete(id);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProjectToDelete(null)}
              className="absolute inset-0 bg-[#080A0D]/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="p-10 text-center space-y-8">
                <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-orange-50/50">
                  <Archive size={40} className="text-[#374A67]" />
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-[#0E1116] dark:text-gray-100 uppercase tracking-tighter mb-2">Arquivar Projeto?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed px-4">
                    O projeto <span className="font-black text-[#374A67] block my-1">"{projects.find(p => p.id === projectToDelete)?.name}"</span> será movido para a lixeira. Somente administradores poderão recuperá-lo.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={async () => {
                      if (projectToDelete) {
                        const proj = projects.find(p => p.id === projectToDelete);
                        if (proj) {
                          await updateProject(projectToDelete, { archived: true });
                          setProjectToDelete(null);
                          loadData();
                        }
                      }
                    }}
                    className="w-full py-4 bg-[#374A67] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-200 hover:bg-[#e67a1d] hover:-translate-y-0.5 active:scale-95 transition-all"
                  >
                    Sim, Arquivar Projeto
                  </button>
                  <button
                    onClick={() => setProjectToDelete(null)}
                    className="w-full py-4 bg-gray-50 dark:bg-gray-700 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
                  >
                    Não, Manter Projeto
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-4 border-b border-gray-200 dark:border-gray-600/50">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-300 tracking-tighter uppercase leading-none">Projetos</h2>
          <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
            <Briefcase size={12} className="text-[#374A67]" />
            <span className="opacity-50">Área Responsável:</span>
            <span className="text-[#0E1116]">{currentAreaName || 'Geral'}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm">
            <div className="w-2 h-2 rounded-full bg-[#00b04c] animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{kpis?.active_projects || 0} Demandas Ativas</span>
          </div>
          <button onClick={() => { setEditingProject(null); setProjectModalMode('create'); setIsModalOpen(true); }} className="btn-primary">
            <Plus size={20} /> Novo Projeto
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm p-4 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm relative z-10">
        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4">

          {/* GRUPO 1: Modos de Visualização */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 hidden md:flex">
               <Filter size={14} className="text-gray-400" />
            </div>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-xl gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm text-[#0E1116]' : 'text-gray-400 hover:text-gray-600 dark:text-gray-300'}`}
                title="Visão em Grid"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm text-[#0E1116]' : 'text-gray-400 hover:text-gray-600 dark:text-gray-300'}`}
                title="Visão em Lista"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-800 shadow-sm text-[#0E1116]' : 'text-gray-400 hover:text-gray-600 dark:text-gray-300'}`}
                title="Kanban Global"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h4v18H4z"/><path d="M10 3h4v11h-4z"/><path d="M16 3h4v18h-4z"/></svg>
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'gantt' ? 'bg-white dark:bg-gray-800 shadow-sm text-[#0E1116]' : 'text-gray-400 hover:text-gray-600 dark:text-gray-300'}`}
                title="Gráfico de Gantt"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h10"/><path d="M8 12h6"/><path d="M8 18h8"/><path d="M3 3v18"/><path d="M3 21h18"/></svg>
              </button>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-lg transition-all ml-1 ${isSidebarOpen ? 'bg-[#0E1116] text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'}`}
                title="Estatísticas"
              >
                <span className="text-[9px] font-black uppercase tracking-widest px-1">Stats</span>
              </button>
            </div>

            <div className="h-7 w-px bg-gray-200 dark:bg-gray-600 hidden xl:block"></div>
            <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 border border-gray-100 dark:border-gray-700 rounded-xl gap-1">
              <button onClick={() => setUserFilter('mine')} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${userFilter === 'mine' ? 'bg-white dark:bg-gray-800 text-[#0E1116] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                <UserIcon size={12} /> Minhas
              </button>
              <button onClick={() => setUserFilter('area')} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${userFilter === 'area' ? 'bg-white dark:bg-gray-800 text-[#0E1116] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                <Users size={12} /> Todas
              </button>
            </div>
          </div>

          {/* GRUPO 2: Pesquisa e Botão de Filtros */}
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[130px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
               type="text"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Pesquisar projetos..."
               className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl font-bold text-[10px] outline-none focus:ring-2 focus:ring-[#374A67]/20 transition-all shadow-sm placeholder:text-gray-300"
              />
            </div>

            <button
              onClick={() => setIsFilterSidebarOpen(true)}
              className={`flex-none px-4 py-2 text-gray-700 dark:text-gray-200 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-2 relative ${activeFilterCount > 0 ? 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50' : 'bg-gray-100 dark:bg-gray-700 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              <Filter size={14} className={activeFilterCount > 0 ? 'text-[#374A67]' : ''} /> Filtros Avançados
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#374A67] text-white rounded-full flex items-center justify-center text-[9px] shadow-sm">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isSidebarOpen ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-8 items-start`}>
        {/* Left Stats Sidebar */}
        {isSidebarOpen && (
          <div className="lg:col-span-1 space-y-6 sticky top-48">
            <div className="card-premium p-4">
              <h3 className="font-black text-[#0E1116] dark:text-gray-100 mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest border-b border-gray-50 pb-2">
                <Clock size={14} className="text-[#374A67]" /> Status de Prazos (Ativos)
              </h3>
              <div className="space-y-2">
                 <StatusIndicator label="Atrasados" count={deadlineStats.atrasado} color="red" icon={CircleAlert} />
                 <StatusIndicator label="Em Risco" count={deadlineStats.risco} color="yellow" icon={TriangleAlert} />
                 <StatusIndicator label="No Prazo" count={deadlineStats.prazo} color="green" icon={CircleCheck} />
              </div>
            </div>

            <div className="card-premium p-4">
              <h3 className="font-black text-[#0E1116] dark:text-gray-100 mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest border-b border-gray-50 pb-2">
                <ChartPie size={14} className="text-[#374A67]" /> Categorias
              </h3>
              <div className="space-y-4">
                {Object.keys(categoryStats).map((cat, idx) => {
                  const colors = ['#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];
                  return (
                    <TypeProgress
                      key={cat}
                      label={cat}
                      val={categoryStats[cat] || 0}
                      total={projects.length}
                      color={colors[idx % colors.length]}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Projects Main Content - Refined List View */}
        <div className={isSidebarOpen ? 'lg:col-span-3 space-y-6' : 'lg:col-span-1 w-full space-y-6'}>
          {loading ? (
             <div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-[#0E1116] border-t-transparent rounded-full animate-spin"></div></div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-gray-800 rounded-[40px] border-2 border-dashed border-gray-100 dark:border-gray-700 text-gray-400 gap-4">
               <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Briefcase size={40} className="opacity-20" />
               </div>
               <p className="font-black uppercase tracking-widest text-xs">Nenhum projeto encontrado</p>
            </div>
          ) : viewMode === 'kanban' ? (
            <ProjectKanbanBoard
              projects={filteredProjects}
              users={users}
              areas={areas}
              onProjectStatusChange={async (projectId, newStatus) => {
                await updateProject(projectId, { status: newStatus });
                loadData();
              }}
              onProjectClick={openProjectDetails}
            />
          ) : viewMode === 'gantt' ? (
            <GanttChart projects={filteredProjects} />
          ) : (
            Object.entries(groupedProjects).map(([groupName, groupProjects]) => (
              <div key={groupName} className="space-y-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {groupBy !== 'none' && (
                  <h3 className="font-black text-[#0E1116] dark:text-gray-100 text-xs uppercase tracking-widest border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                     <Layers size={14} className="text-[#374A67]" />
                     {groupName} <span className="text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-[9px]">{groupProjects.length}</span>
                  </h3>
                )}
                {viewMode === 'grid' ? (
                  <div className="space-y-6">
                    {groupProjects.filter(p => !p.parent_id || !projects.some(parent => parent.id === p.parent_id)).map((project) => {
                      const isClosed = project.status === 'Concluído' || project.status === 'Cancelado';
                      const deadlineStatus = isClosed ? 'prazo' : getDeadlineStatus(project.end_date);

                      const statusLabels: Record<string, { label: string, color: string, ring: string }> = {
                        atrasado: { label: 'Atrasado', color: 'text-red-600 bg-red-50 border-red-100 dark:border-red-800', ring: 'ring-red-100' },
                        risco: { label: 'Em Risco', color: 'text-orange-600 bg-orange-50 border-orange-100 dark:border-orange-800', ring: 'ring-orange-100' },
                        prazo: { label: 'No Prazo', color: 'text-[#0E1116] bg-[#E6FAFC] border-[#0E1116]/20', ring: 'ring-[#0E1116]/20' }
                      };

                      const dynamicProgress = project.progress || 0;
                      const subprojects = groupProjects.filter(sub => sub.parent_id === project.id);
                      const isExpanded = expandedProjects.has(project.id);

                      const renderCard = (p: Project, isSub: boolean) => {
                        const pIsClosed = p.status === 'Concluído' || p.status === 'Cancelado';
                        const pDeadlineStatus = pIsClosed ? 'prazo' : getDeadlineStatus(p.end_date);
                        const pDynamicProgress = p.progress || 0;
                        const hasSub = !isSub && subprojects.length > 0;

                        return (
                          <div
                            key={p.id}
                            className={`bg-white dark:bg-gray-800 p-7 rounded-[32px] border ${isSub ? 'border-l-4 border-l-blue-400 ml-8 mt-4' : 'border-gray-100 dark:border-gray-700'} shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 group relative overflow-hidden`}
                          >
                            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                              pIsClosed ? 'bg-gray-300' :
                              pDeadlineStatus === 'atrasado' ? 'bg-red-500' :
                              pDeadlineStatus === 'risco' ? 'bg-[#374A67]' : 'bg-[#0E1116]'
                            } opacity-30 group-hover:opacity-100 transition-opacity`} />

                            <div className="absolute top-6 right-8 flex gap-2 transition-all duration-300">
                              <button className="w-10 h-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm" onClick={(e) => { e.stopPropagation(); openEditProject(p); }}>
                                  <Pen size={18} />
                              </button>
                              {(isManager || p.creator_id === currentUser.id) && (
                                <button
                                  className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToDelete(p.id);
                                  }}
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>

                            <div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
                              <div className="flex-1 min-w-0 space-y-5">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="px-3 py-1 bg-[#0E1116]/5 text-[#0E1116] border border-[#0E1116]/10 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                                    {p.category || 'Geral'}
                                  </span>
                                  <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${STATUS_COLORS[p.status] || STATUS_COLORS['Não iniciado/Backlog']}`}>
                                    {p.status}
                                  </span>
                                  {p.publicar_portal && (
                                    <span
                                      title="Publicado no Portal de Transparência"
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border border-sky-100 bg-sky-50 text-sky-700 shadow-sm dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
                                    >
                                      <Globe2 size={11} /> Portal
                                    </span>
                                  )}
                                  {!pIsClosed && (
                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ring-4 ring-opacity-20 ${statusLabels[pDeadlineStatus].color} ${statusLabels[pDeadlineStatus].ring}`}>
                                      {statusLabels[pDeadlineStatus].label}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-black text-gray-900 dark:text-gray-300 text-xl leading-tight uppercase tracking-tighter flex items-center gap-2">
                                    {p.private && <Lock size={18} className="text-gray-400" />}
                                    {p.name}
                                    {hasSub && (
                                      <button onClick={(e) => toggleExpand(p.id, e)} className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        {subprojects.length} Subprojetos
                                      </button>
                                    )}
                                  </h4>
                                  <p className="text-xs text-gray-400 font-medium line-clamp-1 mt-2 tracking-tight opacity-70 italic">"{getPlainProjectDescription(p.description) || 'Sem descrição detalhada'}"</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs pt-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsável:</span>
                                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-gray-600">
                                      <img
                                        src={users.find(u => u.id === p.owner_id)?.avatarUrl || `https://ui-avatars.com/api/?name=${users.find(u => u.id === p.owner_id)?.name || 'Sem+Responsavel'}&background=005C46&color=fff`}
                                        className="w-4 h-4 rounded-md shadow-sm"
                                        alt="Dono"
                                      />
                                      <span className="font-bold text-gray-700 dark:text-gray-300 text-[10px]">{users.find(u => u.id === p.owner_id)?.name || 'Sem Responsável'}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coop/Área:</span>
                                    <span className="font-bold text-gray-600 dark:text-gray-400 text-[10px] bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-gray-600">
                                      {clients.find(c => c.id === p.client_id)?.name || '---'} / {areas.find(a => a.id === p.demandante_area_id)?.name || '---'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="w-full md:w-52 bg-gray-50 dark:bg-gray-700 p-5 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-inner">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Dash Geral</span>
                                    <span className="text-sm font-black text-[#0E1116] tracking-tighter">{pDynamicProgress}%</span>
                                </div>
                                <div className="w-full h-3 bg-white dark:bg-gray-800 rounded-full overflow-hidden shadow-inner p-[2px] border border-gray-100 dark:border-gray-700">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pDynamicProgress}%` }}
                                      className="h-full bg-[#0E1116] rounded-full shadow-[0_0_15px_rgba(14,17,22,0.4)] transition-all duration-1000"
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <Clock size={10} /> Total Horas
                                  </span>
                                  <span className="text-xs font-black text-gray-700 dark:text-gray-300">
                                    {p.total_hours || 0}h
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end pr-6 h-full justify-center gap-4">
                                <div className="text-right">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block opacity-40">
                                    {p.end_date ? 'Prazo' : 'Sem Prazo'}
                                  </span>
                                  {p.end_date && (
                                    <div className="w-12 h-12 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center shadow-sm">
                                        <span className="text-[9px] font-black text-[#374A67] uppercase leading-none">{format(parseISO(p.end_date), 'MMM').replace('.', '')}</span>
                                        <span className="text-lg font-black text-gray-900 dark:text-gray-300 leading-none">{format(parseISO(p.end_date), 'dd')}</span>
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={(e) => { e.stopPropagation(); openProjectDetails(p); }}
                                  className="flex items-center gap-2 px-6 py-3 bg-[#0E1116] text-white rounded-xl font-bold text-sm hover:bg-[#080A0D] transition-colors shadow-md"
                                >
                                  Visualizar <ChevronRight size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                        >
                          {renderCard(project, false)}

                          {/* Subprojects Accordion */}
                          {isExpanded && subprojects.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-8 mt-2 space-y-4"
                            >
                              {subprojects.map(sub => renderCard(sub, true))}
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {[
                            { key: 'name', label: 'Projeto', className: 'p-5 pl-8' },
                            { key: 'category', label: 'Categoria', className: 'p-5' },
                            { key: 'coop_area', label: 'Coop / Área', className: 'p-5' },
                            { key: 'responsible', label: 'Responsável', className: 'p-5' },
                            { key: 'status', label: 'Status', className: 'p-5' },
                            { key: 'deadline', label: 'Prazo', className: 'p-5' },
                            { key: 'progress', label: 'Progresso', className: 'p-5' },
                          ].map(col => (
                            <th
                              key={col.key}
                              onClick={() => handleSort(col.key)}
                              className={`${col.className} cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition-colors select-none group/th`}
                            >
                              <span className="flex items-center gap-1">
                                {col.label}
                                {sortColumn === col.key ? (
                                  sortDirection === 'asc'
                                    ? <ChevronUp size={10} className="text-[#374A67]" />
                                    : <ChevronDown size={10} className="text-[#374A67]" />
                                ) : (
                                  <ArrowUpDown size={10} className="text-gray-300 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                                )}
                              </span>
                            </th>
                          ))}
                          <th className="p-5 text-right pr-8">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortProjects(groupProjects).map((project) => {
                          const isClosed = project.status === 'Concluído' || project.status === 'Cancelado';
                          const deadlineStatus = isClosed ? 'prazo' : getDeadlineStatus(project.end_date);
                          const statusLabels: Record<string, { label: string, color: string, ring: string }> = {
                            atrasado: { label: 'Atrasado', color: 'text-red-600 bg-red-50 border-red-100 dark:border-red-800', ring: 'ring-red-100' },
                            risco: { label: 'Em Risco', color: 'text-orange-600 bg-orange-50 border-orange-100 dark:border-orange-800', ring: 'ring-orange-100' },
                            prazo: { label: 'No Prazo', color: 'text-[#0E1116] bg-[#E6FAFC] border-[#0E1116]/20', ring: 'ring-[#0E1116]/20' }
                          };
                          const dynamicProgress = project.progress || 0;
                          return (
                            <tr
                              key={project.id}
                              onClick={() => openProjectDetails(project)}
                              className="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                            >
                              <td className="p-5 pl-8">
                                <h4 className="font-black text-gray-900 dark:text-gray-300 text-sm uppercase tracking-tighter group-hover:text-[#374A67] transition-colors flex items-center gap-2">
                                  {project.private && <Lock size={14} className="text-gray-400" />}
                                  {project.publicar_portal && (
                                    <Globe2
                                      size={14}
                                      className="text-sky-600 dark:text-sky-300 shrink-0"
                                      aria-label="Publicado no Portal de Transparência"
                                    />
                                  )}
                                  {project.name}
                                </h4>
                                <p className="text-[10px] text-gray-400 font-medium line-clamp-1 mt-1 tracking-tight italic">"{getPlainProjectDescription(project.description) || 'Sem descrição'}"</p>
                              </td>
                              <td className="p-5">
                                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase">{project.category || 'Geral'}</span>
                              </td>
                              <td className="p-5">
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                  {clients.find(c => c.id === project.client_id)?.name || '---'} / {areas.find(a => a.id === project.demandante_area_id)?.name || '---'}
                                </span>
                              </td>
                              <td className="p-5">
                                <span className="text-[10px] text-gray-400">{users.find(u => u.id === project.owner_id)?.name || 'Sem responsável'}</span>
                              </td>
                              <td className="p-5">
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${STATUS_COLORS[project.status] || STATUS_COLORS['Não iniciado/Backlog']}`}>
                                  {project.status}
                                </span>
                              </td>
                              <td className="p-5">
                                {!isClosed ? (
                                  <div className="flex flex-col gap-1">
                                    <span className={`w-fit px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ring-2 ring-opacity-20 ${statusLabels[deadlineStatus].color} ${statusLabels[deadlineStatus].ring}`}>
                                      {statusLabels[deadlineStatus].label}
                                    </span>
                                    {project.end_date && (
                                      <span className="text-[10px] text-gray-400 font-medium">{format(parseISO(project.end_date), 'dd/MM/yyyy')}</span>
                                    )}
                                  </div>
                                ) : (
                                  project.end_date && (
                                    <span className="text-[10px] text-gray-400 font-medium">{format(parseISO(project.end_date), 'dd/MM/yyyy')}</span>
                                  )
                                )}
                              </td>
                              <td className="p-5">
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 max-w-[100px] h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
                                      <div className="h-full bg-[#0E1116] rounded-full" style={{ width: `${dynamicProgress}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-black text-[#0E1116]">{dynamicProgress}%</span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                    <Clock size={10} /> {project.total_hours || 0}h
                                  </span>
                                </div>
                              </td>
                              <td className="p-5 pr-8 text-right">
                                <div className="flex justify-end gap-2 transition-opacity">
                                  <button className="w-8 h-8 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all" onClick={(e) => { e.stopPropagation(); openEditProject(project); }}>
                                    <Pen size={14} />
                                  </button>
                                  {(isManager || project.creator_id === currentUser.id) && (
                                    <button
                                      className="w-8 h-8 flex items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setProjectToDelete(project.id);
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ProjectModal
        key={`${projectModalMode || 'closed'}-${editingProject?.id || 'new'}`}
        isOpen={isModalOpen && (projectModalMode === 'create' || projectModalMode === 'edit')}
        onClose={() => {
          setIsModalOpen(false);
          setProjectModalMode(null);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        mode={projectModalMode || 'create'}
        project={projectModalMode === 'edit' ? editingProject : null}
        users={users}
        areas={areas}
        clients={clients}
        currentUser={currentUser}
        projects={projects}
        projectPhases={projectPhases}
        onArchive={(id) => {
          setProjectToDelete(id);
          setIsModalOpen(false);
          setProjectModalMode(null);
        }}
      />

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => {
          setMemberFilter([]);
          setOwnerFilter([]);
          setGroupBy('none');
          setAreaFilter(defaultAreaFilter);
          setPortalVisibilityFilter('all');
          setDateStartFilter('');
          setDateEndFilter('');
          setDateFilterType('deadline');
        }}
      >
        <div className="space-y-6">
          {/* Agrupar */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <Layers size={14} className="text-[#374A67]" /> Agrupar por
            </label>
            <div className="relative">
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="w-full pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-[#374A67]/30 appearance-none shadow-sm"
              >
                  <option value="none">Nenhum agrupamento</option>
                  <option value="status">Status</option>
                  <option value="category">Categoria</option>
                  <option value="responsible">Responsável</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-700"></div>

          {/* Seleção de Área */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Área / Gerência
            </label>
            <HierarchicalAreaSelect
              label="Filtrar por Área"
              areas={areas}
              selectedValues={areaFilter}
              onChange={setAreaFilter}
            />
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-700"></div>

          {/* Portal de Transparência */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <Globe2 size={14} className="text-sky-600 dark:text-sky-300" /> Portal de Transparência
            </label>
            <div className="relative">
              <select
                value={portalVisibilityFilter}
                onChange={(e) => setPortalVisibilityFilter(e.target.value as any)}
                className="w-full pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-[#374A67]/30 appearance-none shadow-sm"
              >
                <option value="all">Todos os projetos</option>
                <option value="published">Publicado no Portal</option>
                <option value="unpublished">Não publicado no Portal</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-700"></div>

          {/* Responsáveis */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Responsável
              </label>
              <MultiSelect
                label="Selecionar Responsável"
                options={availableUsers.map(u => ({ label: u.name, value: u.id }))}
                selectedValues={memberFilter}
                onChange={setMemberFilter}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Dono do Projeto
              </label>
              <MultiSelect
                label="Selecionar Dono"
                options={availableUsers.map(u => ({ label: u.name, value: u.id }))}
                selectedValues={ownerFilter}
                onChange={setOwnerFilter}
              />
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-700"></div>

          {/* Datas */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Filtro de Período
              </label>
              <div className="relative">
                <select
                  value={dateFilterType}
                  onChange={(e) => setDateFilterType(e.target.value as any)}
                  className="w-full pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-[#374A67]/30 appearance-none shadow-sm"
                >
                  <option value="deadline">Prazo Final</option>
                  <option value="execution">Execução</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Data Inicial</label>
                <input
                  type="date"
                  value={dateStartFilter}
                  onChange={(e) => setDateStartFilter(e.target.value)}
                  className="w-full px-2 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-[10px] text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-[#374A67]/30 transition-all shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Data Final</label>
                <input
                  type="date"
                  value={dateEndFilter}
                  onChange={(e) => setDateEndFilter(e.target.value)}
                  className="w-full px-2 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-[10px] text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-[#374A67]/30 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </FilterSidebar>
    </div>
  );
};
