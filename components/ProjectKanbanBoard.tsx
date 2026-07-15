import React, { useState } from 'react';
import { Project } from '../services/projects';
import { User, Area } from '../types';
import { Clock, Plus, Target, CheckCircle2, AlertCircle, Globe2 } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

interface ProjectKanbanBoardProps {
  projects: Project[];
  users: User[];
  areas: Area[];
  onProjectStatusChange: (projectId: string, newStatus: string) => Promise<void>;
  onProjectClick: (project: Project) => void;
}

const STATUS_COLUMNS = [
  'Não iniciado/Backlog',
  'Ativo',
  'Atrasado',
  'Impedido',
  'Pausado',
  'Concluído',
  'Cancelado'
];

export const ProjectKanbanBoard: React.FC<ProjectKanbanBoardProps> = ({
  projects,
  users,
  areas,
  onProjectStatusChange,
  onProjectClick
}) => {
  const [draggedProject, setDraggedProject] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggedProject(projectId);
    e.dataTransfer.setData('text/plain', projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('text/plain');
    if (projectId) {
      await onProjectStatusChange(projectId, status);
    }
    setDraggedProject(null);
  };

  const getDeadlineStatus = (endDate: string | undefined) => {
    if (!endDate) return 'prazo';
    const today = new Date();
    const deadline = parseISO(endDate);
    const diffDays = differenceInDays(deadline, today);
    if (diffDays < 0) return 'atrasado';
    if (diffDays <= 7) return 'risco';
    return 'prazo';
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px]">
      {STATUS_COLUMNS.map(status => {
        const columnProjects = projects.filter(p => p.status === status);

        return (
          <div
            key={status}
            className="flex-1 min-w-[320px] max-w-[400px] bg-gray-50/50 dark:bg-gray-800/20 rounded-[32px] p-5 border border-gray-100 dark:border-gray-700 flex flex-col transition-all duration-200"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="font-black text-[#0E1116] dark:text-gray-100 text-sm uppercase tracking-widest flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${status === 'Concluído' ? 'bg-[#0E1116]' : status === 'Ativo' ? 'bg-[#374A67]' : status === 'Cancelado' ? 'bg-red-500' : status === 'Atrasado' ? 'bg-red-600' : status === 'Impedido' ? 'bg-orange-600' : status === 'Pausado' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                {status}
              </h3>
              <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">
                {columnProjects.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {columnProjects.map(project => {
                const owner = users.find(u => u.id === project.owner_id);
                const area = areas.find(a => a.id === project.area_id);
                const isClosed = project.status === 'Concluído' || project.status === 'Cancelado';
                const deadlineStatus = isClosed ? 'prazo' : getDeadlineStatus(project.end_date);

                return (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id)}
                    onDragEnd={() => setDraggedProject(null)}
                    onClick={() => onProjectClick(project)}
                    className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border ${draggedProject === project.id ? 'border-[#0E1116] shadow-md opacity-50' : 'border-gray-100 dark:border-gray-700'} shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group`}
                  >
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                        {area?.name || 'Sem Área'}
                      </span>
                      {project.publicar_portal && (
                        <span
                          title="Publicado no Portal de Transparência"
                          className="text-[9px] font-black uppercase tracking-widest text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 border border-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800"
                        >
                          <Globe2 size={10} /> Portal
                        </span>
                      )}
                      {deadlineStatus === 'atrasado' && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                          <AlertCircle size={10} /> Atrasado
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-[#0E1116] dark:text-gray-100 text-sm mb-2 line-clamp-2">
                      {project.name}
                    </h4>

                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">
                      {project.end_date && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className={deadlineStatus === 'atrasado' ? 'text-red-500' : 'text-gray-400'} />
                          <span className={deadlineStatus === 'atrasado' ? 'text-red-600' : ''}>
                            {format(parseISO(project.end_date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      )}
                      {project.progress > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Target size={14} className="text-[#0E1116]" />
                          <span className="text-[#0E1116]">{project.progress}%</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={owner?.avatarUrl || `https://ui-avatars.com/api/?name=${owner?.name || 'User'}&background=005C46&color=fff`}
                          alt={owner?.name || 'Responsável'}
                          className="w-6 h-6 rounded-full border border-gray-200"
                        />
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 truncate max-w-[100px]">
                          {owner?.name || 'Sem Responsável'}
                        </span>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={12} className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {columnProjects.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-xs font-medium border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                  Arraste projetos para cá
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
