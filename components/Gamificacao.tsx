import React, { useEffect, useState } from 'react';
import { User, Badge, Campaign, GamificationProfile, UserCampaign, UserBadge, ScoringRule } from '../types';
import { gamificationService } from '../services/gamification';
import {
  Trophy, Flame, Award, Sparkles, Calendar, Users,
  Target, Plus, Settings, Filter, Clock, Lock, CheckCircle2, ChevronRight, X,
  Image as ImageIcon, Upload
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RichTextEditor } from './RichTextEditor';
import DOMPurify from 'dompurify';

interface GamificacaoProps {
  currentUser: User;
  users: User[];
  isManager: boolean;
}

export const Gamificacao: React.FC<GamificacaoProps> = ({ currentUser, users, isManager }) => {
  // Estados de Dados
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Estados de Filtros do Ranking
  const [rankPeriod, setRankPeriod] = useState<'all' | 'week' | 'month'>('all');
  const [rankArea, setRankArea] = useState<string>('all'); // 'all' ou o areaId do usuário
  const [rankSortBy, setRankSortBy] = useState<'xp' | 'streak'>('xp');

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'ranking' | 'badges' | 'campaigns'>('ranking');

  // Estados do Painel Administrativo
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'badge' | 'campaign' | 'rules'>('campaign');

  // Form de Nova Campanha
  const [newCampaign, setNewCampaign] = useState({
    id: '',
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    rewardXp: 500,
    targetMetric: 'tasks_done' as 'tasks_done' | 'board_streak' | 'support_closed',
    targetValue: 5,
    rewardBadgeId: '' as string | undefined
  });

  // Form de Novo Badge
  const [newBadge, setNewBadge] = useState({
    id: '',
    name: '',
    description: '',
    icon: '🏆',
    minXp: 1000,
    badgeType: 'level' as 'level' | 'streak',
    colorGradient: 'from-orange-500 to-amber-500',
    imageUrl: ''
  });

  const [badgeImageFile, setBadgeImageFile] = useState<File | null>(null);
  const [badgeImagePreview, setBadgeImagePreview] = useState<string>('');
  const [badgeSourceType, setBadgeSourceType] = useState<'emoji' | 'image'>('emoji');

  // Regras de pontuação do motor
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Carregar Dados Iniciais
  useEffect(() => {
    loadAllData();
  }, [currentUser.id]);

  // Recarregar Ranking sempre que os filtros mudarem
  useEffect(() => {
    loadRanking();
  }, [rankPeriod, rankArea, rankSortBy]);

  // Recarregar regras de pontuação quando a aba do admin for rules
  useEffect(() => {
    if (adminTab === 'rules' && isAdminModalOpen) {
      loadScoringRules();
    }
  }, [adminTab, isAdminModalOpen]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Buscar perfil do usuário logado
      const prof = await gamificationService.getProfile(currentUser.id);
      setProfile(prof);

      // 2. Buscar todas as insígnias
      const badgesList = await gamificationService.getBadges();
      setAllBadges(badgesList);

      // 3. Buscar todas as campanhas
      const campList = await gamificationService.getCampaigns();
      setCampaigns(campList);

      // 4. Buscar ranking inicial
      await loadRanking();
    } catch (error) {
      console.error('Erro ao carregar dados da gamificação:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRanking = async () => {
    try {
      const areaFilter = rankArea === 'my' ? currentUser.areaId : undefined;
      const rankList = await gamificationService.getRanking({
        period: rankPeriod,
        areaId: areaFilter,
        sortBy: rankSortBy
      });
      setRanking(rankList);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    }
  };

  const loadScoringRules = async () => {
    setLoadingRules(true);
    setFormError('');
    try {
      const rulesList = await gamificationService.getScoringRules();
      setScoringRules(rulesList);
    } catch (error) {
      console.error('Erro ao carregar regras de pontuação:', error);
      setFormError('Erro ao carregar regras de pontuação.');
    } finally {
      setLoadingRules(false);
    }
  };

  // Submissão de Nova Campanha
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newCampaign.id || !newCampaign.title || !newCampaign.description) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      await gamificationService.createCampaign({
        ...newCampaign,
        rewardXp: Number(newCampaign.rewardXp),
        targetValue: Number(newCampaign.targetValue),
        rewardBadgeId: newCampaign.rewardBadgeId || undefined
      });
      setFormSuccess('Campanha criada com sucesso!');

      // Resetar form
      setNewCampaign({
        id: '',
        title: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rewardXp: 500,
        targetMetric: 'tasks_done',
        targetValue: 5,
        rewardBadgeId: ''
      });

      // Recarregar campanhas
      const campList = await gamificationService.getCampaigns();
      setCampaigns(campList);

      // Recarregar perfil para atualizar desafios ativos
      const prof = await gamificationService.getProfile(currentUser.id);
      setProfile(prof);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar campanha.');
    }
  };

  // Submissão de Novo Badge
  const handleCreateBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const iconVal = badgeSourceType === 'emoji' ? newBadge.icon : '🖼️';

    if (!newBadge.id || !newBadge.name || !newBadge.description || (badgeSourceType === 'emoji' && !iconVal)) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (badgeSourceType === 'image' && !badgeImageFile) {
      setFormError('Selecione uma imagem para o badge.');
      return;
    }

    try {
      let finalImageUrl = undefined;

      if (badgeSourceType === 'image' && badgeImageFile) {
        const uploadRes = await gamificationService.uploadBadgeImage(badgeImageFile);
        finalImageUrl = uploadRes.url;
      }

      await gamificationService.createBadge({
        ...newBadge,
        icon: iconVal,
        minXp: Number(newBadge.minXp),
        imageUrl: finalImageUrl
      });
      setFormSuccess('Insígnia criada com sucesso!');

      // Resetar form
      setNewBadge({
        id: '',
        name: '',
        description: '',
        icon: '🏆',
        minXp: 1000,
        badgeType: 'level',
        colorGradient: 'from-orange-500 to-amber-500',
        imageUrl: ''
      });
      setBadgeImageFile(null);
      setBadgeImagePreview('');

      // Recarregar badges
      const badgesList = await gamificationService.getBadges();
      setAllBadges(badgesList);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar insígnia.');
    }
  };

  // Submissão de Ajuste das Regras de Pontuação
  const handleSaveScoringRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      await gamificationService.saveScoringRules(scoringRules);
      setFormSuccess('Regras do motor de pontuação atualizadas com sucesso!');
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar configurações de pontuação.');
    }
  };

  // Encontrar o badge atual do usuário logado (baseado no XP do perfil)
  const getCurrentBadgeInfo = () => {
    if (!profile || allBadges.length === 0) return null;
    let current = allBadges[0];
    let next: Badge | null = null;

    // Filtra badges de nível ordenados por XP
    const levelBadges = allBadges
      .filter(b => b.badgeType === 'level' || !b.badgeType)
      .sort((a, b) => a.minXp - b.minXp);

    for (let i = 0; i < levelBadges.length; i++) {
      if (profile.xpTotal >= levelBadges[i].minXp) {
        current = levelBadges[i];
        next = levelBadges[i + 1] || null;
      }
    }

    let xpProgress = 100;
    if (next) {
      const range = next.minXp - current.minXp;
      const currentInLevel = profile.xpTotal - current.minXp;
      xpProgress = Math.min(100, Math.max(0, (currentInLevel / range) * 100));
    }

    return { current, next, xpProgress };
  };

  const userBadgeState = getCurrentBadgeInfo();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-12 h-12 border-4 border-[#374A67] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium">Carregando a gamificação...</p>
      </div>
    );
  }

  // Pegar top 3 líderes para o Pódio
  const topThree = ranking.slice(0, 3);
  // Reordenar para o pódio (2º, 1º, 3º)
  const podiumOrder = [];
  if (topThree[1]) podiumOrder.push({ ...topThree[1], place: 2 });
  if (topThree[0]) podiumOrder.push({ ...topThree[0], place: 1 });
  if (topThree[2]) podiumOrder.push({ ...topThree[2], place: 3 });

  // Pessoas na lista abaixo do pódio
  const restOfRanking = ranking.slice(3);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header do Perfil Gamificado do Usuário */}
      {profile && (
        <div className="relative overflow-hidden rounded-3xl bg-gray-900 border border-gray-800 p-6 md:p-8 shadow-xl text-white">
          {/* Luzes de fundo */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              {/* Avatar do usuário com borda animada baseada no badge atual */}
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${userBadgeState?.current.colorGradient || 'from-orange-500 to-amber-500'} p-[3px] shadow-lg relative`}>
                <div className="w-full h-full rounded-[13px] bg-gray-950 flex items-center justify-center overflow-hidden">
                  {profile.photo ? (
                    <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-gray-500">{profile.name.charAt(0)}</span>
                  )}
                </div>
                {/* Emoji do badge no cantinho */}
                <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-gray-950 border border-gray-800 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                  {userBadgeState?.current.imageUrl ? (
                    <img src={userBadgeState.current.imageUrl} alt={userBadgeState.current.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">{userBadgeState?.current.icon}</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-2xl font-black">{profile.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold uppercase tracking-wider">
                    Nível {profile.level}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-0.5">{profile.areaName || 'Sem área vinculada'}</p>
                <div className="mt-2 flex items-center justify-center sm:justify-start gap-4">
                  <div className="flex items-center gap-1.5 text-orange-400">
                    <Flame className="w-5 h-5 fill-current" />
                    <span className="text-sm font-black">{profile.currentStreak} dias seguidos</span>
                  </div>
                  <div className="text-gray-500 text-xs font-medium">
                    (Máximo: {profile.maxStreak} dias)
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de Progresso de XP */}
            {userBadgeState && (
              <div className="w-full md:max-w-md bg-gray-950/50 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between text-sm mb-2 font-bold">
                  <span className="text-gray-400">XP Acumulado</span>
                  <span className="text-white">{profile.xpTotal} XP</span>
                </div>

                {/* Barra */}
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(55,74,103,0.4)]"
                    style={{ width: `${userBadgeState.xpProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{userBadgeState.current.name}</span>
                  {userBadgeState.next ? (
                    <span>Faltam {userBadgeState.next.minXp - profile.xpTotal} XP para o {userBadgeState.next.name}</span>
                  ) : (
                    <span className="text-orange-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Nível Máximo Atingido!
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Menu de Abas da Liga */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('ranking')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'ranking'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4 text-orange-500" />
            Ranking Geral
          </button>
          <button
            onClick={() => setActiveSubTab('badges')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'badges'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Award className="w-4 h-4 text-purple-500" />
            Álbum de Insígnias
          </button>
          <button
            onClick={() => setActiveSubTab('campaigns')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'campaigns'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-4 h-4 text-emerald-500" />
            Desafios Ativos
          </button>
        </div>

        {/* Botão de Configuração de Gamificação (Apenas Admin/Gestor) */}
        {isManager && (
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-sm w-full sm:w-auto justify-center"
          >
            <Settings className="w-4 h-4 text-gray-500" />
            Painel Admin Gamificação
          </button>
        )}
      </div>

      {/* 3. Renderização de Sub-Abas */}

      {/* --- SUB-ABA: RANKING --- */}
      {activeSubTab === 'ranking' && (
        <div className="space-y-8">
          {/* Filtros do Ranking */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-4">
              {/* Filtro de Período */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Período:
                </span>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setRankPeriod('all')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      rankPeriod === 'all' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    Tudo
                  </button>
                  <button
                    onClick={() => setRankPeriod('week')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      rankPeriod === 'week' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    Semanal
                  </button>
                  <button
                    onClick={() => setRankPeriod('month')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      rankPeriod === 'month' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    Mensal
                  </button>
                </div>
              </div>

              {/* Filtro de Área */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Escopo:
                </span>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setRankArea('all')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      rankArea === 'all' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    Geral
                  </button>
                  <button
                    onClick={() => setRankArea('my')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      rankArea === 'my' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    Minha Área
                  </button>
                </div>
              </div>
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Ordenar por:
              </span>
              <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setRankSortBy('xp')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    rankSortBy === 'xp' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  XP
                </button>
                <button
                  onClick={() => setRankSortBy('streak')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    rankSortBy === 'streak' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  Dias Seguidos
                </button>
              </div>
            </div>
          </div>

          {/* Renderização do Pódio 3D */}
          {podiumOrder.length > 0 ? (
            <div className="flex flex-col items-center justify-center pt-8 pb-4">
              <div className="flex items-end justify-center gap-4 sm:gap-10 w-full max-w-2xl px-4 select-none">

                {podiumOrder.map((user) => {
                  const isFirst = user.place === 1;
                  const isSecond = user.place === 2;
                  const isThird = user.place === 3;

                  // Configurações visuais das colunas do pódio
                  const columnStyles = isFirst
                    ? 'h-36 w-28 sm:w-36 bg-gradient-to-t from-amber-600/30 to-amber-500/10 border-t-4 border-amber-500 shadow-[0_-5px_15px_rgba(245,158,11,0.15)]'
                    : isSecond
                      ? 'h-28 w-24 sm:w-32 bg-gradient-to-t from-slate-500/30 to-slate-400/10 border-t-4 border-slate-400'
                      : 'h-20 w-24 sm:w-32 bg-gradient-to-t from-amber-800/30 to-amber-700/10 border-t-4 border-amber-700';

                  const badgeIcon = isFirst ? '👑' : isSecond ? '🥈' : '🥉';
                  const textColor = isFirst ? 'text-amber-500' : isSecond ? 'text-slate-400' : 'text-amber-700';

                  return (
                    <div key={user.userId} className="flex flex-col items-center group">
                      {/* Avatar e Informações acima do Pódio */}
                      <div className="relative mb-3 flex flex-col items-center text-center">
                        {/* Coroa/Medalha */}
                        <div className="absolute -top-7 text-2xl animate-bounce" style={{ animationDelay: `${user.place * 0.3}s` }}>
                          {badgeIcon}
                        </div>

                        {/* Imagem do Usuário */}
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] ${isFirst ? 'bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-gray-700'} overflow-hidden relative transition-transform duration-300 group-hover:scale-105`}>
                          <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center overflow-hidden">
                            {user.photo ? (
                              <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl font-bold text-gray-500">{user.name.charAt(0)}</span>
                            )}
                          </div>
                        </div>

                        {/* Nome do Usuário */}
                        <span className="text-xs sm:text-sm font-extrabold text-gray-800 dark:text-gray-200 mt-2 line-clamp-1 max-w-[100px] sm:max-w-[140px]">
                          {user.name.split(' ')[0]}
                        </span>

                        {/* Pontuação */}
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 mt-0.5">
                          {rankSortBy === 'xp' ? `${user.xp} XP` : `${user.streak} dias`}
                        </span>
                        {user.areaName && (
                          <span className="text-[8px] uppercase tracking-wider text-gray-500 mt-0.5">
                            {user.areaName}
                          </span>
                        )}
                      </div>

                      {/* Coluna 3D do Pódio */}
                      <div className={`rounded-t-2xl flex flex-col items-center justify-start pt-3 ${columnStyles}`}>
                        <span className={`text-3xl font-black ${textColor}`}>{user.place}º</span>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">Lugar</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              Nenhum dado de pontuação encontrado para o período selecionado.
            </div>
          )}

          {/* Tabela de Classificação dos Demais */}
          {restOfRanking.length > 0 && (
            <div className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/60 shadow-md">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-[10px] sm:text-xs uppercase font-extrabold text-gray-400 tracking-wider">
                    <th className="py-4 px-6 text-center w-16">Posição</th>
                    <th className="py-4 px-6">Colaborador</th>
                    <th className="py-4 px-6">Área</th>
                    <th className="py-4 px-6 text-center">Nível</th>
                    <th className="py-4 px-6 text-right w-36">Pontuação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {restOfRanking.map((user) => (
                    <tr
                      key={user.userId}
                      className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors ${
                        user.userId === currentUser.id ? 'bg-orange-500/[0.04] dark:bg-orange-500/[0.02]' : ''
                      }`}
                    >
                      <td className="py-3 px-6 text-center font-bold text-gray-500 dark:text-gray-400 text-sm">
                        {user.position}º
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border ${
                            user.userId === currentUser.id ? 'border-orange-500/40' : 'border-gray-200 dark:border-700'
                          }`}>
                            {user.photo ? (
                              <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-gray-500">{user.name.charAt(0)}</span>
                            )}
                          </div>
                          <span className={`text-sm font-bold ${
                            user.userId === currentUser.id ? 'text-orange-500 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {user.name}
                            {user.userId === currentUser.id && (
                              <span className="text-[9px] font-bold uppercase ml-2 px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">Você</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {user.areaName || '-'}
                      </td>
                      <td className="py-3 px-6 text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                        {user.level}
                      </td>
                      <td className="py-3 px-6 text-right font-black text-sm text-gray-900 dark:text-white">
                        {rankSortBy === 'xp' ? (
                          <span>{user.xp} <span className="text-[10px] font-bold text-gray-400">XP</span></span>
                        ) : (
                          <span className="text-orange-500">{user.streak} <span className="text-[10px] font-bold text-gray-400">Dias</span></span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- SUB-ABA: ALBUM DE BADGES --- */}
      {activeSubTab === 'badges' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-black text-gray-800 dark:text-white">Álbum de Insígnias</h3>
            <p className="text-gray-400 text-sm">Colecione insígnias acumulando XP ou mantendo sequências consistentes de trabalho.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {allBadges.map((badge) => {
              // Verificar se o usuário atual conquistou este badge
              const unlockedInfo = profile?.badges.find(ub => ub.id === badge.id);
              const isUnlocked = !!unlockedInfo;

              return (
                <div
                  key={badge.id}
                  className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-5 text-center flex flex-col items-center ${
                    isUnlocked
                      ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:shadow-md hover:scale-[1.02]'
                      : 'bg-gray-50/50 dark:bg-gray-950/20 border-gray-100 dark:border-gray-900/60 opacity-60'
                  }`}
                >
                  {/* Badge visual */}
                  <div className={`w-20 h-20 rounded-2xl ${
                    isUnlocked
                      ? `bg-gradient-to-tr ${badge.colorGradient || 'from-orange-500 to-amber-500'} p-[2px]`
                      : 'bg-gray-200 dark:bg-gray-800 p-[1px]'
                  } shadow-md mb-4`}>
                    <div className="w-full h-full bg-white dark:bg-gray-950 rounded-[14px] flex items-center justify-center overflow-hidden relative">
                      {isUnlocked ? (
                        badge.imageUrl ? (
                          <img src={badge.imageUrl} alt={badge.name} className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                          <span className="text-4xl filter drop-shadow-sm select-none">{badge.icon}</span>
                        )
                      ) : (
                        <div className="text-gray-400 dark:text-gray-600 flex flex-col items-center">
                          <Lock className="w-6 h-6 mb-1" />
                          <span className="text-[8px] uppercase font-bold tracking-widest">
                            {badge.badgeType === 'streak' ? `${badge.minXp}d` : `${badge.minXp} XP`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <h4 className="font-extrabold text-sm text-gray-800 dark:text-white line-clamp-1">{badge.name}</h4>
                  <p className="text-gray-400 text-xs mt-1.5 line-clamp-2 h-8 leading-snug">{badge.description}</p>

                  {isUnlocked && unlockedInfo ? (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 w-full">
                      <span className="text-[10px] font-bold text-emerald-500 block uppercase tracking-wider flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-current" /> Conquistada
                      </span>
                      <span className="text-[9px] text-gray-500 mt-1 block">
                        {unlockedInfo.unlockedAt ? format(parseISO(unlockedInfo.unlockedAt), 'dd/MM/yyyy', { locale: ptBR }) : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-4 pt-3 w-full">
                      <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
                        Requisito Mínimo
                      </span>
                      <span className="text-[10px] font-bold text-orange-500 mt-0.5 block">
                        {badge.badgeType === 'streak' ? `${badge.minXp} Dias Seguidos` : `${badge.minXp} XP Acumulado`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- SUB-ABA: CAMPANHAS --- */}
      {activeSubTab === 'campaigns' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-black text-gray-800 dark:text-white">Desafios e Campanhas Vigentes</h3>
            <p className="text-gray-400 text-sm">Cumpra as metas do time e ganhe bônus expressivos de XP para subir de ranking.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.length > 0 ? (
              campaigns.map((camp) => {
                // Encontrar o progresso do usuário para esta campanha
                const userProgressInfo = profile?.campaigns.find(uc => uc.id === camp.id);
                const progress = userProgressInfo ? userProgressInfo.progress : 0;
                const completed = userProgressInfo ? userProgressInfo.completed : false;
                const pct = Math.min(100, Math.max(0, (progress / camp.targetValue) * 100));

                let metricLabel = '';
                if (camp.targetMetric === 'tasks_done') metricLabel = 'Tarefas concluídas';
                else if (camp.targetMetric === 'board_streak') metricLabel = 'Dias seguidos no Diário';
                else if (camp.targetMetric === 'support_closed') metricLabel = 'Chamados resolvidos';

                const badgeReward = allBadges.find(b => b.id === camp.rewardBadgeId);

                return (
                  <div
                    key={camp.id}
                    className={`relative overflow-hidden rounded-2xl border p-6 flex flex-col justify-between ${
                      completed
                        ? 'bg-emerald-500/[0.02] border-emerald-500/20 dark:border-emerald-500/10'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Badge XP e Status */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider">
                            +{camp.rewardXp} XP
                          </span>
                          {badgeReward && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider" title={`Insígnia: ${badgeReward.name}`}>
                              {badgeReward.imageUrl ? (
                                <img src={badgeReward.imageUrl} alt={badgeReward.name} className="w-3.5 h-3.5 object-cover rounded-full" />
                              ) : (
                                <span className="text-xs">{badgeReward.icon}</span>
                              )}
                              <span>{badgeReward.name}</span>
                            </span>
                          )}
                        </div>

                        {completed ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                            Concluído
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            Até {format(parseISO(camp.endDate), 'dd/MM', { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-black text-gray-800 dark:text-white mb-2">{camp.title}</h4>
                      <div className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(camp.description || '') }} />
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="space-y-2 mt-auto">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-gray-400">{metricLabel}</span>
                        <span className="text-gray-800 dark:text-white">
                          {progress} / {camp.targetValue}
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ease-out rounded-full ${
                            completed ? 'bg-emerald-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-10 text-gray-500">
                Nenhum desafio ativo no momento. Fique atento para novas campanhas!
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL DO PAINEL ADMINISTRATIVO (APENAS MANAGER/ADMIN) */}
      {isManager && isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Fechar */}
            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Titulo */}
            <div className="mb-6">
              <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500" />
                Painel Administrativo de Gamificação
              </h3>
              <p className="text-gray-400 text-xs mt-1">Crie insígnias ou campanhas sazonais para motivar a equipe.</p>
            </div>

            {/* Alternar Abas do Form */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 pb-2 mb-6 gap-4">
              <button
                onClick={() => { setAdminTab('campaign'); setFormError(''); setFormSuccess(''); }}
                className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                  adminTab === 'campaign'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                Nova Campanha
              </button>
              <button
                onClick={() => { setAdminTab('badge'); setFormError(''); setFormSuccess(''); }}
                className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                  adminTab === 'badge'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                Nova Insígnia
              </button>
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => { setAdminTab('rules'); setFormError(''); setFormSuccess(''); }}
                  className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                    adminTab === 'rules'
                      ? 'border-orange-500 text-orange-500'
                      : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-white'
                  }`}
                >
                  Regras do Motor
                </button>
              )}
            </div>

            {/* Mensagem de erro/sucesso */}
            {formError && (
              <div className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold mb-4">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-bold mb-4">
                {formSuccess}
              </div>
            )}

            {/* FORMULÁRIO DE NOVA CAMPANHA */}
            {adminTab === 'campaign' && (
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ID Único *</label>
                    <input
                      type="text"
                      placeholder="ex: tarefas_maio"
                      value={newCampaign.id}
                      onChange={(e) => setNewCampaign({...newCampaign, id: e.target.value})}
                      className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título da Campanha *</label>
                    <input
                      type="text"
                      placeholder="ex: Foco nas Entregas"
                      value={newCampaign.title}
                      onChange={(e) => setNewCampaign({...newCampaign, title: e.target.value})}
                      className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição detalhada *</label>
                  <div className="z-0 relative text-gray-900 dark:text-gray-100">
                    <RichTextEditor
                      placeholder="Descreva o que o colaborador precisa atingir..."
                      value={newCampaign.description}
                      onChange={(val) => setNewCampaign({...newCampaign, description: val})}
                      className="bg-gray-50 dark:bg-gray-800 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Início *</label>
                    <input
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) => setNewCampaign({...newCampaign, startDate: e.target.value})}
                      className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Fim *</label>
                    <input
                      type="date"
                      value={newCampaign.endDate}
                      onChange={(e) => setNewCampaign({...newCampaign, endDate: e.target.value})}
                      className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Métrica Alvo *</label>
                    <select
                      value={newCampaign.targetMetric}
                      onChange={(e) => setNewCampaign({...newCampaign, targetMetric: e.target.value as any})}
                      className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                    >
                      <option value="tasks_done">Tarefas Concluídas</option>
                      <option value="board_streak">Streak de Diários (Dias Seguidos)</option>
                      <option value="support_closed">Chamados Resolvidos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Meta (Qtde) *</label>
                    <input
                      type="number"
                      min={1}
                      value={newCampaign.targetValue}
                      onChange={(e) => setNewCampaign({...newCampaign, targetValue: Number(e.target.value)})}
                      className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Recompensa em XP *</label>
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={newCampaign.rewardXp}
                      onChange={(e) => setNewCampaign({...newCampaign, rewardXp: Number(e.target.value)})}
                      className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Insígnia Recompensa (Opcional)</label>
                    <select
                      value={newCampaign.rewardBadgeId || ''}
                      onChange={(e) => setNewCampaign({...newCampaign, rewardBadgeId: e.target.value || undefined})}
                      className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                    >
                      <option value="">Nenhuma insígnia</option>
                      {allBadges.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.icon} {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all mt-4"
                >
                  Publicar Campanha
                </button>
              </form>
            )}

            {/* FORMULÁRIO DE NOVA INSÍGNIA */}
            {adminTab === 'badge' && (
              <form onSubmit={handleCreateBadge} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ID Único *</label>
                    <input
                      type="text"
                      placeholder="ex: streak_20"
                      value={newBadge.id}
                      onChange={(e) => setNewBadge({...newBadge, id: e.target.value})}
                      className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome da Insígnia *</label>
                    <input
                      type="text"
                      placeholder="ex: Dev Consistente"
                      value={newBadge.name}
                      onChange={(e) => setNewBadge({...newBadge, name: e.target.value})}
                      className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Origem do Ícone *</label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="badgeSourceType"
                        checked={badgeSourceType === 'emoji'}
                        onChange={() => setBadgeSourceType('emoji')}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      Emoji Clássico
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="badgeSourceType"
                        checked={badgeSourceType === 'image'}
                        onChange={() => setBadgeSourceType('image')}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      Carregar Imagem 1:1
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {badgeSourceType === 'emoji' ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Emoji / Ícone *</label>
                      <input
                        type="text"
                        placeholder="ex: 🚀"
                        value={newBadge.icon}
                        onChange={(e) => setNewBadge({...newBadge, icon: e.target.value})}
                        className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none text-center text-lg"
                        required={badgeSourceType === 'emoji'}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Imagem 1:1 *</label>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setBadgeImageFile(file);
                                setBadgeImagePreview(URL.createObjectURL(file));
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        {badgeImagePreview && (
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <img src={badgeImagePreview} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo da Regra *</label>
                    <select
                      value={newBadge.badgeType}
                      onChange={(e) => setNewBadge({...newBadge, badgeType: e.target.value as any})}
                      className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                    >
                      <option value="level">Nível (Baseado em XP Total)</option>
                      <option value="streak">Streak (Baseado em dias seguidos)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor Mínimo (XP ou Dias) *</label>
                  <input
                    type="number"
                    min={0}
                    value={newBadge.minXp}
                    onChange={(e) => setNewBadge({...newBadge, minXp: Number(e.target.value)})}
                    className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição do Badge *</label>
                  <input
                    type="text"
                    placeholder="ex: Complete 20 dias seguidos de Diário."
                    value={newBadge.description}
                    onChange={(e) => setNewBadge({...newBadge, description: e.target.value})}
                    className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cores do Gradiente (Tailwind CSS) *</label>
                  <select
                    value={newBadge.colorGradient}
                    onChange={(e) => setNewBadge({...newBadge, colorGradient: e.target.value})}
                    className="w-full p-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="from-orange-500 to-amber-500">Laranja & Dourado</option>
                    <option value="from-green-400 to-emerald-600">Verde Folha (Iniciante)</option>
                    <option value="from-blue-400 to-indigo-600">Azul Royal (Foco)</option>
                    <option value="from-purple-400 to-fuchsia-600">Fúcsia Espacial (Produtividade)</option>
                    <option value="from-teal-400 to-cyan-600">Ciano Limpo (Mestre)</option>
                    <option value="from-rose-500 to-red-600">Vermelho Fogo (Lenda)</option>
                    <option value="from-yellow-400 via-orange-500 to-red-600">Arco-íris de Fogo</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition-all mt-4"
                >
                  Salvar Insígnia
                </button>
              </form>
            )}

            {/* FORMULÁRIO DE AJUSTE DO MOTOR DE PONTUAÇÃO */}
            {adminTab === 'rules' && (
              <form onSubmit={handleSaveScoringRules} className="space-y-4">
                {loadingRules ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <div className="w-8 h-8 border-3 border-[#374A67] border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs font-medium">Carregando regras...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {scoringRules.map((rule, idx) => (
                        <div key={rule.id} className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between gap-4">
                          <div>
                            <h4 className="text-xs font-extrabold text-gray-700 dark:text-gray-300">{rule.name}</h4>
                            <span className="text-[10px] text-gray-400 font-bold font-mono uppercase">{rule.id}</span>
                          </div>
                          <div className="flex items-center gap-2 w-28">
                            <input
                              type="number"
                              min={0}
                              value={rule.xpValue}
                              onChange={(e) => {
                                const newRules = [...scoringRules];
                                newRules[idx] = { ...rule, xpValue: Number(e.target.value) };
                                setScoringRules(newRules);
                              }}
                              className="w-full p-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold text-center focus:border-orange-500 focus:outline-none"
                              required
                            />
                            <span className="text-xs font-black text-gray-400">XP</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition-all mt-4"
                    >
                      Salvar Regras de Pontuação
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
