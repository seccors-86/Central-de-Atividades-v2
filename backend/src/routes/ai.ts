import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  createAITemplate,
  deleteAITemplate,
  generateAIReport,
  getAIConfiguration,
  getAIReportVariables,
  getAIStatus,
  getAITemplates,
  listAIModels,
  resetAITemplates,
  setAIConfiguration,
  updateAITemplate
} from '../controllers/aiController.js';
import { requireAdmin, requireManagerOrAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Limite de gerações por IA atingido. Tente novamente mais tarde.' }
});

const configurationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas consultas ao provedor de IA. Aguarde alguns minutos.' }
});

router.get('/status', requireManagerOrAdmin, getAIStatus);
router.get('/templates', requireManagerOrAdmin, getAITemplates);
router.get('/template-variables', requireManagerOrAdmin, getAIReportVariables);
router.post('/templates', requireAdmin, configurationLimiter, createAITemplate);
router.put('/templates/:id', requireAdmin, configurationLimiter, updateAITemplate);
router.delete('/templates/:id', requireAdmin, configurationLimiter, deleteAITemplate);
router.post('/templates/reset', requireAdmin, configurationLimiter, resetAITemplates);
router.get('/config', requireAdmin, getAIConfiguration);
router.post('/models', requireAdmin, configurationLimiter, listAIModels);
router.put('/config', requireAdmin, configurationLimiter, setAIConfiguration);
router.post('/reports', requireManagerOrAdmin, generationLimiter, generateAIReport);

router.post('/weekly-summary', requireManagerOrAdmin, (_req, res) => {
  res.status(410).json({ error: 'Use o novo gerador de relatórios em /api/ai/reports.' });
});

export default router;
