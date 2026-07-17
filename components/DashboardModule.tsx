import React, { useEffect, useState, useMemo } from 'react';
import { Target, Headphones, AlertCircle, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Briefcase, ArrowUpDown, Clock, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Task, User, Area, Client, KanbanBucket, Tag } from '../types';
import { Project } from '../services/projects';
import { ProjectKpiConfig } from '../services/projectConfig';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseHoursStr, getAreaDescendants, getHierarchicalAreaFilterIds } from '../utils';
import { GlobalHierarchicalSelect } from './GlobalHierarchicalSelect';

interface DashboardProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  areas: Area[];
  clients: Client[];
  buckets: KanbanBucket[];
  tags: Tag[];
  projectKpis?: ProjectKpiConfig[];
}

const COLORS = ['#0E1116', '#374A67', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

export const DashboardModule: React.FC<DashboardProps> = ({ tasks, projects, users, areas, clients, buckets, tags, projectKpis = [] }) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [groupByArea, setGroupByArea] = useState(false);
  const [allocationAreaFilter, setAllocationAreaFilter] = useState<string>('all');
  const efficiencyRootArea = useMemo(
    () => areas.find(a => a.name.toLowerCase().includes('eficiência operacional e inov')),
    [areas]
  );

  useEffect(() => {
    if (allocationAreaFilter === 'all' && efficiencyRootArea) {
      setAllocationAreaFilter(`area:${efficiencyRootArea.id}`);
    }
  }, [allocationAreaFilter, efficiencyRootArea]);

  // ─── FILTRO DE PERÍODO ──────────────────────────────────────
  const [periodStart, setPeriodStart] = useState(() => startOfMonth(new Date()));
  const [periodEnd, setPeriodEnd] = useState(() => endOfMonth(new Date()));

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setPeriodStart(s => startOfMonth(subMonths(s, 1)));
      setPeriodEnd(s => endOfMonth(subMonths(s, 1)));
    } else {
      setPeriodStart(s => startOfMonth(addMonths(s, 1)));
      setPeriodEnd(s => endOfMonth(addMonths(s, 1)));
    }
  };

  const setPeriodRange = (months: number) => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(new Date(), months - 1));
    setPeriodStart(start);
    setPeriodEnd(end);
  };

  const periodLabel = useMemo(() => {
    const s = format(periodStart, 'MMM/yy', { locale: ptBR });
    const e = format(periodEnd, 'MMM/yy', { locale: ptBR });
    if (s === e) return format(periodStart, "MMMM 'de' yyyy", { locale: ptBR });
    return `${s} — ${e}`;
  }, [periodStart, periodEnd]);

  // ─── FILTRAR TAREFAS E PROJETOS PELO PERÍODO ──────────────
  const isInPeriod = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    try {
      const d = parseISO(dateStr);
      return isWithinInterval(d, { start: periodStart, end: periodEnd });
    } catch { return false; }
  };

  const overlapsPeriod = (startDate?: string | null, endDate?: string | null): boolean => {
    if (!startDate && !endDate) return false;
    try {
      const start = parseISO(startDate || endDate || '');
      const end = parseISO(endDate || startDate || '');
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
      return start <= periodEnd && end >= periodStart;
    } catch {
      return false;
    }
  };

  const periodTasks = useMemo(() => tasks.filter(t => {
    // Task pertence ao período se seu intervalo de execução cruza o período ou se há log no período.
    if (overlapsPeriod(t.startDate, t.deadline)) return true;
    if (t.timeLogs?.some(log => isInPeriod(log?.startTime))) return true;
    return false;
  }), [tasks, periodStart, periodEnd]);

  const periodProjects = useMemo(() => projects.filter(p => {
    if (overlapsPeriod(p.start_date, p.end_date) || isInPeriod(p.created_at)) return true;
    return false;
  }), [projects, periodStart, periodEnd]);

  // --- DERIVADOS DE ESTATÍSTICAS DO TOPO ---
  const projectsStats = useMemo(() => {
    const done = periodProjects.filter(p => p.progress === 100 || p.status === 'Concluído' || p.status === 'done').length;
    const active = periodProjects.filter(p => (p.progress > 0 && p.progress < 100) || p.status === 'Ativo' || p.status === 'doing').length;
    const backlog = periodProjects.filter(p => (!p.progress || p.progress === 0) && p.status !== 'Concluído' && p.status !== 'Ativo' && p.status !== 'done' && p.status !== 'doing').length;
    return { total: periodProjects.length, done, active, backlog };
  }, [periodProjects]);

  const projectsByKpi = useMemo(() => {
    const kpiProjects = projects.filter(project => !project.archived);
    const counts = kpiProjects.reduce((acc, project) => {
      const linkedKpis = (project.kpis || []).map(kpi => kpi.name?.trim()).filter(Boolean) as string[];
      const keys = linkedKpis.length > 0 ? linkedKpis : [project.kpi?.trim() || 'Sem KPI'];
      keys.forEach(key => {
        if (!acc[key]) acc[key] = { name: key, total: 0, active: 0, done: 0, backlog: 0 };
        acc[key].total++;
        if (project.progress === 100 || project.status === 'Concluído' || project.status === 'done') acc[key].done++;
        else if ((project.progress || 0) > 0 || project.status === 'Ativo' || project.status === 'doing') acc[key].active++;
        else acc[key].backlog++;
      });
      return acc;
    }, {} as Record<string, { name: string; total: number; active: number; done: number; backlog: number }>);

    projectKpis.forEach(kpi => {
      if (!counts[kpi.name]) counts[kpi.name] = { name: kpi.name, total: 0, active: 0, done: 0, backlog: 0 };
    });

    return Object.values(counts).sort((a, b) => {
      const idxA = projectKpis.findIndex(m => m.name === a.name);
      const idxB = projectKpis.findIndex(m => m.name === b.name);

      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      if (a.name === 'Sem KPI') return 1;
      if (b.name === 'Sem KPI') return -1;

      return a.name.localeCompare(b.name);
    });
  }, [projects, projectKpis]);

  const totalKpiAssignments = useMemo(
    () => projectsByKpi.reduce((total, row) => total + row.total, 0),
    [projectsByKpi]
  );

  const isSupport = (task: Task) => task.taskType === 'support';

  const getProjectAreaIds = (project: Project): string[] => {
    return [
      project.demandante_area_id,
      project.area_id
    ].filter(Boolean) as string[];
  };

  const getTaskAreaIds = (task: Task): string[] => {
    return [
      task.demandanteAreaId,
      task.areaId,
      (task as any).demandante_area_id,
      (task as any).area_id
    ].filter(Boolean) as string[];
  };

  const isProjectInAreaTree = (project: Project, rootAreaId: string) => {
    const validAreaIds = getAreaDescendants([rootAreaId], areas);
    return getProjectAreaIds(project).some(areaId => validAreaIds.includes(areaId));
  };

  const isTaskInAreaTree = (task: Task, rootAreaId: string) => {
    const validAreaIds = getAreaDescendants([rootAreaId], areas);
    return getTaskAreaIds(task).some(areaId => validAreaIds.includes(areaId));
  };

  const getAttendedAreaId = (item: any) => {
    return item.demandante_area_id || item.demandanteAreaId || item.area_id || item.areaId || 'unknown';
  };

  const isProjectDone = (project: Project) =>
    project.progress === 100 || project.status === 'Concluído' || project.status === 'Concluido' || project.status === 'done';

  const isProjectActive = (project: Project) =>
    !isProjectDone(project) && ((project.progress || 0) > 0 || project.status === 'Ativo' || project.status === 'doing');

  const getProjectStatusBucket = (project: Project) => {
    if (isProjectDone(project)) return 'Concluídos';
    if (isProjectActive(project)) return 'Ativos';
    if (project.status === 'Impedido' || project.status === 'impedimento') return 'Impedidos';
    return 'Backlog';
  };

  const isTaskImpeded = (task: Task) => {
    const impedimentBucketIds = buckets.filter(b => b.name.toLowerCase().includes('impedimento')).map(b => b.id);
    const impedimentTagIds = tags.filter(t => t.name.toLowerCase().includes('impedimento')).map(t => t.id);
    return task.status === 'impedimento' ||
      task.status?.toLowerCase?.().includes('imped') ||
      task.description?.toLowerCase().includes('impedimento') ||
      task.title?.toLowerCase().includes('impedimento') ||
      impedimentBucketIds.includes(task.status) ||
      task.tagIds?.some(tagId => impedimentTagIds.includes(tagId));
  };

  const getTaskStage = (task: Task): 'backlog' | 'andamento' | 'impedimento' | 'concluido' => {
    if (isTaskImpeded(task)) return 'impedimento';
    if (task.status === 'done' || task.progress === 100) return 'concluido';
    if (task.status === 'doing' || (task.progress || 0) > 0) return 'andamento';
    return 'backlog';
  };

  const supportStats = useMemo(() => {
    const supportTasks = periodTasks.filter(t => isSupport(t));
    const done = supportTasks.filter(t => t.progress === 100).length;
    const doing = supportTasks.filter(t => t.progress > 0 && t.progress < 100).length;
    const todo = supportTasks.filter(t => !t.progress || t.progress === 0).length;
    return { total: supportTasks.length, done, doing, todo };
  }, [periodTasks]);

  // KPI de Tickets de Atividades
  const activityStats = useMemo(() => {
    const activityTasks = periodTasks.filter(t => !isSupport(t));
    const done = activityTasks.filter(t => t.progress === 100).length;
    const doing = activityTasks.filter(t => t.progress > 0 && t.progress < 100).length;
    const todo = activityTasks.filter(t => !t.progress || t.progress === 0).length;
    return { total: activityTasks.length, done, doing, todo };
  }, [periodTasks]);

  const impedimentStats = useMemo(() => {
    const impedimentBucketIds = buckets.filter(b => b.name.toLowerCase().includes('impedimento')).map(b => b.id);
    const impedimentTagIds = tags.filter(t => t.name.toLowerCase().includes('impedimento')).map(t => t.id);
    const blocked = periodTasks.filter(t =>
      t.description?.toLowerCase().includes('impedimento') ||
      t.title?.toLowerCase().includes('impedimento') ||
      impedimentBucketIds.includes(t.status) ||
      t.tagIds?.some(tagId => impedimentTagIds.includes(tagId))
    ).length;
    return { total: blocked || 0 };
  }, [periodTasks, buckets, tags]);

  const getTaskHours = (task: Task, range?: { start: Date; end: Date }) => {
    let totalHours = 0;
    if (task.timeLogs && task.timeLogs.length > 0) {
      task.timeLogs.forEach(log => {
        if (!log?.startTime) return;
        const logDate = new Date(log.startTime);
        if (isNaN(logDate.getTime())) return;
        if (range) {
          try {
            if (!isWithinInterval(logDate, { start: range.start, end: range.end })) return;
          } catch {
            return;
          }
        }

        if (log?.durationSeconds) {
          totalHours += log.durationSeconds / 3600;
        } else if (log.endTime) {
          const end = new Date(log.endTime);
          if (!isNaN(end.getTime())) {
            totalHours += (end.getTime() - logDate.getTime()) / 3600000;
          }
        }
      });
    }
    return totalHours;
  };

  // KPI de Horas Trabalhadas
  const hoursStats = useMemo(() => {
    let totalHours = 0;
    let activityHours = 0;
    let supportHours = 0;
    const selectedRange = { start: periodStart, end: periodEnd };
    periodTasks.forEach(t => {
      const h = getTaskHours(t, selectedRange);
      totalHours += h;
      if (isSupport(t)) {
        supportHours += h;
      } else {
        activityHours += h;
      }
    });
    return {
      total: Number(totalHours.toFixed(1)),
      activity: Number(activityHours.toFixed(1)),
      support: Number(supportHours.toFixed(1))
    };
  }, [periodTasks, periodStart, periodEnd]);

  // --- DADOS PARA O GRÁFICO DE CARGA DE HORAS (barras lado a lado) ---
  const workloadData = useMemo(() => {
    const now = new Date();
    const months = Array.from({length: 6}).map((_, i) => {
      const m = subMonths(now, 5 - i);
      return {
        name: format(m, 'MMM/yy', { locale: ptBR }),
        start: startOfMonth(m),
        end: endOfMonth(m),
        Projetos: 0,
        Suporte: 0
      };
    });

    tasks.forEach(task => {
      const typeKey = isSupport(task) ? 'Suporte' : 'Projetos';
      months.forEach(month => {
        const durationH = getTaskHours(task, { start: month.start, end: month.end });
        if (durationH > 0) month[typeKey] += durationH;
      });
    });

    return months.map(m => ({
      name: m.name,
      Projetos: Number(m.Projetos.toFixed(1)),
      Suporte: Number(m.Suporte.toFixed(1))
    }));
  }, [tasks]);

  // --- ALOCAÇÃO DO TIME ---
  const teamAllocation = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    let currentMonthHours = 0;

    tasks.forEach(task => {
      currentMonthHours += getTaskHours(task, { start: monthStart, end: monthEnd });
    });

    const availableHours = Math.max(1, users.reduce((sum, u) => sum + (u.available_hours || 160), 0));
    return Math.min(100, Math.round((currentMonthHours / availableHours) * 100));
  }, [tasks, users]);

  // --- PROJETOS POR ÁREA (TABELA) ---
  const areaTableData = useMemo(() => {
    return areas.map(area => {
      const areaProjects = periodProjects.filter(p => getAttendedAreaId(p) === area.id);
      const areaTasks = periodTasks.filter(t => getAttendedAreaId(t) === area.id);
      const areaActivities = areaTasks.filter(t => !isSupport(t));
      const areaSupport = areaTasks.filter(t => isSupport(t));
      let totalHours = 0;
      areaTasks.forEach(t => {
        totalHours += getTaskHours(t, { start: periodStart, end: periodEnd });
      });
      return {
        id: area.id,
        name: area.name,
        projects: areaProjects.length,
        activities: areaActivities.length,
        support: areaSupport.length,
        hours: Number(totalHours.toFixed(1))
      };
    }).filter(a => a.projects > 0 || a.activities > 0 || a.support > 0 || a.hours > 0)
      .sort((a, b) => b.hours - a.hours);
  }, [areas, periodProjects, periodTasks, periodStart, periodEnd]);

  // --- ALOCAÇÃO POR PESSOA ---
  const allocationByPerson = useMemo(() => {
    const userMap = new Map();
    let filteredUsers = users;
    if (allocationAreaFilter && allocationAreaFilter !== 'all') {
      if (allocationAreaFilter.startsWith('area:')) {
        const areaId = allocationAreaFilter.split(':')[1];
        const validAreaIds = getHierarchicalAreaFilterIds([areaId], areas);
        filteredUsers = users.filter(u => u.areaId && validAreaIds.includes(u.areaId));
      } else if (allocationAreaFilter.startsWith('user:')) {
        const uid = allocationAreaFilter.split(':')[1];
        filteredUsers = users.filter(u => u.id === uid);
      }
    }
    filteredUsers.forEach(u => userMap.set(u.id, {
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      alocadoHours: 0,
      realizadoHours: 0,
      realizadoProjectsHours: 0,
      realizadoSupportHours: 0,
      availableHours: u.available_hours || 160,
      responsibleProjects: 0,
      involvedProjects: 0,
      projectStatuses: {} as Record<string, number>,
      activityBacklog: 0,
      activityDoing: 0,
      activityImpeded: 0
    }));

    periodProjects.filter(project => !isProjectDone(project)).forEach(project => {
      const responsibleIds = [project.owner_id, project.dono_id].filter(Boolean);
      const involvedIds = [
        ...(project.other_members || []),
        ...((project.shared_with || []).map(member => member.user_id))
      ].filter(Boolean);
      const statusBucket = getProjectStatusBucket(project);

      responsibleIds.forEach(userId => {
        if (!userMap.has(userId)) return;
        const userData = userMap.get(userId);
        userData.responsibleProjects += 1;
        userData.projectStatuses[statusBucket] = (userData.projectStatuses[statusBucket] || 0) + 1;
      });

      involvedIds.forEach(userId => {
        if (!userMap.has(userId) || responsibleIds.includes(userId)) return;
        const userData = userMap.get(userId);
        userData.involvedProjects += 1;
        userData.projectStatuses[statusBucket] = (userData.projectStatuses[statusBucket] || 0) + 1;
      });
    });

    periodTasks.forEach(task => {
      const participantIds = Array.from(new Set([task.ownerId, ...(task.memberIds || [])].filter(Boolean) as string[]));

      participantIds.forEach(userId => {
        if (!userMap.has(userId)) return;
        const userData = userMap.get(userId);
        const stage = getTaskStage(task);
        if (!isSupport(task) && stage === 'backlog') userData.activityBacklog += 1;
        if (!isSupport(task) && stage === 'andamento') userData.activityDoing += 1;
        if (!isSupport(task) && stage === 'impedimento') userData.activityImpeded += 1;
      });

      if (task.ownerId && userMap.has(task.ownerId)) {
        const userData = userMap.get(task.ownerId);

        // Alocado: soma de estimativas planejadas de tarefas NÃO concluídas
        const isDone = task.status === 'done' || task.progress === 100;
        if (task.hours && !isDone) {
          userData.alocadoHours += parseHoursStr(task.hours);
        }

        // Realizado: soma de logs de tempo (getTaskHours)
        const rh = getTaskHours(task, { start: periodStart, end: periodEnd });
        if (rh > 0) {
          if (isSupport(task)) {
            userData.realizadoSupportHours += rh;
          } else {
            userData.realizadoProjectsHours += rh;
          }
          userData.realizadoHours += rh;
        }
      }
    });

    return Array.from(userMap.values())
      .filter(u => u.realizadoHours > 0 || u.alocadoHours > 0 || u.availableHours > 0)
      .sort((a, b) => b.realizadoHours - a.realizadoHours)
      .map(u => ({
        ...u,
        alocadoHours: Number(u.alocadoHours.toFixed(1)),
        realizadoHours: Number(u.realizadoHours.toFixed(1)),
        realizadoProjectsHours: Number(u.realizadoProjectsHours.toFixed(1)),
        realizadoSupportHours: Number(u.realizadoSupportHours.toFixed(1)),
        projectStatusSummary: Object.entries(u.projectStatuses as Record<string, number>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([label, count]) => ({ label, count }))
      }));
  }, [users, periodProjects, periodTasks, allocationAreaFilter, areas, periodStart, periodEnd, buckets, tags]);

  // --- TOTAL DA EQUIPE (CONSOLIDADO) ---
  const teamConsolidated = useMemo(() => {
    let availableHours = 0;
    let alocadoHours = 0;
    let realizadoHours = 0;
    let realizadoProjectsHours = 0;
    let realizadoSupportHours = 0;
    let responsibleProjects = 0;
    let involvedProjects = 0;
    let activityBacklog = 0;
    let activityDoing = 0;
    let activityImpeded = 0;
    const projectStatuses: Record<string, number> = {};

    allocationByPerson.forEach(p => {
      availableHours += p.availableHours;
      alocadoHours += p.alocadoHours;
      realizadoHours += p.realizadoHours;
      realizadoProjectsHours += p.realizadoProjectsHours;
      realizadoSupportHours += p.realizadoSupportHours;
      responsibleProjects += p.responsibleProjects;
      involvedProjects += p.involvedProjects;
      activityBacklog += p.activityBacklog;
      activityDoing += p.activityDoing;
      activityImpeded += p.activityImpeded;
      p.projectStatusSummary.forEach((status: { label: string; count: number }) => {
        projectStatuses[status.label] = (projectStatuses[status.label] || 0) + status.count;
      });
    });

    return {
      id: 'team-consolidated',
      name: 'TODA EQUIPE',
      availableHours: Number(availableHours.toFixed(1)),
      alocadoHours: Number(alocadoHours.toFixed(1)),
      realizadoHours: Number(realizadoHours.toFixed(1)),
      realizadoProjectsHours: Number(realizadoProjectsHours.toFixed(1)),
      realizadoSupportHours: Number(realizadoSupportHours.toFixed(1)),
      responsibleProjects,
      involvedProjects,
      activityBacklog,
      activityDoing,
      activityImpeded,
      projectStatusSummary: Object.entries(projectStatuses)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, count]) => ({ label, count }))
    };
  }, [allocationByPerson]);

  // --- DADOS PARA ACORDEÃO DE INVESTIMENTO ---
  const investmentData = useMemo(() => {
    const parentList = groupByArea ? areas : clients;
    const childList = groupByArea ? clients : areas;

    return parentList.map(parent => {
      const getParentMatch = (t: any) => {
        if (groupByArea) {
          if ('owner_id' in t || 'dono_id' in t) return isProjectInAreaTree(t, parent.id);
          return isTaskInAreaTree(t, parent.id);
        } else {
          return t.client === parent.id || t.client_id === parent.id || (t.projectName && t.projectName.includes(parent.name));
        }
      };

      const parentTasks = periodTasks.filter(getParentMatch);
      const parentProjects = periodProjects.filter(getParentMatch);

      let parentTotalHours = 0;
      let parentSupport = 0;
      let parentActivities = 0;

      const childDataMap: Record<string, any> = {};
      childList.forEach(child => {
        childDataMap[child.id] = { name: child.name, projectsCount: 0, supportCount: 0, activitiesCount: 0, hours: 0 };
      });
      childDataMap['unknown'] = { name: 'Não Definida/Outros', projectsCount: 0, supportCount: 0, activitiesCount: 0, hours: 0 };

      const getChildId = (t: any) => {
        if (groupByArea) return t.client || t.client_id || 'unknown';
        return getAttendedAreaId(t);
      };

      parentTasks.forEach(t => {
        const h = getTaskHours(t, { start: periodStart, end: periodEnd });
        parentTotalHours += h;
        const cId = getChildId(t);
        const childObj = childDataMap[cId] || childDataMap['unknown'];
        childObj.hours += h;
        if (isSupport(t)) { parentSupport++; childObj.supportCount++; }
        else { parentActivities++; childObj.activitiesCount++; }
      });

      parentProjects.forEach(p => {
         const cId = getChildId(p);
         const childObj = childDataMap[cId] || childDataMap['unknown'];
         childObj.projectsCount++;
      });

      const activeChildren = Object.values(childDataMap).filter(c => c.projectsCount > 0 || c.supportCount > 0 || c.activitiesCount > 0 || c.hours > 0).sort((a,b) => b.hours - a.hours);

      return {
        id: parent.id,
        name: parent.name,
        projectsCount: parentProjects.length,
        supportCount: parentSupport,
        activitiesCount: parentActivities,
        hours: Number(parentTotalHours.toFixed(1)),
        children: activeChildren
      };
    }).filter(p => p.projectsCount > 0 || p.supportCount > 0 || p.activitiesCount > 0 || p.hours > 0).sort((a, b) => b.hours - a.hours);
  }, [clients, areas, periodTasks, periodProjects, groupByArea, periodStart, periodEnd]);


  const StatCard = ({ title, value, icon: Icon, colorClass, subStats }: any) => (
    <div className="card-premium p-5 group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-[10px] font-mono tracking-widest text-gray-500 uppercase mb-1">{title}</h3>
          <span className="text-4xl font-black text-gray-800 dark:text-gray-100">{value}</span>
        </div>
        <div className={`p-2.5 rounded-2xl ${colorClass} bg-opacity-10 transition-transform duration-500 group-hover:rotate-12`}>
          <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
      </div>

      {subStats && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          {subStats.map((stat: any, idx: number) => (
            <div key={idx} className="flex flex-col">
              <span className="text-[9px] text-gray-400 font-bold uppercase">{stat.label}</span>
              <span className="text-xs font-black text-gray-700 dark:text-gray-300">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      <Icon className="absolute -top-4 -right-4 w-28 h-28 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-500 pointer-events-none" />
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">

      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
            Painel de Eficiência
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Monitoramento Integrado: Projetos & Suporte
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Avatares */}
          <div className="flex -space-x-3 mr-2">
            {users.slice(0, 5).map((u, i) => (
              <img
                key={u.id}
                src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff&bold=true`}
                alt={u.name}
                className="w-9 h-9 rounded-full border-2 border-white dark:border-gray-900 shadow-sm relative hover:z-20 hover:scale-110 transition-transform"
                style={{ zIndex: 10 - i }}
                title={u.name}
              />
            ))}
            {users.length > 5 && (
              <div className="w-9 h-9 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 z-0">
                +{users.length - 5}
              </div>
            )}
          </div>

          {/* Seletor de Período */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-1">
            <button onClick={() => navigatePeriod('prev')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div className="px-3 py-1.5 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#374A67]" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 capitalize min-w-[120px] text-center">
                {periodLabel}
              </span>
            </div>
            <button onClick={() => navigatePeriod('next')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Atalhos de período */}
          <div className="flex gap-1">
            {[
              { label: '1M', months: 1 },
              { label: '3M', months: 3 },
              { label: '6M', months: 6 },
              { label: '12M', months: 12 },
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => setPeriodRange(opt.months)}
                className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-[#374A67] hover:text-white hover:border-[#374A67] transition-all"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="space-y-10">

        {/* STATS TOPO - 5 KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <StatCard
            title="Projetos"
            value={projectsStats.total}
            icon={Target}
            colorClass="bg-green-500"
            subStats={[
              { label: 'Concluídos', value: projectsStats.done },
              { label: 'Ativos', value: projectsStats.active },
              { label: 'Backlog', value: projectsStats.backlog }
            ]}
          />
          <StatCard
            title="Tickets Atividades"
            value={activityStats.total}
            icon={ClipboardList}
            colorClass="bg-indigo-500"
            subStats={[
              { label: 'Concluídas', value: activityStats.done },
              { label: 'Andamento', value: activityStats.doing },
              { label: 'Backlog', value: activityStats.todo }
            ]}
          />
          <StatCard
            title="Tickets Suporte"
            value={supportStats.total}
            icon={Headphones}
            colorClass="bg-[#374A67]"
            subStats={[
              { label: 'Concluídos', value: supportStats.done },
              { label: 'Andamento', value: supportStats.doing },
              { label: 'Backlog', value: supportStats.todo }
            ]}
          />
          <StatCard
            title="Horas Trabalhadas"
            value={`${hoursStats.total}h`}
            icon={Clock}
            colorClass="bg-blue-500"
            subStats={[
              { label: 'Atividades', value: `${hoursStats.activity}h` },
              { label: 'Suporte', value: `${hoursStats.support}h` }
            ]}
          />
          <StatCard
            title="Impedimentos"
            value={impedimentStats.total}
            icon={AlertCircle}
            colorClass="bg-red-500"
            subStats={impedimentStats.total > 0 ? [{ label: 'Tarefas Paradas', value: impedimentStats.total }] : undefined}
          />
        </div>

        {/* SEGUNDA LINHA: Carga de Horas + Alocação da Equipe */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* CARGA DE HORAS - Barras comparativas lado a lado */}
          <div className="lg:col-span-6 card-premium p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-black text-gray-800 dark:text-white">Carga de Horas</h2>
                <p className="text-xs text-gray-500">Últimos 6 meses</p>
              </div>
              <Briefcase className="text-gray-300 w-6 h-6" />
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={{ backgroundColor: '#111827', borderRadius: '12px', border: 'none', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', fontSize: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                  <Bar dataKey="Projetos" fill="#0E1116" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Suporte" fill="#374A67" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ALOCAÇÃO DO TIME */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300">Alocação Global</h3>
                <span className="text-lg font-black text-[#374A67]">{teamAllocation}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden relative shadow-inner">
                <div
                  className="bg-[#374A67] h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${teamAllocation}%`, boxShadow: 'inset 0 0 10px rgba(255,255,255,0.3)' }}
                ></div>
              </div>
              <p className="text-[9px] text-right text-gray-400 mt-1 font-medium">Horas utilizadas vs disponíveis (Mês)</p>
            </div>
          </div>

          {/* PROJETOS POR ÁREA - TABELA */}
          <div className="lg:col-span-6 card-premium p-6">
            <h2 className="text-base font-black text-gray-800 dark:text-white mb-5">Projetos por Área</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Área</th>
                    <th className="pb-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Proj.</th>
                    <th className="pb-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Ativ.</th>
                    <th className="pb-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Sup.</th>
                    <th className="pb-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Horas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {areaTableData.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]" title={row.name}>{row.name}</td>
                      <td className="py-2.5 text-center">
                        <span className="text-[10px] font-black bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md">{row.projects}</span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="text-[10px] font-black bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">{row.activities}</span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="text-[10px] font-black bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md">{row.support}</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">{row.hours}h</span>
                      </td>
                    </tr>
                  ))}
                  {areaTableData.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-xs text-gray-400 italic">Nenhum dado no período</td></tr>
                  )}
                </tbody>
                {areaTableData.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-600">
                      <td className="py-2.5 text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase">Total</td>
                      <td className="py-2.5 text-center text-[10px] font-black text-gray-700 dark:text-gray-300">{areaTableData.reduce((s, r) => s + r.projects, 0)}</td>
                      <td className="py-2.5 text-center text-[10px] font-black text-gray-700 dark:text-gray-300">{areaTableData.reduce((s, r) => s + r.activities, 0)}</td>
                      <td className="py-2.5 text-center text-[10px] font-black text-gray-700 dark:text-gray-300">{areaTableData.reduce((s, r) => s + r.support, 0)}</td>
                      <td className="py-2.5 text-right text-[10px] font-black text-gray-700 dark:text-gray-300">{areaTableData.reduce((s, r) => s + r.hours, 0).toFixed(1)}h</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-black text-gray-800 dark:text-white">Projetos por KPI</h2>
              <p className="text-xs text-gray-500">Distribuição dos projetos visíveis por KPI</p>
            </div>
            <Target className="text-gray-300 w-6 h-6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {projectsByKpi.map((row, index) => {
              const pct = totalKpiAssignments > 0 ? Math.round((row.total / totalKpiAssignments) * 100) : 0;
              return (
                <div key={row.name} className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-wider truncate" title={row.name}>{row.name}</span>
                    </div>
                    <span className="text-sm font-black text-[#0E1116] dark:text-emerald-300">{row.total}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white dark:bg-gray-900 overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                  </div>
                  <div className="flex items-center justify-between mt-3 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    <span>{pct}%</span>
                    <span>Ativos {row.active}</span>
                    <span>Concl. {row.done}</span>
                    <span>Backlog {row.backlog}</span>
                  </div>
                </div>
              );
            })}
            {projectsByKpi.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-gray-400 italic">Nenhum projeto visível</div>
            )}
          </div>
        </div>

        {/* ALOCAÇÃO DA EQUIPE */}
        <div className="card-premium p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white">Alocação da Equipe</h2>
              <p className="text-xs text-gray-500">Distribuição e acompanhamento da carga horária da equipe (Mês atual)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-64">
                <GlobalHierarchicalSelect
                  areas={areas}
                  users={users}
                  selectedValue={allocationAreaFilter}
                  onChange={setAllocationAreaFilter}
                />
              </div>
              <Users className="text-gray-300 w-6 h-6 hidden sm:block" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* CARD TODA EQUIPE */}
            <div className="p-5 rounded-2xl border-2 border-indigo-500 dark:border-indigo-400 bg-gradient-to-br from-indigo-50/30 to-emerald-50/30 dark:from-indigo-950/10 dark:to-emerald-950/10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 bg-indigo-500 text-white rounded-bl-xl text-[10px] font-black tracking-widest uppercase">
                Consolidado
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-200">{teamConsolidated.name}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Visão da Área</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Barra 1: Disponível vs Alocado */}
                <div>
                  <div className="flex justify-between items-end mb-1 text-xs">
                    <span className="font-bold text-gray-600 dark:text-gray-400 font-medium">Alocado</span>
                    <span className="font-black text-gray-800 dark:text-white">
                      {teamConsolidated.alocadoHours}h / {teamConsolidated.availableHours}h ({teamConsolidated.availableHours > 0 ? Math.round((teamConsolidated.alocadoHours / teamConsolidated.availableHours) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (teamConsolidated.alocadoHours / teamConsolidated.availableHours) > 1 ? 'bg-red-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, teamConsolidated.availableHours > 0 ? (teamConsolidated.alocadoHours / teamConsolidated.availableHours) * 100 : 0)}%` }}
                    />
                  </div>
                </div>

                {/* Barra 2: Disponível vs Realizado */}
                <div>
                  <div className="flex justify-between items-end mb-1 text-xs">
                    <span className="font-bold text-gray-600 dark:text-gray-400 font-medium">Realizado</span>
                    <span className="font-black text-gray-800 dark:text-white">
                      {teamConsolidated.realizadoHours}h / {teamConsolidated.availableHours}h ({teamConsolidated.availableHours > 0 ? Math.round((teamConsolidated.realizadoHours / teamConsolidated.availableHours) * 100) : 0}%)
                    </span>
                  </div>
                  {/* Barra empilhada (Projetos em verde, Suporte em laranja) */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-500"
                      title={`Projetos: ${teamConsolidated.realizadoProjectsHours}h`}
                      style={{ width: `${Math.min(100, teamConsolidated.availableHours > 0 ? (teamConsolidated.realizadoProjectsHours / teamConsolidated.availableHours) * 100 : 0)}%` }}
                    />
                    <div
                      className="h-full bg-[#374A67] transition-all duration-500"
                      title={`Suporte: ${teamConsolidated.realizadoSupportHours}h`}
                      style={{ width: `${Math.min(100 - (teamConsolidated.availableHours > 0 ? Math.min(100, (teamConsolidated.realizadoProjectsHours / teamConsolidated.availableHours) * 100) : 0), teamConsolidated.availableHours > 0 ? (teamConsolidated.realizadoSupportHours / teamConsolidated.availableHours) * 100 : 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-gray-400 font-bold uppercase">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> Projetos: {teamConsolidated.realizadoProjectsHours}h</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#374A67] inline-block" /> Suporte: {teamConsolidated.realizadoSupportHours}h</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 border border-indigo-100 dark:border-indigo-900/50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Projetos</p>
                    <p className="text-xs font-black text-gray-800 dark:text-gray-100 mt-1">Resp. {teamConsolidated.responsibleProjects}</p>
                    <p className="text-xs font-black text-gray-800 dark:text-gray-100">Env. {teamConsolidated.involvedProjects}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 border border-indigo-100 dark:border-indigo-900/50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Atividades</p>
                    <p className="text-xs font-black text-gray-800 dark:text-gray-100 mt-1">Backlog {teamConsolidated.activityBacklog}</p>
                    <p className="text-xs font-black text-gray-800 dark:text-gray-100">And. {teamConsolidated.activityDoing} | Imp. {teamConsolidated.activityImpeded}</p>
                  </div>
                </div>

                {teamConsolidated.projectStatusSummary.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {teamConsolidated.projectStatusSummary.map(status => (
                      <span key={status.label} className="px-2 py-1 rounded-lg bg-indigo-100/80 dark:bg-indigo-900/30 text-[9px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-200">
                        {status.label}: {status.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CARDS INDIVIDUAIS */}
            {allocationByPerson.map(person => {
              const alocadoPercent = person.availableHours > 0 ? Math.round((person.alocadoHours / person.availableHours) * 100) : 0;
              const realizadoPercent = person.availableHours > 0 ? Math.round((person.realizadoHours / person.availableHours) * 100) : 0;
              const projPercent = person.availableHours > 0 ? (person.realizadoProjectsHours / person.availableHours) * 100 : 0;
              const supPercent = person.availableHours > 0 ? (person.realizadoSupportHours / person.availableHours) * 100 : 0;

              return (
                <div key={person.id} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow relative">
                  <div className="flex items-center gap-3 mb-4">
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt={person.name} className="w-10 h-10 rounded-xl object-cover border border-gray-100 dark:border-gray-800" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold text-sm uppercase">
                        {person.name.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{person.name}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Colaborador</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Barra 1: Disponível vs Alocado */}
                    <div>
                      <div className="flex justify-between items-end mb-1 text-xs">
                        <span className="font-bold text-gray-600 dark:text-gray-400 font-medium">Alocado</span>
                        <span className={`font-black ${alocadoPercent > 100 ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
                          {person.alocadoHours}h / {person.availableHours}h ({alocadoPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            alocadoPercent > 100 ? 'bg-red-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, alocadoPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Barra 2: Disponível vs Realizado */}
                    <div>
                      <div className="flex justify-between items-end mb-1 text-xs">
                        <span className="font-bold text-gray-600 dark:text-gray-400 font-medium">Realizado</span>
                        <span className="font-black text-gray-800 dark:text-white">
                          {person.realizadoHours}h / {person.availableHours}h ({realizadoPercent}%)
                        </span>
                      </div>
                      {/* Barra empilhada (Projetos em verde, Suporte em laranja) */}
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          title={`Projetos: ${person.realizadoProjectsHours}h`}
                          style={{ width: `${Math.min(100, projPercent)}%` }}
                        />
                        <div
                          className="h-full bg-[#374A67] transition-all duration-500"
                          title={`Suporte: ${person.realizadoSupportHours}h`}
                          style={{ width: `${Math.min(100 - Math.min(100, projPercent), supPercent)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[9px] text-gray-400 font-bold uppercase">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Projetos: {person.realizadoProjectsHours}h</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#374A67] inline-block" /> Suporte: {person.realizadoSupportHours}h</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Projetos</p>
                        <p className="text-xs font-black text-gray-800 dark:text-gray-100 mt-1">Resp. {person.responsibleProjects}</p>
                        <p className="text-xs font-black text-gray-800 dark:text-gray-100">Env. {person.involvedProjects}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Atividades</p>
                        <p className="text-xs font-black text-gray-800 dark:text-gray-100 mt-1">Backlog {person.activityBacklog}</p>
                        <p className="text-xs font-black text-gray-800 dark:text-gray-100">And. {person.activityDoing} | Imp. {person.activityImpeded}</p>
                      </div>
                    </div>

                    {person.projectStatusSummary.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {person.projectStatusSummary.map(status => (
                          <span key={status.label} className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[9px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-200">
                            {status.label}: {status.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* INVESTIMENTO POR CLIENTE / ÁREA */}
        <div className="card-premium p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-800 dark:text-white">
              Investimento por {groupByArea ? 'Área' : 'Cliente'}
            </h2>
            <button
              onClick={() => setGroupByArea(!groupByArea)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" /> Inverter Hierarquia
            </button>
          </div>

          <div className="space-y-4">
            {investmentData.length > 0 ? investmentData.map(item => (
              <div key={item.id} className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden transition-all duration-300 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800">
                <div
                  className="flex justify-between items-center p-5 cursor-pointer"
                  onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-gray-200">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {item.projectsCount > 0 && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">{item.projectsCount} Projetos</span>}
                        {item.supportCount > 0 && <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md">{item.supportCount} Sup.</span>}
                        {item.activitiesCount > 0 && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">{item.activitiesCount} Ativ.</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="block text-sm font-black text-gray-700 dark:text-gray-300">{item.hours}h</span>
                      <span className="block text-[10px] text-gray-400 uppercase tracking-widest">Investidas</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                      {expandedItem === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {expandedItem === item.id && (
                  <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                      Detalhamento por {groupByArea ? 'Cliente' : 'Área'}
                    </h5>
                    <div className="space-y-3">
                      {item.children.map((child: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-1/3 truncate" title={child.name}>{child.name}</span>
                          <div className="flex items-center justify-end gap-2 w-2/3">
                            {child.projectsCount > 0 && <span className="text-[10px] font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 px-2 py-1 rounded-md">{child.projectsCount} Proj.</span>}
                            {child.supportCount > 0 && <span className="text-[10px] font-bold bg-orange-50 dark:bg-orange-900/20 text-orange-600 px-2 py-1 rounded-md">{child.supportCount} Sup.</span>}
                            {child.activitiesCount > 0 && <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-2 py-1 rounded-md">{child.activitiesCount} Ativ.</span>}
                            <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md ml-2">{Number(child.hours.toFixed(1))}h</span>
                          </div>
                        </div>
                      ))}
                      {item.children.length === 0 && (
                        <div className="text-xs text-gray-500 italic">Sem detalhamento disponível.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <div className="text-center py-10 text-gray-400">Nenhuma informação registrada no período.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
