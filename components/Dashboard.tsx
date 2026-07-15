import React from 'react';
import { User, ActivityLog, Tag, StatusConfig, Task, Area } from '../types';
import { format, subDays, isSameDay, parseISO, isSaturday, isSunday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, PieChart, Activity, Filter, Map } from 'lucide-react';
import { StatsChart } from './StatsChart';
import { format as formatFns } from 'date-fns';
import { parseHoursStr, getHierarchicalAreaFilterIds } from '../utils';
import { GlobalHierarchicalSelect } from './GlobalHierarchicalSelect';

interface DashboardProps {
  logs: ActivityLog[];
  frequencyLogs?: ActivityLog[];
  users: User[];
  tags: Tag[];
  statuses: StatusConfig[];
  viewMode: 'manager' | 'personal';
  tasks: Task[];
  currentUser?: User;
  areas?: Area[];
}

export const Dashboard: React.FC<DashboardProps> = ({ logs, users, tags, statuses, viewMode, tasks, currentUser, areas = [] }) => {
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = React.useState<string | 'all'>('all');

  const members = React.useMemo(() => {
    let list = users;
    if (viewMode === 'manager' && selectedAreaId !== 'all') {
      if (selectedAreaId.startsWith('area:')) {
        const aId = selectedAreaId.split(':')[1];
        const validAreaIds = getHierarchicalAreaFilterIds([aId], areas);
        list = list.filter(u => u.areaId && validAreaIds.includes(u.areaId));
      } else if (selectedAreaId.startsWith('user:')) {
        const uid = selectedAreaId.split(':')[1];
        list = list.filter(u => u.id === uid);
      }
    }
    return list;
  }, [users, viewMode, selectedAreaId, areas]);

  const today = new Date();

  const getLast7WorkingDays = () => {
    const days = [];
    let current = today;
    while (days.length < 7) {
      if (!isSaturday(current) && !isSunday(current)) {
        days.push(current);
      }
      current = subDays(current, 1);
    }
    return days;
  };

  const lastWorkingDays = getLast7WorkingDays();

  const isSupport = (task: Task) => task.taskType === 'support' || (!task.projectId && !task.projectName);

  // Conta tarefas concluídas (progress=100 ou status=done) por usuário/dia
  // Usa timeLogs.endTime para determinar o dia de conclusão
  const getCompletedTasksOnDate = (userId: string, date: Date): { activities: number; support: number } => {
    let activities = 0;
    let support = 0;

    tasks.filter(t => t.ownerId === userId || t.memberIds?.includes(userId)).forEach(task => {
      if (task.timeLogs && task.timeLogs.length > 0) {
        // Verifica se algum timeLog terminou nesse dia
        const hasLogOnDay = task.timeLogs.some(log => {
          if (log?.endTime) {
            return isSameDay(new Date(log.endTime), date);
          }
          return false;
        });
        if (hasLogOnDay) {
          if (isSupport(task)) support++;
          else activities++;
        }
      } else if (task.progress === 100 && task.deadline) {
        // Para tarefas sem timeLogs, usa deadline como referência
        try {
          if (isSameDay(parseISO(task.deadline), date)) {
            if (isSupport(task)) support++;
            else activities++;
          }
        } catch {}
      }
    });

    // Também conta registros do diário de bordo
    const logCount = logs.filter(log =>
      log.userId === userId && isSameDay(parseISO(log.date), date)
    ).length;

    // Se não tem tarefas mas tem logs, conta os logs como atividades
    return { activities, support };
  };

  const allocationData = React.useMemo(() => {
    if (!currentUser) return null;

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const availableHours = currentUser.available_hours || 160;
    let alocadoHours = 0;
    let realizadoHours = 0;
    let realizadoProjectsHours = 0;
    let realizadoSupportHours = 0;

    tasks.forEach(task => {
      if (task.ownerId === currentUser.id) {
        const isDone = task.status === 'done' || task.progress === 100;
        if (task.hours && !isDone) {
          let isTaskInMonth = false;
          if (task.startDate) {
            try {
              const d = parseISO(task.startDate);
              isTaskInMonth = d >= startOfCurrentMonth && d <= endOfCurrentMonth;
            } catch {
              isTaskInMonth = true;
            }
          } else {
            isTaskInMonth = true;
          }

          if (isTaskInMonth) {
            alocadoHours += parseHoursStr(task.hours);
          }
        }

        if (task.timeLogs && task.timeLogs.length > 0) {
          task.timeLogs.forEach(log => {
            if (log?.startTime) {
              try {
                const logDate = new Date(log.startTime);
                if (logDate >= startOfCurrentMonth && logDate <= endOfCurrentMonth) {
                  let duration = 0;
                  if (log.durationSeconds) {
                    duration = log.durationSeconds / 3600;
                  } else if (log.endTime) {
                    duration = (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 3600000;
                  }
                  realizadoHours += duration;
                  if (task.taskType === 'support' || (!task.projectId && !task.projectName)) {
                    realizadoSupportHours += duration;
                  } else {
                    realizadoProjectsHours += duration;
                  }
                }
              } catch {}
            }
          });
        }
      }
    });

    return {
      availableHours: Number(availableHours.toFixed(1)),
      alocadoHours: Number(alocadoHours.toFixed(1)),
      realizadoHours: Number(realizadoHours.toFixed(1)),
      realizadoProjectsHours: Number(realizadoProjectsHours.toFixed(1)),
      realizadoSupportHours: Number(realizadoSupportHours.toFixed(1)),
    };
  }, [currentUser, tasks]);

  return (
    <div className="space-y-6 mb-8">
      {/* Indicadores do Colaborador (Alocação) */}
      {viewMode === 'personal' && allocationData && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-[#0E1116] dark:text-gray-100 flex items-center gap-2 text-base">
                <Activity className="w-5 h-5 text-indigo-500" />
                Minha Alocação de Tempo (Mês Atual)
              </h3>
              <p className="text-xs text-gray-500">Acompanhamento de horas contratadas, estimadas e realizadas</p>
            </div>
            <div className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full uppercase">
              {currentUser?.name}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Barra 1: Disponível vs Alocado */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-end mb-2 text-xs">
                <span className="font-bold text-gray-600 dark:text-gray-400 font-medium">Tempo Alocado (Estimado)</span>
                <span className={`font-black ${
                  allocationData.availableHours > 0 && (allocationData.alocadoHours / allocationData.availableHours) > 1
                    ? 'text-red-500'
                    : 'text-gray-800 dark:text-white'
                }`}>
                  {allocationData.alocadoHours}h / {allocationData.availableHours}h ({
                    allocationData.availableHours > 0 ? Math.round((allocationData.alocadoHours / allocationData.availableHours) * 100) : 0
                  }%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    allocationData.availableHours > 0 && (allocationData.alocadoHours / allocationData.availableHours) > 1
                      ? 'bg-red-500'
                      : 'bg-blue-600'
                  }`}
                  style={{
                    width: `${Math.min(100, allocationData.availableHours > 0 ? (allocationData.alocadoHours / allocationData.availableHours) * 100 : 0)}%`
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-medium">
                Soma dos tempos estimados das suas tarefas para este mês.
              </p>
            </div>

            {/* Barra 2: Disponível vs Realizado */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-end mb-2 text-xs">
                <span className="font-bold text-gray-600 dark:text-gray-400 font-medium">Tempo Realizado</span>
                <span className="font-black text-gray-800 dark:text-white">
                  {allocationData.realizadoHours}h / {allocationData.availableHours}h ({
                    allocationData.availableHours > 0 ? Math.round((allocationData.realizadoHours / allocationData.availableHours) * 100) : 0
                  }%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  title={`Projetos: ${allocationData.realizadoProjectsHours}h`}
                  style={{
                    width: `${Math.min(100, allocationData.availableHours > 0 ? (allocationData.realizadoProjectsHours / allocationData.availableHours) * 100 : 0)}%`
                  }}
                />
                <div
                  className="h-full bg-[#374A67] transition-all duration-500"
                  title={`Suporte: ${allocationData.realizadoSupportHours}h`}
                  style={{
                    width: `${Math.min(
                      100 - (allocationData.availableHours > 0 ? Math.min(100, (allocationData.realizadoProjectsHours / allocationData.availableHours) * 100) : 0),
                      allocationData.availableHours > 0 ? (allocationData.realizadoSupportHours / allocationData.availableHours) * 100 : 0
                    )}%`
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-bold uppercase">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Projetos: {allocationData.realizadoProjectsHours}h
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#374A67] inline-block" />
                  Suporte: {allocationData.realizadoSupportHours}h
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline View */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-[#0E1116] dark:text-gray-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#374A67]" />
              Frequência (Últimos 7 dias úteis)
            </h3>
            {viewMode === 'manager' && areas.length > 0 && (
              <div className="w-56">
                <GlobalHierarchicalSelect
                  areas={areas}
                  users={users}
                  selectedValue={selectedAreaId}
                  onChange={setSelectedAreaId}
                />
              </div>
            )}
          </div>
          <div className="flex gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
             <span className="flex items-center gap-1.5">
               <div className="w-3 h-3 rounded-sm bg-[#374A67]"></div> Atividades
             </span>
             <span className="flex items-center gap-1.5">
               <div className="w-3 h-3 rounded-sm bg-blue-500"></div> Suporte
             </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 font-medium">Colaborador</th>
                {lastWorkingDays.map(date => (
                  <th key={date.toString()} className="px-4 py-3 font-medium text-center min-w-[70px]">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase">{format(date, 'EEE', { locale: ptBR })}</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-300">{format(date, 'dd')}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#0E1116] dark:text-gray-100 flex items-center gap-3">
                    <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-gray-200" />
                    {member.name}
                  </td>
                  {lastWorkingDays.map(date => {
                    const counts = getCompletedTasksOnDate(member.id, date);
                    const total = counts.activities + counts.support;
                    return (
                      <td key={date.toString()} className="px-4 py-4 text-center">
                        {total > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-0.5">
                              {counts.activities > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-md bg-[#374A67]/10 text-[#374A67] text-[10px] font-black px-1.5 border border-[#374A67]/20" title="Atividades">
                                  {counts.activities}
                                </span>
                              )}
                              {counts.support > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-md bg-blue-500/10 text-blue-600 text-[10px] font-black px-1.5 border border-blue-500/20" title="Suporte">
                                  {counts.support}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex justify-center items-center w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700">
                             <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <StatsChart
           logs={logs}
           tags={tags}
           title="Distribuição por Tags"
           onTagClick={(tagId) => {
             setSelectedTag(prev => prev === tagId ? null : tagId);
             setSelectedStatus(null);
           }}
           selectedTagId={selectedTag}
         />

         <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
            <h3 className="font-black text-[#0E1116] dark:text-gray-100 mb-6 flex items-center gap-2 text-base uppercase tracking-tight">
              <PieChart className="w-5 h-5 text-[#374A67]" />
              Status das Atividades
            </h3>

            <div className="space-y-3">
               {statuses.map(status => {
                 const count = logs.filter(l => l.status === status.id).length;
                 const total = logs.length || 1;
                 const percent = Math.round((count / total) * 100);
                 const barColor = status.color.includes('text-[#0E1116]') ? 'bg-[#0E1116]' : status.color.split(' ')[0].replace('100', '500').replace('50', '600');

                 return (
                   <div
                     key={status.id}
                     className={`cursor-pointer transition-all p-3 rounded-xl border ${selectedStatus === status.id ? 'bg-orange-50/50 border-orange-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-100 dark:hover:border-gray-600'}`}
                     onClick={() => {
                       setSelectedStatus(prev => prev === status.id ? null : status.id);
                       setSelectedTag(null);
                     }}
                   >
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">{status.label}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-black text-gray-900 dark:text-gray-100">{count}</span>
                          <span className="text-gray-400 font-medium">({percent}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2.5 overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: `${percent}%` }}></div>
                      </div>
                   </div>
                 )
               })}
            </div>
         </div>
      </div>

      {/* Drill-down View */}
      {(selectedTag || selectedStatus) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-[#374A67] overflow-hidden mt-6 animate-in fade-in slide-in-from-top-4">
          <div className="px-6 py-4 border-b border-orange-100 dark:border-orange-800 bg-orange-50 flex items-center justify-between">
            <h3 className="font-bold text-[#0E1116] dark:text-gray-100 flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#374A67]" />
              Atividades Filtradas: {
                selectedTag === 'untagged' ? 'Sem Tag' :
                selectedTag ? tags.find(t => t.id === selectedTag)?.name :
                selectedStatus ? statuses.find(s => s.id === selectedStatus)?.label : ''
              }
            </h3>
            <button
              onClick={() => { setSelectedTag(null); setSelectedStatus(null); }}
              className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow-sm"
            >
              Limpar Filtro
            </button>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Data</th>
                  <th className="px-6 py-3 font-medium">Colaborador</th>
                  <th className="px-6 py-3 font-medium">Atividade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs
                  .filter(l =>
                    (selectedTag === 'untagged' ? (!l.tagIds || l.tagIds.length === 0) : false) ||
                    (selectedTag && selectedTag !== 'untagged' ? l.tagIds?.includes(selectedTag) : true)
                  )
                  .filter(l => selectedStatus ? l.status === selectedStatus : true)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(log => {
                    const user = users.find(u => u.id === log.userId);
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {formatFns(parseISO(log.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-6 py-4 font-medium text-[#0E1116] dark:text-gray-100">
                          {user?.name || 'Desconhecido'}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {log.content}
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
