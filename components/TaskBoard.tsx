import React, { useState } from 'react';
import { Task, User, Tag, TimeLog, KanbanBucket, Area } from '../types';
import { Project } from '../services/projects';
import { getTagStyle, getTagChartColorHex } from "../tagUtils";
import { format, parseISO, differenceInDays, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MultiSelect } from './MultiSelect';
import { HierarchicalAreaSelect } from './HierarchicalAreaSelect';
import { getHierarchicalAreaFilterIds } from '../utils';
import { FilterSidebar } from './FilterSidebar';
import {
  LayoutGrid,
  AlignJustify,
  Clock,
  Briefcase,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Plus,
  Search,
  Pen,
  Trash2,
  Filter,
  Users,
  User as UserIcon,
  Play,
  Square,
  UserPlus,
  PieChart,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  MapPin,
  MessageSquare,
  Globe2
} from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  users: User[];
  tags: Tag[];
  currentUserId: string;
  isManager: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdateTask: (task: Task) => void;
  simpleMode?: boolean;
  buckets?: KanbanBucket[];
  projects?: Project[];
  areas?: Area[];
  initialViewMode?: 'kanban' | 'list';
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  users,
  tags,
  currentUserId,
  isManager,
  onEdit,
  onDelete,
  onUpdateTask,
  simpleMode = false,
  buckets = [],
  projects = [],
  areas = [],
  initialViewMode = 'kanban'
}) => {
  const [viewMode, setViewMode] = useState<'kanban'|'list'>(initialViewMode);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'owner' | 'project' | 'phase'>('status');
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [projectFilters, setProjectFilters] = useState<string[]>([]);
  const [areaFilters, setAreaFilters] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<'mine' | 'area'>(simpleMode ? 'area' : 'mine');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('deadline');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const activeFilterCount = typeFilters.length + priorityFilters.length + statusFilters.length + projectFilters.length + areaFilters.length + (groupBy !== 'status' ? 1 : 0);

  const sortTasks = (tasksToSort: Task[]) => {
    return [...tasksToSort].sort((a, b) => {
      let valA: any, valB: any;
      switch (sortColumn) {
        case 'title': valA = a.title?.toLowerCase() || ''; valB = b.title?.toLowerCase() || ''; break;
        case 'owner': valA = getUser(a.ownerId)?.name?.toLowerCase() || ''; valB = getUser(b.ownerId)?.name?.toLowerCase() || ''; break;
        case 'status': valA = a.status || ''; valB = b.status || ''; break;
        case 'project': valA = a.projectId?.toLowerCase() || 'zzz'; valB = b.projectId?.toLowerCase() || 'zzz'; break;
        case 'deadline': valA = a.deadline || '9999'; valB = b.deadline || '9999'; break;
        case 'progress': valA = a.progress || 0; valB = b.progress || 0; break;
        case 'phase': valA = a.flowStep || ''; valB = b.flowStep || ''; break;
        case 'priority': {
          const order: Record<string, number> = { 'urgente': 0, 'alta': 1, 'média': 2, 'baixa': 3 };
          valA = order[a.priority?.toLowerCase() || 'média'] ?? 2;
          valB = order[b.priority?.toLowerCase() || 'média'] ?? 2;
          break;
        }
        default: valA = a.deadline || '9999'; valB = b.deadline || '9999';
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getUser = (id: string) => users.find(u => u.id === id);
  const getTags = (ids: any) => {
    if (!Array.isArray(ids)) return [];
    return tags.filter(t => ids.includes(t.id));
  };

  const safeFormatDate = (dateStr: string | undefined, formatStr: string) => {
    try {
      if (!dateStr) return '--/--';
      return format(parseISO(dateStr), formatStr, { locale: ptBR });
    } catch (e) {
      return '--/--';
    }
  };

  const handleToggleTimer = (task: Task) => {
    const isRunning = task.timeLogs?.some(tl => tl && !tl.endTime && tl.userId === currentUserId);
    const now = new Date().toISOString();

    let updatedLogs = [...(task.timeLogs || [])];

    if (isRunning) {
      updatedLogs = updatedLogs.map(tl => {
        if (tl && !tl.endTime && tl.userId === currentUserId) {
          const start = parseISO(tl.startTime);
          const end = new Date();
          const duration = differenceInSeconds(end, start);
          return { ...tl, endTime: now, durationSeconds: duration };
        }
        return tl;
      });
    } else {
      updatedLogs.push({ startTime: now, userId: currentUserId });
    }

    onUpdateTask({ ...task, timeLogs: updatedLogs, status: 'doing' });
  };

  const handleAssumeTask = (task: Task) => {
    if (window.confirm('Deseja assumir esta tarefa? Você passará a ser o responsável principal.')) {
      onUpdateTask({ ...task, ownerId: currentUserId });
    }
  };

  const getStatusColor = (task: Task) => {
    if (task.progress === 100) return 'bg-[#0E1116]';
    if (task.progress === 0) return 'bg-gray-400';

    const today = new Date();
    const deadline = parseISO(task.deadline);
    const daysLeft = differenceInDays(deadline, today);

    if (daysLeft < 0) return 'bg-red-500';
    if (daysLeft <= 2) return 'bg-yellow-500';
    return 'bg-[#374A67]';
  };

  const getDeadlineStatus = (task: Task) => {
     if (task.progress === 100) return 'done';
     try {
       const today = new Date();
       const deadline = parseISO(task.deadline);
       const diff = differenceInDays(deadline, today);

       if (diff < 0) return 'delayed';
       if (diff <= 2) return 'warning';
       return 'ontime';
     } catch (e) {
       return 'ontime';
     }
  };

  const getStatusLabel = (task: Task): { label: string; color: string } => {
    const status = task.status || 'todo';
    // Tenta encontrar o bucket correspondente
    if (buckets && buckets.length > 0) {
      const bucket = buckets.find(b => b.id === status);
      if (bucket) return { label: bucket.name, color: bucket.color || '' };
    }
    // Fallback para labels padrão
    if (status === 'done' || task.progress === 100) return { label: 'Concluído', color: 'bg-[#0E1116] text-white' };
    if (status === 'doing' || (task.progress > 0 && task.progress < 100)) return { label: 'Em Andamento', color: 'bg-[#374A67] text-white' };
    if (status === 'impedimento' || status === 'empedimento') return { label: 'Impedimento', color: 'bg-red-500 text-white' };
    return { label: 'Backlog', color: 'bg-gray-400 text-white' };
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);

    if (task) {
      let activeSections: any[] = [];
      if (groupBy === 'status') {
        if (buckets && buckets.length > 0) {
          let visibleBuckets = buckets;
          if (projectFilters.length > 0 || simpleMode) {
            visibleBuckets = buckets.filter(b => {
              const hasTasks = filteredTasks.some(t => t.status === b.id);
              const isBasic = ['todo','doing','done'].includes(b.id) || b.name.toLowerCase().includes('fazer') || b.name.toLowerCase().includes('andamento') || b.name.toLowerCase().includes('concluíd');
              return hasTasks || isBasic;
            });
          }
          activeSections = visibleBuckets.map(b => ({ id: b.id, type: 'status', value: b.id }));
        } else {
          activeSections = [
            { id: 'todo', type: 'status', value: 'todo' },
            { id: 'doing', type: 'status', value: 'doing' },
            { id: 'done', type: 'status', value: 'done' },
          ];
        }
      } else if (groupBy === 'priority') {
        activeSections = [
          { id: 'urgente', type: 'priority', value: 'Urgente' },
          { id: 'alta', type: 'priority', value: 'Alta' },
          { id: 'média', type: 'priority', value: 'Média' },
          { id: 'baixa', type: 'priority', value: 'Baixa' },
        ];
      } else if (groupBy === 'owner') {
        const activeUserIds = Array.from(new Set(filteredTasks.map(t => t.ownerId).filter(Boolean)));
        if (!activeUserIds.includes(currentUserId)) activeUserIds.unshift(currentUserId);
        activeSections = activeUserIds.map(uid => ({ id: uid, type: 'owner', value: uid }));
      } else if (groupBy === 'project') {
        const projectIds = Array.from(new Set(filteredTasks.map(t => t.projectId || '__none__')));
        activeSections = projectIds.map(pid => ({ id: pid, type: 'project', value: pid === '__none__' ? null : pid }));
      } else if (groupBy === 'phase') {
        const phases = Array.from(new Set(filteredTasks.map(t => t.flowStep || '__none__')));
        activeSections = phases.map(ph => ({ id: ph, type: 'phase', value: ph === '__none__' ? null : ph }));
      }

      const targetSection = activeSections.find(s => s.id === targetSectionId);
      if (!targetSection) return;

      let updatedTask = { ...task };

      if (targetSection.type === 'status') {
        updatedTask.status = targetSection.value;
        const targetVal = targetSection.value.toLowerCase();

        if (targetVal === 'done' || targetVal === 'concluido' || targetVal === 'concluído') {
          updatedTask.progress = 100;
          updatedTask.subtasks = (updatedTask.subtasks || []).map(st => ({ ...st, completed: true }));
        } else if (targetVal === 'todo' || targetVal === 'backlog' || targetVal === 'a fazer') {
          updatedTask.progress = 0;
        } else {
          // Doing or other custom states
          if (updatedTask.progress === 100) {
            updatedTask.progress = 99;
          } else if (updatedTask.progress === 0) {
            updatedTask.progress = 10; // Give it a little bump so it shows as 'In Progress'
          }
        }
      } else if (targetSection.type === 'priority') {
        updatedTask.priority = targetSection.value;
      } else if (targetSection.type === 'owner') {
        updatedTask.ownerId = targetSection.value;
      } else if (targetSection.type === 'project') {
        updatedTask.projectId = targetSection.value || undefined;
      } else if (targetSection.type === 'phase') {
        updatedTask.flowStep = targetSection.value || undefined;
      }

      onUpdateTask(updatedTask);
    }
  };

  const expandedAreaFilter = React.useMemo(() => getHierarchicalAreaFilterIds(areaFilters, areas || []), [areaFilters, areas]);

  const getTaskAreaIds = (task: Task) => [
    task.areaId,
    task.demandanteAreaId,
    (task as any).area_id,
    (task as any).demandante_area_id
  ].filter(Boolean) as string[];

  const getProjectAreaIds = (project: Project) => [
    project.area_id,
    project.demandante_area_id
  ].filter(Boolean) as string[];

  const availableProjects = React.useMemo(() => {
    if (expandedAreaFilter.length === 0) return projects;
    return projects.filter(p => getProjectAreaIds(p).some(areaId => expandedAreaFilter.includes(areaId)));
  }, [projects, expandedAreaFilter]);

  const filteredTasks = tasks.filter(t => {
    if (t.archived) return false;
    if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase()) && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (typeFilters.length > 0 && !typeFilters.includes(t.taskType || 'activity')) return false;
    if (priorityFilters.length > 0 && !priorityFilters.includes(t.priority?.toLowerCase() || 'média')) return false;
    if (statusFilters.length > 0) {
      let tStatus = t.status || 'todo';
      if (!t.status) {
        if (t.progress === 100) tStatus = 'done';
        else if (t.progress > 0) tStatus = 'doing';
      }
      if (!statusFilters.includes(tStatus)) return false;
    }
    if (projectFilters.length > 0 && !projectFilters.includes(t.projectId || '')) return false;
    if (areaFilters.length > 0 && !getTaskAreaIds(t).some(areaId => expandedAreaFilter.includes(areaId))) return false;
    if (userFilter === 'mine') {
      return t.ownerId === currentUserId || t.memberIds?.includes(currentUserId);
    }
    return true;
  });

  let sections: any[] = [];
  if (groupBy === 'status') {
    if (buckets && buckets.length > 0) {
      let visibleBuckets = buckets;
      if (projectFilters.length > 0 || simpleMode) {
        visibleBuckets = buckets.filter(b => {
          const hasTasks = filteredTasks.some(t => t.status === b.id);
          const isBasic = ['todo','doing','done'].includes(b.id) || b.name.toLowerCase().includes('fazer') || b.name.toLowerCase().includes('andamento') || b.name.toLowerCase().includes('concluíd');
          return hasTasks || isBasic;
        });
      }
      sections = visibleBuckets.map(b => ({
        id: b.id,
        label: b.name,
        filter: (t: Task) => t.status === b.id,
        headerColor: b.color?.startsWith('#') ? '' : (b.color?.includes('green') || b.color?.includes('005C46') ? 'border-[#0E1116]' : b.color?.includes('blue') || b.color?.includes('orange') || b.color?.includes('f58220') ? 'border-[#374A67]' : 'border-gray-300 dark:border-gray-600'),
        headerStyle: b.color?.startsWith('#') ? { borderColor: b.color } : undefined,
        colorClasses: b.color || ''
      }));
    } else {
      sections = [
        { id: 'todo', label: 'A Fazer / Backlog', filter: (t: Task) => t.status === 'todo' || (!t.status && t.progress === 0), headerColor: 'border-gray-300 dark:border-gray-600' },
        { id: 'doing', label: 'Em Andamento', filter: (t: Task) => t.status === 'doing' || (!t.status && t.progress > 0 && t.progress < 100), headerColor: 'border-[#374A67]' },
        { id: 'done', label: 'Concluído', filter: (t: Task) => t.status === 'done' || (!t.status && t.progress === 100), headerColor: 'border-[#0E1116]' },
      ];
    }
  } else if (groupBy === 'priority') {
    sections = [
      { id: 'urgente', label: 'Urgente', filter: (t: Task) => t.priority?.toLowerCase() === 'urgente', headerColor: 'border-red-600' },
      { id: 'alta', label: 'Alta', filter: (t: Task) => t.priority?.toLowerCase() === 'alta', headerColor: 'border-red-400' },
      { id: 'média', label: 'Média', filter: (t: Task) => (!t.priority || t.priority?.toLowerCase() === 'média' || t.priority === undefined), headerColor: 'border-yellow-400' },
      { id: 'baixa', label: 'Baixa', filter: (t: Task) => t.priority?.toLowerCase() === 'baixa', headerColor: 'border-blue-400' },
    ];
  } else if (groupBy === 'owner') {
    const activeUserIds = Array.from(new Set(filteredTasks.map(t => t.ownerId).filter(Boolean)));
    if (!activeUserIds.includes(currentUserId)) activeUserIds.unshift(currentUserId);
    sections = activeUserIds.map(uid => {
      const u = getUser(uid);
      return {
        id: uid,
        label: u ? u.name : 'Desconhecido',
        filter: (t: Task) => t.ownerId === uid,
        headerColor: 'border-purple-400'
      };
    });
  } else if (groupBy === 'project') {
    const projectIds = Array.from(new Set(filteredTasks.map(t => t.projectId || '__none__').filter(Boolean)));
    // Projetos com nome primeiro, depois sem projeto
    const withProject = projectIds.filter(id => id !== '__none__').map(pid => {
      const proj = projects.find(p => p.id === pid);
      return {
        id: pid,
        label: proj?.name || 'Projeto Desconhecido',
        filter: (t: Task) => t.projectId === pid,
        headerColor: 'border-indigo-400',
        colorClasses: '#6366f1'
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
    const noProject = projectIds.includes('__none__') ? [{
      id: '__none__',
      label: 'Sem Projeto (Avulsas)',
      filter: (t: Task) => !t.projectId,
      headerColor: 'border-gray-400',
      colorClasses: '#9ca3af'
    }] : [];
    sections = [...withProject, ...noProject];
  } else if (groupBy === 'phase') {
    const phases = Array.from(new Set(filteredTasks.map(t => t.flowStep || '__none__').filter(Boolean)));
    const withPhase = phases.filter(id => id !== '__none__').map(pid => {
      return {
        id: pid,
        label: pid,
        filter: (t: Task) => t.flowStep === pid,
        headerColor: 'border-[#374A67]',
        colorClasses: '#374A67'
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
    const noPhase = phases.includes('__none__') ? [{
      id: '__none__',
      label: 'Sem Jornada',
      filter: (t: Task) => !t.flowStep,
      headerColor: 'border-gray-400',
      colorClasses: '#9ca3af'
    }] : [];
    sections = [...withPhase, ...noPhase];
  }

  const workloadStats = users.map(user => ({
    user,
    active: filteredTasks.filter(t => t.ownerId === user.id && t.progress < 100).length
  })).filter(s => s.active > 0).sort((a,b) => b.active - a.active).slice(0, 10);

  const deadlineStats = {
    delayed: filteredTasks.filter(t => t.progress < 100 && getDeadlineStatus(t) === 'delayed').length,
    warning: filteredTasks.filter(t => t.progress < 100 && getDeadlineStatus(t) === 'warning').length,
    ontime: filteredTasks.filter(t => t.progress < 100 && getDeadlineStatus(t) === 'ontime').length,
  };

  const clientStats = filteredTasks
    .filter(t => t.client)
    .reduce((acc, task) => {
      const coop = task.client!;
      if (!acc[coop]) acc[coop] = { count: 0, timeSeconds: 0 };
      acc[coop].count++;
      acc[coop].timeSeconds += (task.timeLogs || []).reduce((sum, log) => sum + (log?.durationSeconds || 0), 0);
      return acc;
    }, {} as Record<string, { count: number, timeSeconds: number }>);

  const coopStatsArray = Object.entries(clientStats)
    .map(([coop, stats]) => ({ coop, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalClosed = filteredTasks.filter(t => t.progress === 100).length;
  const totalInvestedSecondsClosed = filteredTasks.filter(t => t.progress === 100).reduce((acc, task) => {
    return acc + (task.timeLogs || []).reduce((sum, log) => sum + (log?.durationSeconds || 0), 0);
  }, 0);
  const avgLeadTimeSeconds = totalClosed > 0 ? totalInvestedSecondsClosed / totalClosed : 0;

  const formatTimeStr = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const tagStats = tags.map(tag => ({
    tag,
    count: filteredTasks.filter(t => t.tagIds?.includes(tag.id)).length
  })).filter(s => s.count > 0).sort((a,b) => b.count - a.count);

  const getPriorityIcon = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'alta': return <ArrowUpCircle className="text-red-500" size={12} />;
      case 'média': return <ArrowRightCircle className="text-yellow-500" size={12} />;
      case 'baixa': return <ArrowDownCircle className="text-blue-500" size={12} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* FILTERS BAR REWORKED */}
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm p-4 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm relative z-10">
        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4">

          {/* GRUPO 1: Visão + Filtro Usuário */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 hidden md:flex">
               <Filter size={14} className="text-gray-400" />
            </div>
            <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 border border-gray-100 dark:border-gray-700 rounded-xl gap-1">
              <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-800 text-[#0E1116] shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Quadro"><LayoutGrid size={14} /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-[#0E1116] shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Lista"><AlignJustify size={14} /></button>
              {!simpleMode && (
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${isSidebarOpen ? 'bg-[#0E1116] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`} title="Estatísticas">
                  <span className="text-[9px] font-black uppercase px-1">Stats</span>
                </button>
              )}
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

          {/* GRUPO 2: Busca e Botão de Filtros Avançados */}
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 xl:w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Pesquisar tarefas..." className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl font-bold text-[10px] outline-none focus:ring-2 focus:ring-[#374A67]/20 transition-all shadow-sm placeholder:text-gray-300" />
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

      <div className={`grid grid-cols-1 ${simpleMode || !isSidebarOpen ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} gap-6 items-start`}>
        {/* STATS SIDEBAR (Conditional) */}
        {!simpleMode && isSidebarOpen && (
          <div className="lg:col-span-1 space-y-6">
             {/* Deadline Stats */}
             <div className="bg-white dark:bg-gray-800 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Clock className="w-4 h-4 text-orange-400" /> Prazos
                </h3>
                <div className="space-y-2">
                   <div className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100 dark:border-red-800/50">
                      <span className="text-xs font-bold text-red-700">Atrasadas</span>
                      <span className="text-sm font-black text-red-700">{deadlineStats.delayed}</span>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-yellow-50/50 rounded-xl border border-yellow-100 dark:border-yellow-800/50">
                      <span className="text-xs font-bold text-yellow-700">Próximas</span>
                      <span className="text-sm font-black text-yellow-700">{deadlineStats.warning}</span>
                   </div>
                </div>
             </div>

                          {/* Lead Time & KPIs */}
             <div className="bg-white dark:bg-gray-800 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Clock className="w-4 h-4 text-[#0E1116]" /> Performance GPO
                </h3>
                <div className="space-y-4">
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Esforço Médio (Fechadas)</span>
                      <span className="text-xl font-black text-[#0E1116]">{formatTimeStr(avgLeadTimeSeconds)}</span>
                   </div>
                   <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div>
                         <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Entregas</span>
                         <span className="text-sm font-black text-gray-700 dark:text-gray-200">{totalClosed}</span>
                      </div>
                      <div>
                         <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Taxa Prazo</span>
                         <span className="text-sm font-black text-green-600">
                           {filteredTasks.length > 0 ? Math.round(((deadlineStats.ontime + totalClosed) / filteredTasks.length) * 100) : 0}%
                         </span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Coop Stats */}
             {coopStatsArray.length > 0 && (
               <div className="bg-white dark:bg-gray-800 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Briefcase className="w-4 h-4 text-teal-400" /> Clientes Top 5
                  </h3>
                  <div className="space-y-3">
                     {coopStatsArray.map(stat => (
                        <div key={stat.coop} className="flex flex-col gap-1 group">
                           <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate max-w-[130px]">{stat.coop}</span>
                              <span className="text-[10px] font-black px-2 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full">{stat.count}</span>
                           </div>
                           <span className="text-[9px] font-bold text-gray-400">Tempo Investido: {formatTimeStr(stat.timeSeconds)}</span>
                        </div>
                     ))}
                  </div>
               </div>
             )}

             {/* Workload */}
             <div className="bg-white dark:bg-gray-800 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Users className="w-4 h-4 text-blue-400" /> Carga
                </h3>
                <div className="space-y-3">
                   {workloadStats.map(stat => (
                      <div key={stat.user.id} className="flex items-center justify-between group">
                         <div className="flex items-center gap-2">
                            <img src={stat.user.avatarUrl} className="w-6 h-6 rounded-full border border-gray-100 dark:border-gray-700" />
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:text-[#374A67] transition-colors">{stat.user.name.split(' ')[0]}</span>
                         </div>
                         <span className="text-[10px] font-black px-2 py-0.5 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">{stat.active}</span>
                      </div>
                   ))}
                </div>
             </div>

             {/* Tag Distribution */}
             <div className="bg-white dark:bg-gray-800 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <PieChart className="w-4 h-4 text-purple-400" /> Tags
                </h3>
                <div className="space-y-3">
                   {tagStats.slice(0, 5).map(stat => (
                      <div key={stat.tag.id}>
                         <div className="flex justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                            <span>{stat.tag.name}</span>
                            <span>{stat.count}</span>
                         </div>
                         <div className="w-full bg-gray-50 dark:bg-gray-700 rounded-full h-1">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${(stat.count / Math.max(1, filteredTasks.length)) * 100}%`, backgroundColor: getTagChartColorHex(stat.tag.name) }}
                            />
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* MAIN BOARD */}
        <div className={simpleMode || !isSidebarOpen ? 'lg:col-span-1 w-full overflow-hidden' : 'lg:col-span-3 w-full overflow-hidden'}>
          {viewMode === 'kanban' ? (
            <div className="flex overflow-x-auto snap-x snap-mandatory pb-6 pt-2 gap-6 items-start w-full" style={{ minHeight: '600px' }}>
              {sections.map(section => {
                const sectionTasks = filteredTasks.filter(section.filter);
                return (
                  <div
                    key={section.id}
                    className={`flex-none ${simpleMode ? 'w-[85vw] sm:min-w-[280px] sm:flex-1 max-w-[400px]' : 'w-[85vw] sm:w-[320px] md:w-[360px]'} snap-center flex flex-col min-h-[400px] bg-gray-50 dark:bg-gray-700 rounded-[32px] p-4 border-2 border-dashed ${section.headerColor || ''} transition-all`}
                    style={section.headerStyle}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, section.id)}
                  >
                    <div className="flex items-center justify-between mb-4 px-2">
                       <h3 className="font-black text-[#0E1116] dark:text-gray-100 text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${section.colorClasses?.startsWith('#') ? '' : (section.id === 'done' ? 'bg-[#0E1116]' : section.id === 'doing' ? 'bg-[#374A67]' : 'bg-gray-400')}`}
                            style={section.colorClasses?.startsWith('#') ? { backgroundColor: section.colorClasses } : undefined}
                          />
                          {section.label}
                       </h3>
                       <span className="text-[10px] font-black text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">{sectionTasks.length}</span>
                    </div>

                    <div className="space-y-4">
                      {sectionTasks.map(task => {
                        const owner = getUser(task.ownerId);
                        const isRunning = task.timeLogs?.some(tl => tl && !tl.endTime);
                        const progressColor = getStatusColor(task);
                        const taskTags = getTags(task.tagIds);

                        return (
                          <div
                            key={task.id}
                            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-orange-200 transition-all group relative"
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, task.id)}
                          >
                            <div className="mb-3">
                               <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs leading-tight group-hover:text-[#374A67] transition-colors flex items-center gap-2">
                                     {getPriorityIcon(task.priority)}
                                     {task.title}
                                  </h4>
                               </div>
                               <div className="flex flex-wrap gap-1">
                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                     task.progress === 100 ? 'bg-[#0E1116]/10 text-[#0E1116] border-[#0E1116]/20' :
                                     task.progress > 0 ? 'bg-[#374A67]/10 text-[#374A67] border-[#374A67]/20' :
                                     'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                                  }`}>
                                     {task.progress === 100 ? 'Concluído' : task.progress > 0 ? 'Andamento' : 'A Fazer'}
                                  </span>
                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${task.taskType === 'support' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/30 text-[#374A67] dark:text-orange-400 border-orange-100 dark:border-orange-800'}`}>
                                     {task.taskType === 'support' ? 'Suporte' : 'Atividade'}
                                  </span>
                                  {task.publicarPortal && (
                                    <span
                                      title="Publicado no Portal de Transparência"
                                      className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-100 dark:border-sky-800 flex items-center gap-1"
                                    >
                                      <Globe2 className="w-2 h-2" /> Portal
                                    </span>
                                  )}
                                  {task.projectName && !simpleMode && (
                                    <>
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800 flex items-center gap-1">
                                         <Briefcase className="w-2 h-2" /> {task.projectName}
                                      </span>
                                      {task.flowStep && (
                                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 flex items-center gap-1">
                                           <MapPin className="w-2 h-2" /> {task.flowStep}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {task.client && !simpleMode && (
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800 flex items-center gap-1">
                                       <Briefcase className="w-2 h-2" /> {task.client}
                                    </span>
                                  )}
                               </div>
                            </div>

                            {taskTags.length > 0 && (
                               <div className="flex flex-wrap gap-1 mb-3">
                                  {taskTags.slice(0, 3).map(tag => (
                                     <span key={tag.id} className="px-1.5 py-0.5 rounded-[4px] text-[8px] uppercase font-bold border" style={getTagStyle(tag.name)}>
                                        {tag.name}
                                     </span>
                                  ))}
                               </div>
                            )}

                            <div className="mb-4">
                               <div className="flex items-center gap-3 mb-2 text-gray-400">
                                  {((task.commentsCount ?? 0) > 0 || !simpleMode) && (
                                     <span className="flex items-center gap-1 text-[9px] font-bold hover:text-gray-600 transition-colors cursor-default" title="Comentários">
                                        <MessageSquare size={10} /> {task.commentsCount || 0}
                                     </span>
                                  )}
                                  {((task.timeLogs || []).length > 0 || !simpleMode) && (
                                     <span className="flex items-center gap-1 text-[9px] font-bold hover:text-gray-600 transition-colors cursor-default" title="Tempo Investido">
                                        <Clock size={10} /> {formatTimeStr((task.timeLogs || []).reduce((sum, log) => sum + (log?.durationSeconds || 0), 0))}
                                     </span>
                                  )}
                               </div>
                               <div className="w-full h-1.5 bg-gray-50 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${task.progress}%` }}></div>
                               </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                               <div className="flex items-center gap-2">
                                  <img src={owner?.avatarUrl} className="w-5 h-5 rounded-full border border-white ring-1 ring-gray-100" />
                                  {task.ownerId !== currentUserId && (
                                     <button
                                       onClick={(e) => { e.stopPropagation(); handleAssumeTask(task); }}
                                       className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                       title="Assumir Tarefa"
                                     >
                                       <UserPlus size={12} />
                                     </button>
                                  )}
                               </div>

                               <div className="flex items-center gap-2">
                                  {task.status !== 'done' && (
                                     <button
                                       onClick={(e) => { e.stopPropagation(); handleToggleTimer(task); }}
                                       className={`p-1.5 rounded-lg flex items-center gap-1 transition-all shadow-sm ${isRunning ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white' : 'bg-green-50 dark:bg-green-900/30 text-[#0E1116] dark:text-green-400 hover:bg-[#0E1116] hover:text-white'}`}
                                     >
                                       {isRunning ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                     </button>
                                  )}
                                  <div className="flex flex-col items-end">
                                     <span className="text-[9px] font-black text-gray-400 flex items-center gap-1">
                                        <Calendar size={10} /> {safeFormatDate(task.deadline, 'dd/MM')}
                                     </span>
                                  </div>
                                  <div className="flex gap-1 transition-opacity">
                                     <button onClick={() => onEdit(task)} className="p-1 text-gray-400 hover:text-[#374A67] transition-colors" title="Editar"><Pen size={12} /></button>
                                     {(isManager || task.ownerId === currentUserId) && (
                                       <button onClick={() => onDelete(task.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={12} /></button>
                                     )}
                                  </div>
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {sections.map(section => {
                const sectionTasks = filteredTasks.filter(section.filter);
                if (sectionTasks.length === 0) return null;
                return (
                  <div key={section.id} className="bg-white dark:bg-gray-800 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    {/* Section Header */}
                    <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600 flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${section.id === 'done' ? 'bg-[#0E1116]' : section.id === 'doing' ? 'bg-[#374A67]' : 'bg-gray-400'}`}
                        style={section.colorClasses?.startsWith('#') ? { backgroundColor: section.colorClasses } : undefined}
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">{section.label}</span>
                      <span className="text-[9px] font-bold text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">{sectionTasks.length}</span>
                    </div>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-50 dark:border-gray-700">
                          {[
                            { key: 'title', label: 'Tarefa' },
                            { key: 'owner', label: 'Responsável' },
                            { key: 'status', label: 'Status' },
                            { key: 'project', label: 'Projeto' },
                            { key: 'deadline', label: 'Prazo' },
                            { key: 'progress', label: 'Progresso' },
                          ].map(col => (
                            <th
                              key={col.key}
                              onClick={() => handleSort(col.key)}
                              className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition-colors select-none group/th"
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
                          <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {sortTasks(sectionTasks).map(task => {
                          const owner = getUser(task.ownerId);
                          const isRunning = task.timeLogs?.some(tl => tl && !tl.endTime);
                          return (
                            <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    {getPriorityIcon(task.priority)}
                                    {task.publicarPortal && (
                                      <Globe2
                                        size={12}
                                        className="text-sky-600 dark:text-sky-300 shrink-0"
                                        aria-label="Publicado no Portal de Transparência"
                                      />
                                    )}
                                    {task.title}
                                  </span>
                                  <div className="flex gap-2 mt-1">
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${task.taskType === 'support' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/30 text-[#374A67] dark:text-orange-400 border-orange-100 dark:border-orange-800'}`}>
                                      {task.taskType === 'support' ? 'Suporte' : 'Atividade'}
                                    </span>
                                    {task.publicarPortal && (
                                      <span
                                        title="Publicado no Portal de Transparência"
                                        className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-100 dark:border-sky-800 flex items-center gap-1"
                                      >
                                        <Globe2 className="w-2 h-2" /> Portal
                                      </span>
                                    )}
                                    {task.client && <span className="text-[8px] font-black uppercase text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400 px-1.5 py-0.5 rounded border border-teal-100 dark:border-teal-800">{task.client}</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <img src={owner?.avatarUrl} className="w-5 h-5 rounded-full" />
                                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">{owner?.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {(() => { const st = getStatusLabel(task); return (
                                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${st.color}`}>{st.label}</span>
                                ); })()}
                              </td>
                              <td className="px-4 py-3">
                                {task.projectName ? (
                                  <span className="text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800 flex items-center gap-1 w-fit">
                                    <Briefcase className="w-2.5 h-2.5" /> {task.projectName}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{safeFormatDate(task.deadline, 'dd MMM')}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1">
                                  <div className="w-full max-w-[100px] h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${task.progress === 100 ? 'bg-[#0E1116]' : task.progress > 0 ? 'bg-[#374A67]' : 'bg-gray-300'}`} style={{ width: `${task.progress}%` }}></div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-black text-gray-500">{task.progress}%</span>
                                    <div className="flex items-center gap-2 text-gray-400">
                                      {((task.commentsCount ?? 0) > 0 || !simpleMode) && (
                                        <span className="flex items-center gap-0.5 text-[8px] font-bold" title="Comentários">
                                          <MessageSquare size={8} /> {task.commentsCount || 0}
                                        </span>
                                      )}
                                      {((task.timeLogs || []).length > 0 || !simpleMode) && (
                                        <span className="flex items-center gap-0.5 text-[8px] font-bold" title="Tempo Investido">
                                          <Clock size={8} /> {formatTimeStr((task.timeLogs || []).reduce((sum, log) => sum + (log?.durationSeconds || 0), 0))}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-1.5 items-center">
                                  {task.status !== 'done' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleToggleTimer(task); }}
                                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${isRunning ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white' : 'bg-green-50 dark:bg-green-900/30 text-[#0E1116] dark:text-green-400 hover:bg-[#0E1116] hover:text-white'}`}
                                      title={isRunning ? 'Parar Timer' : 'Iniciar Timer'}
                                    >
                                      {isRunning ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                    </button>
                                  )}
                                  {task.ownerId !== currentUserId && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleAssumeTask(task); }}
                                      className="w-7 h-7 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                                      title="Assumir Tarefa"
                                    >
                                      <UserPlus size={12} />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                                    className="w-7 h-7 flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-[#374A67] hover:text-white rounded-lg transition-all"
                                    title="Editar"
                                  >
                                    <Pen size={12} />
                                  </button>
                                  {(isManager || task.ownerId === currentUserId) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                      className="w-7 h-7 flex items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-400 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                                      title="Arquivar"
                                    >
                                      <Trash2 size={12} />
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
                );
              })}
            </div>
          )}
        </div>
      </div>
      <FilterSidebar
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => {
          setTypeFilters([]);
          setPriorityFilters([]);
          setStatusFilters([]);
          setProjectFilters([]);
          setAreaFilters([]);
          setGroupBy('status');
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
                <option value="status">Status</option>
                <option value="priority">Prioridade</option>
                <option value="owner">Colaborador</option>
                <option value="project">Projeto</option>
                <option value="phase">Jornada do Projeto</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-700"></div>

          {/* Seletores */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Tipo
              </label>
              <MultiSelect
                label="Selecionar Tipo"
                options={[{label:'Atividade',value:'activity'},{label:'Suporte',value:'support'}]}
                selectedValues={typeFilters}
                onChange={setTypeFilters}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Prioridade
              </label>
              <MultiSelect
                label="Selecionar Prioridade"
                options={[{label:'Urgente',value:'urgente'},{label:'Alta',value:'alta'},{label:'Média',value:'média'},{label:'Baixa',value:'baixa'}]}
                selectedValues={priorityFilters}
                onChange={setPriorityFilters}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Status
              </label>
              <MultiSelect
                label="Selecionar Status"
                options={[{label:'A Fazer',value:'todo'},{label:'Em Andamento',value:'doing'},{label:'Concluído',value:'done'}]}
                selectedValues={statusFilters}
                onChange={setStatusFilters}
              />
            </div>

            {projects.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Projeto
                </label>
                <MultiSelect
                  label="Selecionar Projeto"
                  options={availableProjects.map(p => ({label: p.name, value: p.id}))}
                  selectedValues={projectFilters}
                  onChange={setProjectFilters}
                />
              </div>
            )}

            {areas.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Área / Gerência
                </label>
                <HierarchicalAreaSelect
                  label="Selecionar Área"
                  areas={areas}
                  selectedValues={areaFilters}
                  onChange={setAreaFilters}
                />
              </div>
            )}
          </div>
        </div>
      </FilterSidebar>
    </div>
  );
};
