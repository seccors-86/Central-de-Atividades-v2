import React from 'react';
import { ActivityLog, Tag } from '../types';
import { PieChart } from 'lucide-react';
import { getTagChartColorHex } from "../tagUtils";

interface StatsChartProps {
  logs: ActivityLog[];
  tags: Tag[];
  title?: string;
  onTagClick?: (tagId: string | null) => void;
  selectedTagId?: string | null;
}

export const StatsChart: React.FC<StatsChartProps> = ({
  logs,
  tags,
  title = "Distribuição de Atividades",
  onTagClick,
  selectedTagId
}) => {
  // Calculate distribution
  const stats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    let totalTagged = 0;

    logs.forEach(log => {
      if (log?.tagIds && log.tagIds.length > 0) {
        log.tagIds.forEach(tagId => {
          counts[tagId] = (counts[tagId] || 0) + 1;
          totalTagged++;
        });
      } else {
        counts['untagged'] = (counts['untagged'] || 0) + 1;
        totalTagged++;
      }
    });

    return { counts, total: totalTagged };
  }, [logs]);

  // if (logs.length === 0) return null;

  const sortedTags = [...tags].sort((a, b) => {
    const countA = stats.counts[a.id] || 0;
    const countB = stats.counts[b.id] || 0;
    return countB - countA;
  }).filter(t => (stats.counts[t.id] || 0) > 0); // Only show tags with data

  // Include untagged if exists
  const untaggedCount = stats.counts['untagged'] || 0;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] h-full">
      <h3 className="font-black text-[#0E1116] dark:text-gray-100 mb-6 flex items-center gap-2 text-base uppercase tracking-tight">
        <PieChart className="w-5 h-5 text-[#374A67]" />
        {title}
      </h3>

      <div className="space-y-3">
        {stats.total === 0 ? (
           <p className="text-sm text-gray-400 text-center py-6 italic font-medium">Nenhuma atividade classificada no período.</p>
        ) : (
          <>
            {sortedTags.map(tag => {
              const count = stats.counts[tag.id] || 0;
              const percent = Math.round((count / stats.total) * 100);

               let barColor = '#6b7280'; // Default Gray

               const colorMap: Record<string, string> = {
                 'blue': '#3b82f6',
                 'fuchsia': '#d946ef',
                 'emerald': '#10b981',
                 'indigo': '#6366f1',
                 'rose': '#f43f5e',
                 'amber': '#f59e0b',
                 'cyan': '#06b6d4',
                 'slate': '#64748b',
                 'gray': '#6b7280',
                 'violet': '#8b5cf6',
                 'purple': '#a855f7',
                 'pink': '#ec4899',
                 'sky': '#0ea5e9',
                 'yellow': '#eab308',
                 'orange': '#f97316',
                 'teal': '#14b8a6',
                 'green': '#22c55e',
                 'lime': '#84cc16',
                 'red': '#ef4444'
               };

               if (tag.color) {
                   const match = tag.color.match(/bg-([a-z]+)-/);
                   if (match && match[1] && colorMap[match[1]]) {
                       barColor = colorMap[match[1]];
                   } else {
                       barColor = getTagChartColorHex(tag.name);
                   }
               } else {
                    barColor = getTagChartColorHex(tag.name);
               }

               return (
                 <div
                   key={tag.id}
                   onClick={() => onTagClick?.(tag.id)}
                   className={`cursor-pointer transition-all p-3 rounded-xl border ${selectedTagId === tag.id ? 'bg-orange-50/50 border-orange-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-100 dark:hover:border-gray-600'}`}
                 >
                   <div className="flex justify-between items-end mb-2">
                     <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">{tag.name}</span>
                     <div className="flex items-center gap-2 text-xs">
                        <span className="font-black text-gray-900 dark:text-gray-100">{count}</span>
                        <span className="text-gray-400 font-medium">({percent}%)</span>
                     </div>
                   </div>
                   <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2.5 overflow-hidden shadow-inner">
                     <div
                       className="h-full rounded-full transition-all duration-1000 ease-out"
                       style={{ width: `${percent}%`, backgroundColor: barColor }}
                     />
                  </div>
                </div>
              );
            })}

            {untaggedCount > 0 && (
              <div
                className={`cursor-pointer transition-all p-3 rounded-xl border ${selectedTagId === 'untagged' ? 'bg-orange-50/50 border-orange-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-100 dark:hover:border-gray-600'}`}
                onClick={() => onTagClick?.('untagged')}
              >
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sem Tag</span>
                  <div className="flex items-center gap-2 text-xs">
                     <span className="font-black text-gray-400">{untaggedCount}</span>
                     <span className="text-gray-400 font-medium">({Math.round((untaggedCount / stats.total) * 100)}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2.5 shadow-inner">
                  <div
                    className="h-full bg-gray-300 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.round((untaggedCount / stats.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
