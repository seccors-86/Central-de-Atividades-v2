import express from 'express';
import * as statusesController from '../controllers/statusesController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', statusesController.getAllStatuses);
router.post('/', requireAdmin, statusesController.createStatus);
router.put('/:id', requireAdmin, statusesController.updateStatus);
router.delete('/:id', requireAdmin, statusesController.deleteStatus);

export default router;
