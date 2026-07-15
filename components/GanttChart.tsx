import React, { useMemo } from 'react';
import { Project } from '../services/projects';
import { format, parseISO, differenceInDays, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GanttChartProps {
  projects: Project[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ projects }) => {
  // Filter active projects with start and end dates
  const activeProjects = projects.filter(p => p.start_date && p.end_date && p.status !== 'Cancelado');

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (activeProjects.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 0 };

    let min = parseISO(activeProjects[0].start_date!);
    let max = parseISO(activeProjects[0].end_date!);

    activeProjects.forEach(p => {
      const s = parseISO(p.start_date!);
      const e = parseISO(p.end_date!);
      if (s < min) min = s;
      if (e > max) max = e;
    });

    // Add a little padding (7 days before, 14 days after)
    min = addDays(min, -7);
    max = addDays(max, 14);

    return { minDate: min, maxDate: max, totalDays: differenceInDays(max, min) };
  }, [activeProjects]);

  if (activeProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-gray-800 rounded-[40px] border-2 border-dashed border-gray-100 dark:border-gray-700 text-gray-400">
        <p className="font-black uppercase tracking-widest text-xs">Nenhum projeto com data inicial e final definidas.</p>
      </div>
    );
  }

  // Generate days array for headers
  const days = Array.from({ length: totalDays }, (_, i) => addDays(minDate, i));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50 dark:bg-gray-700">
        <h3 className="font-black text-[#0E1116] dark:text-gray-100 text-xs uppercase tracking-widest">Cronograma de Projetos (Gantt)</h3>
        <div className="flex gap-4 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Em Andamento</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#0E1116]" /> Concluído</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Atrasado / Risco</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1000px] p-4">

          {/* Header row */}
          <div className="flex ml-64 border-b border-gray-100 dark:border-gray-700 pb-2 mb-4">
             {days.map((date, i) => {
               // Only show dates every 7 days or first day of month to avoid clutter
               const isVisible = date.getDate() === 1 || i % 7 === 0;
               return (
                 <div key={i} className="flex-1 relative min-w-[20px] text-center">
                   {isVisible && (
                     <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase">{format(date, 'MMM', { locale: ptBR })}</span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{format(date, 'dd')}</span>
                        <div className="w-px h-full border-l border-dashed border-gray-200 dark:border-gray-600 mt-1 absolute top-8 bottom-0" style={{ height: '500px' }} />
                     </div>
                   )}
                 </div>
               );
             })}
          </div>

          {/* Project rows */}
          <div className="space-y-4">
            {activeProjects.map(project => {
               const s = parseISO(project.start_date!);
               const e = parseISO(project.end_date!);
               const startOffset = differenceInDays(s, minDate);
               const duration = differenceInDays(e, s) + 1; // inclusive

               const leftPct = (startOffset / totalDays) * 100;
               const widthPct = (duration / totalDays) * 100;

               // Determine color
               let colorClass = 'bg-blue-500 shadow-blue-200';
               if (project.status === 'Concluído') colorClass = 'bg-[#0E1116] shadow-green-200';
               else if (differenceInDays(e, new Date()) < 0) colorClass = 'bg-orange-500 shadow-orange-200';

               const progress = project.progress || 0;

               return (
                 <div key={project.id} className="flex items-center relative group hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-xl transition-colors">
                    {/* Project Name column */}
                    <div className="w-64 flex-shrink-0 pr-4">
                      <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate" title={project.name}>{project.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate">{project.owner_id || 'Sem resp.'}</p>
                    </div>

                    {/* Timeline area */}
                    <div className="flex-1 relative h-10 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                      {/* Current Date Line */}
                      <div className="absolute top-0 bottom-0 border-l border-red-300 z-10 pointer-events-none" style={{ left: `${(differenceInDays(new Date(), minDate) / totalDays) * 100}%` }}></div>

                      <div
                        className={`absolute top-1 bottom-1 rounded-md shadow-md flex items-center overflow-hidden cursor-pointer group-hover:ring-2 ring-gray-300 transition-all ${colorClass}`}
                        style={{ left: `${Math.max(0, leftPct)}%`, width: `${Math.min(100, widthPct)}%` }}
                        title={`${project.name}\n${format(s, 'dd/MM/yyyy')} a ${format(e, 'dd/MM/yyyy')}\nProgresso: ${progress}%`}
                      >
                         <div className="h-full bg-black/20" style={{ width: `${progress}%` }} />
                         <span className="absolute left-2 text-[10px] font-black text-white mix-blend-difference truncate">
                           {progress}%
                         </span>
                      </div>
                    </div>
                 </div>
               );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
