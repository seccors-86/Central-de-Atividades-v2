import { get, post, API_BASE_URL } from './api';
import { authService } from './auth';
import { GamificationProfile, Badge, Campaign, UserBadge, ScoringRule } from '../types';

// Serviço de Gamificação desativado a pedido do usuário
export const gamificationService = {
  getProfile: async (userId: string): Promise<GamificationProfile> => {
    return {
      id: 'mock',
      user_id: userId,
      level: 1,
      current_xp: 0,
      next_level_xp: 100,
      streak_days: 0,
      last_streak_date: null,
      badges: []
    } as unknown as GamificationProfile;
  },

  getRanking: async (params: any = {}): Promise<any[]> => {
    return [];
  },

  getBadges: async (): Promise<Badge[]> => {
    return [];
  },

  createBadge: async (badgeData: any): Promise<Badge> => {
    return {} as Badge;
  },

  getCampaigns: async (): Promise<Campaign[]> => {
    return [];
  },

  createCampaign: async (campaignData: any): Promise<Campaign> => {
    return {} as Campaign;
  },

  getScoringRules: async (): Promise<ScoringRule[]> => {
    return [];
  },

  saveScoringRules: async (rules: ScoringRule[]): Promise<void> => {
    return Promise.resolve();
  },

  uploadBadgeImage: async (file: File): Promise<{ url: string }> => {
    return { url: '' };
  }
};