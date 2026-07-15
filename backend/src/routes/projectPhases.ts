import express from 'express';
import { getPhases, createPhase, updatePhase, deletePhase } from '../controllers/projectPhasesController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getPhases);
router.post('/', requireAdmin, createPhase);
router.put('/:id', requireAdmin, updatePhase);
router.delete('/:id', requireAdmin, deletePhase);

export default router;
