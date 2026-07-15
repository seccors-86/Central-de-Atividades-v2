import React, { useEffect, useState } from 'react';
import { Award, Star, Trophy, Sparkles } from 'lucide-react';

interface CelebrationBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  colorGradient: string;
  imageUrl?: string;
}

interface GamificationCelebrationProps {
  levelUp: boolean;
  newLevel?: number;
  newBadges: CelebrationBadge[];
  onClose: () => void;
}

export const GamificationCelebration: React.FC<GamificationCelebrationProps> = ({
  levelUp,
  newLevel,
  newBadges,
  onClose
}) => {
  const [visible, setVisible] = useState(false);
  const [confettis, setConfettis] = useState<Array<{ id: number; left: number; delay: number; color: string; duration: number; size: number }>>([]);

  useEffect(() => {
    setVisible(true);

    // Gerar confetes virtuais
    const colors = ['#374A67', '#0E1116', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#10b981'];
    const list = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // 0% a 100% da largura da tela
      delay: Math.random() * 3, // atraso de até 3s
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 3 + Math.random() * 4, // 3s a 7s de queda
      size: 6 + Math.random() * 12 // tamanho de 6px a 18px
    }));
    setConfettis(list);

    // Auto close após 10 segundos para não prender a tela infinitamente
    const timer = setTimeout(() => {
      handleClose();
    }, 12000);

    return () => clearTimeout(timer);
  }, [levelUp, newBadges]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 400); // aguarda animação de fade-out acabar
  };

  if (!levelUp && (!newBadges || newBadges.length === 0)) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>

      {/* CSS Animado para Confetes e Efeitos de Brilho */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes popIn {
          0% {
            transform: scale(0.85);
            opacity: 0;
          }
          70% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes rotateGlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-confetti {
          animation: confettiFall linear infinite;
        }
        .animate-popin {
          animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .glow-spin {
          animation: rotateGlow 20s linear infinite;
        }
      `}} />

      {/* Confetes em Queda */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettis.map(c => (
          <div
            key={c.id}
            className="absolute top-0 animate-confetti rounded-sm"
            style={{
              left: `${c.left}%`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              backgroundColor: c.color,
              width: `${c.size}px`,
              height: `${c.size * 0.7}px`,
              opacity: 0.8,
              transform: `translateY(-20px)`
            }}
          />
        ))}
      </div>

      {/* Container Principal */}
      <div className="relative w-full max-w-lg p-8 mx-4 text-center rounded-3xl bg-gray-900 border border-gray-800 shadow-[0_0_50px_rgba(55,74,103,0.15)] animate-popin text-white overflow-hidden">

        {/* Glow Effect no fundo do Modal */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-[80px]" />

        {/* Círculo Rotativo de Brilho */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-orange-500/5 via-transparent to-emerald-500/5 rounded-full glow-spin pointer-events-none" />

        {/* Conteúdo de Level Up */}
        {levelUp && (
          <div className="relative z-10 mb-6">
            <div className="inline-flex p-5 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 shadow-[0_0_30px_rgba(55,74,103,0.4)] animate-bounce mb-4 text-gray-950">
              <Trophy className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 bg-clip-text text-transparent">
              NOVO NÍVEL ALCANÇADO!
            </h1>
            <p className="text-gray-400 text-sm mt-1">Você está evoluindo na liga de engajamento</p>

            <div className="mt-6 flex items-center justify-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nível Anterior</span>
                <span className="text-2xl font-bold text-gray-400 mt-1">{newLevel ? newLevel - 1 : '-'}</span>
              </div>
              <div className="w-12 h-0.5 bg-gradient-to-r from-gray-700 to-gray-700" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Novo Nível</span>
                <span className="text-5xl font-black text-white mt-1 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse">
                  {newLevel}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo de Novas Insígnias */}
        {newBadges && newBadges.length > 0 && (
          <div className="relative z-10">
            {levelUp && <div className="h-px bg-gray-800 my-6" />}

            <div className="mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Conquista Desbloqueada
              </span>
            </div>

            {newBadges.map((badge, idx) => (
              <div key={badge.id} className={`${idx > 0 ? 'mt-6 pt-6 border-t border-gray-800' : ''} flex flex-col items-center`}>

                {/* Badge Visual */}
                <div className={`w-28 h-28 rounded-2xl bg-gradient-to-tr ${badge.colorGradient || 'from-gray-700 to-gray-900'} p-[2px] shadow-xl shadow-black/40 transition-transform duration-300 hover:scale-105 mb-4`}>
                  <div className="w-full h-full bg-gray-900 rounded-[14px] flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Glow radial */}
                    <div className="absolute inset-0 bg-white/[0.03] rounded-full blur-xl" />
                    {badge.imageUrl ? (
                      <img src={badge.imageUrl} alt={badge.name} className="w-16 h-16 object-cover rounded-lg" />
                    ) : (
                      <span className="text-5xl mb-1 filter drop-shadow-md select-none">{badge.icon}</span>
                    )}
                  </div>
                </div>

                <h2 className="text-2xl font-black tracking-tight text-white">{badge.name}</h2>
                <p className="text-gray-400 text-sm max-w-sm mt-2">{badge.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Botão de Fechar */}
        <button
          onClick={handleClose}
          className="relative z-10 mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-gray-950 font-bold hover:shadow-[0_0_25px_rgba(55,74,103,0.3)] transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          Excelente!
        </button>
      </div>
    </div>
  );
};
