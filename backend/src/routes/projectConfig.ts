import express from 'express';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import {
  getProjectConfig,
  createProjectCategory,
  updateProjectCategory,
  deleteProjectCategory,
  createProjectStatus,
  updateProjectStatus,
  deleteProjectStatus,
  createProjectKpi,
  updateProjectKpi,
  deleteProjectKpi
} from '../controllers/projectConfigController.js';

const router = express.Router();

router.get('/', getProjectConfig);
router.post('/categories', requireAdmin, createProjectCategory);
router.put('/categories/:id', requireAdmin, updateProjectCategory);
router.delete('/categories/:id', requireAdmin, deleteProjectCategory);
router.post('/statuses', requireAdmin, createProjectStatus);
router.put('/statuses/:id', requireAdmin, updateProjectStatus);
router.delete('/statuses/:id', requireAdmin, deleteProjectStatus);
router.post('/kpis', requireAdmin, createProjectKpi);
router.put('/kpis/:id', requireAdmin, updateProjectKpi);
router.delete('/kpis/:id', requireAdmin, deleteProjectKpi);

export default router;
