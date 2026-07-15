import React, { useMemo } from 'react';
import { Task, User } from '../types';
import { Project } from '../services/projects';
import { AlertCircle, Clock, ArrowUpCircle, ArrowRightCircle, ArrowDownCircle, Briefcase, CheckCircle2 } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PrioritizationViewProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
}

export const PrioritizationView: React.FC<PrioritizationViewProps> = ({ tasks, projects, users }) => {
  const getUser = (id: string) => users.find(u => u.id === id);

  const prioritizedTasks = useMemo(() => {
    return tasks
      .filter(t => !t.archived && t.progress < 100)
      .sort((a, b) => {
        const pMap: Record<string, number> = { 'alta': 3, 'média': 2, 'baixa': 1 };
        const pA = pMap[(a.priority || 'baixa').toLowerCase()] || 0;
        const pB = pMap[(b.priority || 'baixa').toLowerCase()] || 0;

        if (pA !== pB) return pB - pA;

        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  }, [tasks]);

  const prioritizedProjects = useMemo(() => {
    return projects
      .filter(p => !p.archived && p.status !== 'Concluído' && p.status !== 'Cancelado')
      .sort((a, b) => {
        if (!a.end_date) return 1;
        if (!b.end_date) return -1;
        return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
      });
  }, [projects]);

  const getPriorityBadge = (priority?: string) => {
    const p = (priority || 'baixa').toLowerCase();
    switch (p) {
      case 'alta': return <span className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><ArrowUpCircle size={10} /> Alta</span>;
      case 'média': return <span className="px-2 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-800 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><ArrowRightCircle size={10} /> Média</span>;
      case 'baixa': return <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><ArrowDownCircle size={10} /> Baixa</span>;
      default: return <span className="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-400 border border-gray-100 dark:border-gray-700 rounded-lg text-[9px] font-black uppercase tracking-widest">N/A</span>;
    }
  };

  const safeFormatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '--';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch (e) {
      return '--';
    }
  };

  const getDeadlineBadge = (dateStr?: string | null) => {
    if (!dateStr) return <span className="text-gray-300">--</span>;
    try {
      const deadline = parseISO(dateStr);
      const diff = differenceInDays(deadline, new Date());

      if (diff < 0) return <span className="text-red-600 font-black">Atrasado</span>;
      if (diff <= 2) return <span className="text-orange-500 font-black">Urgente</span>;
      return <span className="text-gray-600 dark:text-gray-300">{format(deadline, 'dd/MM/yyyy')}</span>;
    } catch (e) {
      return <span className="text-gray-300">--</span>;
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-300 uppercase tracking-tighter">Matriz de Priorização</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Foco no que é importante e urgente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Projects Priority */}
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#374A67]">
                 <Briefcase size={20} />
              </div>
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest">Projetos por Prazo</h3>
           </div>

           <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="w-full overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <th className="p-4 pl-6">Projeto</th>
                          <th className="p-4">Prazo</th>
                          <th className="p-4">Progresso</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {prioritizedProjects.map(project => (
                          <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                             <td className="p-4 pl-6">
                                <div className="font-bold text-xs text-gray-800 dark:text-gray-200">{project.name}</div>
                                <div className="text-[9px] text-gray-400 uppercase font-black">{project.category}</div>
                             </td>
                             <td className="p-4 text-xs font-bold">
                                {getDeadlineBadge(project.end_date)}
                             </td>
                             <td className="p-4">
                                <div className="flex items-center gap-2">
                                   <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div className="h-full bg-[#0E1116]" style={{ width: `${project.progress}%` }}></div>
                                   </div>
                                   <span className="text-[10px] font-black text-[#0E1116]">{project.progress}%</span>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        {/* Tasks Priority */}
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                 <CheckCircle2 size={20} />
              </div>
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest">Tarefas por Prioridade</h3>
           </div>

           <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="w-full overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <th className="p-4 pl-6">Tarefa</th>
                          <th className="p-4">Prioridade</th>
                          <th className="p-4 text-right pr-6">Responsável</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {prioritizedTasks.map(task => {
                          const owner = getUser(task.ownerId);
                          return (
                             <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <td className="p-4 pl-6">
                                   <div className="font-bold text-xs text-gray-800 dark:text-gray-200">{task.title}</div>
                                   <div className="text-[9px] text-gray-400 uppercase font-black">{task.projectName || 'Tarefa Avulsa'}</div>
                                </td>
                                <td className="p-4">
                                   {getPriorityBadge(task.priority)}
                                </td>
                                <td className="p-4 text-right pr-6">
                                   <div className="flex items-center justify-end gap-2">
                                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">{owner?.name?.split(' ')[0] || 'N/A'}</span>
                                      <img src={owner?.avatarUrl || ''} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700" />
                                   </div>
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
