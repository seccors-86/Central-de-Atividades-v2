import React, { useState, useEffect } from 'react';
import { ProjectActivity, getProjectActivities, getProjects } from '../services/projects';
import { Clock, Plus, SquareCheckBig, Search } from 'lucide-react';
import { formatEstimatedMinutes } from '../utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CrossProjectKanbanProps {
  currentUser: any;
  users: any[];
}

export const CrossProjectKanban: React.FC<CrossProjectKanbanProps> = ({ currentUser, users }) => {
  const [activities, setActivities] = useState<(ProjectActivity & { project_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadAllTasks = async () => {
      setLoading(true);
      try {
        // Fetch all projects first
        const projectsRes = await getProjects({ limit: '100' });
        const allProjects = projectsRes.data;

        // Fetch activities for each project (ideally an API endpoint would return all tasks, but we loop for now)
        const allActivities: (ProjectActivity & { project_name: string })[] = [];

        // This is a naive approach; in a real scenario we'd want a cross-project tasks endpoint
        for (const p of allProjects) {
          try {
            const actRes = await getProjectActivities(p.id);
            actRes.forEach((a: any) => {
              allActivities.push({ ...a, project_name: p.name });
            });
          } catch (e) {
            console.error(`Error loading activities for ${p.id}`, e);
          }
        }

        setActivities(allActivities);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAllTasks();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-[#0E1116] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const columns = ['A fazer', 'Em andamento', 'Concluído'];

  const filteredActivities = activities.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.project_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
         <div className="relative w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar atividades ou projetos..."
              className="w-full pl-11 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#374A67]/20 transition-all shadow-sm"
            />
         </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 overflow-x-auto pb-6">
        {columns.map(status => {
          const columnTasks = filteredActivities.filter(a => a.status === status);

          return (
            <div key={status} className="flex-1 min-w-[300px] bg-gray-50 dark:bg-gray-700 rounded-[32px] p-5 border border-gray-100 dark:border-gray-700 flex flex-col max-h-[800px]">
              <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="font-black text-[#0E1116] dark:text-gray-100 text-sm uppercase tracking-widest flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${status === 'Concluído' ? 'bg-[#0E1116]' : status === 'Em andamento' ? 'bg-[#374A67]' : 'bg-gray-400'}`} />
                  {status}
                </h3>
                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">{columnTasks.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {columnTasks.map(task => (
                  <div key={task.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {task.project_name}
                      </span>
                      {task.priority === 'Urgente' && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded-md">Urgente</span>
                      )}
                    </div>

                    <h4 className="font-bold text-gray-900 dark:text-gray-300 text-sm mb-2 leading-tight group-hover:text-[#374A67] transition-colors">{task.title}</h4>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <Clock size={12} className="text-gray-400" />
                        {formatEstimatedMinutes(task.hours)}
                      </div>

                      <div className="flex -space-x-2">
                        {task.responsible_id && (
                          <img
                            src={users.find(u => u.id === task.responsible_id)?.avatarUrl || `https://ui-avatars.com/api/?name=${task.responsible}&background=005C46&color=fff`}
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            title={task.responsible}
                            alt={task.responsible}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {columnTasks.length === 0 && (
                  <div className="text-center p-6 text-gray-400 text-xs font-bold border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800/50">
                    Nenhuma atividade
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
