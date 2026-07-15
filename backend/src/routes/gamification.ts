import express from 'express';
import * as gamificationController from '../controllers/gamificationController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/profile/:userId', gamificationController.getGamificationProfile);
router.get('/ranking', gamificationController.getRanking);
router.get('/badges', gamificationController.getBadges);
router.post('/badges', requireAdmin, gamificationController.createBadge);
router.get('/campaigns', gamificationController.getCampaigns);
router.post('/campaigns', requireAdmin, gamificationController.createCampaign);

// Rotas para gerenciamento das regras do motor de pontuação (scoring rules)
router.get('/scoring-rules', gamificationController.getScoringRules);
router.post('/scoring-rules', requireAdmin, gamificationController.saveScoringRules);

export default router;
