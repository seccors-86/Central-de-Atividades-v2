import React from 'react';
import { GamificationProfile, Badge } from '../types';
import { Flame } from 'lucide-react';

interface GamificationWidgetProps {
  profile: GamificationProfile;
  allBadges: Badge[];
}

export const GamificationWidget: React.FC<GamificationWidgetProps> = ({ profile, allBadges }) => {
  // Fallback padrão se os badges ainda não tiverem carregado
  let currentBadge: Badge = {
    id: '1',
    name: 'Iniciante',
    icon: '🌱',
    minXp: 0,
    description: 'Seus primeiros passos na gestão.',
    colorGradient: 'from-green-400 to-emerald-600'
  };
  let nextBadge: Badge | null = null;

  if (allBadges && allBadges.length > 0) {
    const levelBadges = allBadges
      .filter(b => b.badgeType === 'level' || !b.badgeType)
      .sort((a, b) => a.minXp - b.minXp);

    for (let i = 0; i < levelBadges.length; i++) {
      if (profile.xpTotal >= levelBadges[i].minXp) {
        currentBadge = levelBadges[i];
        nextBadge = levelBadges[i + 1] || null;
      }
    }
  }

  // Calcular progresso até o próximo nível
  let xpProgress = 100;
  if (nextBadge) {
    const range = nextBadge.minXp - currentBadge.minXp;
    const currentInLevel = profile.xpTotal - currentBadge.minXp;
    xpProgress = Math.min(100, Math.max(0, (currentInLevel / range) * 100));
  }

  return (
    <div className="bg-[#0E1116] rounded-xl p-1 flex items-center gap-1 shadow-lg border border-gray-700 overflow-hidden max-w-full">
      {/* Badge Icon com gradiente dinâmico */}
      <div className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg shadow-inner bg-gradient-to-tr text-white ${currentBadge.colorGradient || 'from-green-400 to-emerald-600'}`}>
         {currentBadge.icon}
      </div>

      {/* Info Stats */}
      <div className="flex-1 px-2 py-1 min-w-[140px]">
         <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-white line-clamp-1">{currentBadge.name}</span>
            <span className="text-gray-400 font-medium text-[10px] whitespace-nowrap">{profile.xpTotal} XP</span>
         </div>

         {/* Progress Bar */}
         <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
               className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(55,74,103,0.5)]"
               style={{ width: `${xpProgress}%` }}
            />
         </div>
      </div>

      {/* Streak (Sequência) */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 rounded-lg border border-gray-700 h-full">
         <div className={`p-1 rounded-full ${profile.currentStreak > 0 ? 'bg-orange-500/20 text-orange-500 animate-pulse' : 'bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
            <Flame className="w-4 h-4 fill-current" />
         </div>
         <div className="flex flex-col leading-none">
            <span className={`text-sm font-bold ${profile.currentStreak > 0 ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{profile.currentStreak}</span>
            <span className="text-[8px] uppercase font-bold text-gray-500 dark:text-gray-400">Dias Seg.</span>
         </div>
      </div>
    </div>
  );
};