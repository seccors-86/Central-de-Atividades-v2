import React, { useState } from 'react';
import { User, Tag, StatusConfig, Task, Area } from '../types';
import { User as UserIcon, Filter, Clock, Briefcase, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getTagStyle } from "../tagUtils";
import { ptBR } from 'date-fns/locale';

interface ActivityFeedProps {
  logs: any[]; // Mantido para compatibilidade de assinatura no App.tsx
  tasks: Task[];
  users: User[];
  tags: Tag[];
  statuses: StatusConfig[];
  areas: Area[];
  currentUserId: string;
  isManager: boolean;
  onEdit: (log: any) => void;
  onDelete: (id: string) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  tasks, users, tags, areas, currentUserId
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const getUser = (id: string) => users.find(u => u.id === id);
  const getTags = (ids: string[]) => tags.filter(t => ids?.includes(t.id));

  const getSubtreeAreaIds = (areaId?: string) => {
    if (!areaId) return [];
    const result = new Set<string>([areaId]);
    let changed = true;

    while (changed) {
      changed = false;
      areas.forEach(area => {
        if (area.parentId && result.has(area.parentId) && !result.has(area.id)) {
          result.add(area.id);
          changed = true;
        }
      });
    }

    return Array.from(result);
  };

  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h > 0 ? h + 'h ' : ''}${m}m`;
  };

  // 1. Identificar perfil e escopo de visibilidade do usuário ativo
  const currentUser = users.find(u => u.id === currentUserId);
  const userRole = currentUser ? currentUser.role : 'member';

  // Encontrar a Gerência do usuário atual (se ele está numa subárea, buscar o parentId pai)
  let currentUserGerenciaId = currentUser?.areaId;
  const currentUserArea = areas.find(a => a.id === currentUserGerenciaId);
  if (currentUserArea && currentUserArea.parentId) {
    currentUserGerenciaId = currentUserArea.parentId;
  }

  // Descobrir todas as áreas (incluindo subáreas) que pertencem a essa gerência
  const allowedAreaIds = getSubtreeAreaIds(currentUserGerenciaId);

  // Usuários que pertencem à gerência do usuário logado
  const allowedUserIds = users
    .filter(u => allowedAreaIds.includes(u.areaId))
    .map(u => u.id);

  const isTaskVisibleInTeamScope = (task: Task) => {
    if (userRole === 'admin') return true;

    const taskAreaIds = [
      task.areaId,
      task.demandanteAreaId,
      (task as any).area_id,
      (task as any).demandante_area_id,
    ].filter(Boolean) as string[];

    if (taskAreaIds.some(areaId => allowedAreaIds.includes(areaId))) {
      return true;
    }

    if (task.ownerId === currentUserId || task.memberIds?.includes(currentUserId)) {
      return true;
    }

    const relatedUserIds = [task.ownerId, ...(task.memberIds || [])].filter(Boolean);
    return relatedUserIds.some(userId => allowedUserIds.includes(userId));
  };

  // Filtragem local fina de visibilidade no Diário de Bordo:
  const visibleTasks = tasks.filter(task => {
    return isTaskVisibleInTeamScope(task);
  });

  // 2. Filtrar apenas tarefas qualificadas (com tempo registrado OU concluídas)
  const qualifiedTasks = visibleTasks.filter(task => {
    const hasTimeLogs = (task.timeLogs || []).some(tl => (tl?.durationSeconds || 0) > 0);
    const isCompleted = task.progress === 100;
    return hasTimeLogs || isCompleted;
  });

  // 3. Converter tarefas qualificadas em itens unificados do feed cronológico
  const feedItems: any[] = [];

  qualifiedTasks.forEach(task => {
    const totalDuration = (task.timeLogs || []).reduce((sum, tl) => sum + (tl?.durationSeconds || 0), 0);
    const isCompleted = task.progress === 100;

    // Agrupar os logs de tempo por dia
    const timeLogsByDay: Record<string, number> = {};
    let hasLogs = false;

    (task.timeLogs || []).forEach(tl => {
      if (tl?.startTime && tl.durationSeconds && tl.durationSeconds > 0) {
        try {
          const dateStr = format(parseISO(tl.startTime), 'yyyy-MM-dd');
          timeLogsByDay[dateStr] = (timeLogsByDay[dateStr] || 0) + tl.durationSeconds;
          hasLogs = true;
        } catch (e) {
          console.error("Erro ao analisar data do timeLog", e);
        }
      }
    });

    if (hasLogs) {
      // Criar uma entrada no feed para cada dia em que houve tempo registrado
      Object.keys(timeLogsByDay).forEach(day => {
        feedItems.push({
          id: `${task.id}-${day}`,
          date: day,
          userId: task.ownerId,
          projectName: task.projectName || 'Sem Projeto',
          taskTitle: task.title,
          taskType: task.taskType || 'activity',
          tagIds: task.tagIds || [],
          durationSeconds: timeLogsByDay[day],
          totalDurationSeconds: totalDuration,
          progress: task.progress,
          isCompleted: isCompleted,
          task: task
        });
      });
    } else if (isCompleted) {
      // Se a tarefa está concluída mas não tem registros de tempo
      const doneDate = task.deadline
        ? format(parseISO(task.deadline), 'yyyy-MM-dd')
        : (task.startDate ? format(parseISO(task.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));

      feedItems.push({
        id: `${task.id}-completed`,
        date: doneDate,
        userId: task.ownerId,
        projectName: task.projectName || 'Sem Projeto',
        taskTitle: task.title,
        taskType: task.taskType || 'activity',
        tagIds: task.tagIds || [],
        durationSeconds: 0,
        totalDurationSeconds: 0,
        progress: 100,
        isCompleted: true,
        task: task
      });
    }
  });

  // 4. Filtrar itens localmente baseado nos filtros da tela do Diário de Bordo (Tag e Conclusão)
  const filteredItems = feedItems.filter(item => {
    if (filterStatus === 'completed' && !item.isCompleted) return false;
    if (filterStatus === 'in_progress' && item.isCompleted) return false;
    if (filterTag !== 'all' && !item.tagIds.includes(filterTag)) return false;
    return true;
  });

  // 5. Agrupar por data
  const groupedLogs = filteredItems.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  // Ordenar datas de forma decrescente
  const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

  const getDateSummary = (date: string) => {
    const items = groupedLogs[date] || [];
    const support = items.filter(item => item.taskType === 'support').length;
    const activities = items.length - support;
    const totalSeconds = items.reduce((acc, item) => acc + (item?.durationSeconds || 0), 0);

    return { activities, support, totalSeconds };
  };

  // Expandir a data mais recente por padrão na primeira carga
  React.useEffect(() => {
    if (!isInitialized && sortedDates.length > 0) {
      setExpandedDates([sortedDates[0]]);
      setIsInitialized(true);
    }
  }, [sortedDates, isInitialized]);

  const toggleDate = (date: string) => {
    if (expandedDates.includes(date)) {
      setExpandedDates(expandedDates.filter(d => d !== date));
    } else {
      setExpandedDates([...expandedDates, date]);
    }
  };

  const getDayLabel = (date: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (date === today) return 'Hoje';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date === format(yesterday, 'yyyy-MM-dd')) return 'Ontem';

    try {
      return format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR });
    } catch (e) {
      return date;
    }
  };

  return (
    <div className="space-y-6">
      {/* Feed Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-800 p-3 rounded-[16px] border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 flex-1 overflow-x-auto">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex-shrink-0">
            <Filter className="w-4 h-4 text-gray-400" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-1.5 focus:border-[#374A67] outline-none text-gray-700 dark:text-gray-200"
          >
            <option value="all">Todas as Tarefas</option>
            <option value="in_progress">Em Execução</option>
            <option value="completed">Concluídas</option>
          </select>

          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-1.5 focus:border-[#374A67] outline-none text-gray-700 dark:text-gray-200"
          >
            <option value="all">Todas as Tags</option>
            {tags.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 shrink-0">
          {filteredItems.length} {filteredItems.length === 1 ? 'registro' : 'registros'}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma atividade ou tarefa registrada com os filtros atuais.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map(date => (
            <div key={date} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => toggleDate(date)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 capitalize">
                      {getDayLabel(date)}
                    </h3>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-2.5 py-0.5 rounded-full">
                      {groupedLogs[date].length} {groupedLogs[date].length === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  </div>
                  {(() => {
                    const summary = getDateSummary(date);
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        {summary.activities > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-[#0E1116] dark:text-green-400 border border-green-100 dark:border-green-800 text-[10px] font-black uppercase tracking-wide">
                            <Briefcase size={10} />
                            {summary.activities} {summary.activities === 1 ? 'atividade' : 'atividades'}
                          </span>
                        )}
                        {summary.support > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[10px] font-black uppercase tracking-wide">
                            <Zap size={10} className="fill-current" />
                            {summary.support} {summary.support === 1 ? 'suporte' : 'suportes'}
                          </span>
                        )}
                        {summary.totalSeconds > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-[#374A67] dark:text-orange-400 border border-orange-100 dark:border-orange-800 text-xs font-bold shadow-sm">
                          <Clock size={12} />
                          <span>Total: {fmtDuration(summary.totalSeconds)}</span>
                        </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {expandedDates.includes(date) ? (
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                )}
              </button>

              {expandedDates.includes(date) && (
                <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  {groupedLogs[date].sort((a,b) => b.id.localeCompare(a.id)).map((item) => {
                    const user = getUser(item.userId);
                    const itemTags = getTags(item.tagIds);

                    return (
                      <div
                        key={item.id}
                        className={`bg-white dark:bg-gray-800 rounded-xl border-l-4 p-4 hover:shadow-md transition-all border-r border-t border-b border-gray-150 dark:border-gray-700 ${
                          item.isCompleted
                            ? 'border-l-[#0E1116]'
                            : item.taskType === 'support'
                              ? 'border-l-blue-500'
                              : 'border-l-[#374A67]'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-600 shrink-0 mt-0.5">
                              {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user?.name || 'Responsável'} className="w-full h-full object-cover" />
                              ) : (
                                <UserIcon className="w-5 h-5 text-gray-400" />
                              )}
                            </div>

                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{user?.name || 'Responsável'}</span>
                                {item.isCompleted ? (
                                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 dark:bg-green-950/40 text-[#0E1116] dark:text-green-400 border border-green-200 dark:border-green-800 text-[9px] font-black uppercase tracking-wider">
                                    <CheckCircle2 size={8} /> Concluída
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 text-[#374A67] dark:text-orange-400 border border-orange-200 dark:border-orange-900 text-[9px] font-black uppercase tracking-wider">
                                    <AlertCircle size={8} /> Em Andamento ({item.progress}%)
                                  </span>
                                )}
                              </div>

                              {/* Título da Atividade (Atividade) */}
                              <h4 className="font-extrabold text-[#0E1116] dark:text-gray-150 text-base tracking-tight leading-snug">
                                {item.taskTitle}
                              </h4>

                              {/* Resumo Geral: Projeto, Tipo/Suporte, Tags */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400 pt-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Projeto:</span>
                                  <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800 text-[9px] font-black uppercase tracking-wider">
                                    {item.projectName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Suporte:</span>
                                  <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                    item.taskType === 'support'
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800'
                                      : 'bg-green-50 dark:bg-green-900/30 text-[#0E1116] dark:text-green-400 border-[#0E1116]/20'
                                  }`}>
                                    {item.taskType === 'support' ? <Zap size={8} className="fill-current" /> : <Briefcase size={8} />}
                                    {item.taskType === 'support' ? 'Suporte' : 'Atividade'}
                                  </span>
                                </div>
                                {itemTags.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tags:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {itemTags.map(tag => (
                                        <span key={tag.id} className="px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold tracking-wider border" style={getTagStyle(tag.name)}>
                                          {tag.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Seção de Tempo à Direita */}
                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-gray-100 dark:border-gray-700 pt-3 md:pt-0 shrink-0 gap-2 w-full md:w-auto">
                            {item.durationSeconds > 0 ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-[#374A67] dark:text-orange-400 border border-orange-100 dark:border-orange-800 text-xs font-bold shadow-sm">
                                <Clock size={14} />
                                <span>No Dia: <strong>{fmtDuration(item.durationSeconds)}</strong></span>
                              </div>
                            ) : item.isCompleted ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-150 dark:border-gray-650 text-xs font-medium">
                                <Clock size={14} />
                                <span>Sem logs de tempo</span>
                              </div>
                            ) : null}

                            {item.totalDurationSeconds > 0 && (
                              <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Total Geral: <span className="font-mono text-gray-700 dark:text-gray-300 font-black">{fmtDuration(item.totalDurationSeconds)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
