import express from 'express';
import * as areasController from '../controllers/areasController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', areasController.getAllAreas);
router.get('/:id', areasController.getAreaById);
router.post('/', requireAdmin, areasController.createArea);
router.put('/:id', requireAdmin, areasController.updateArea);
router.delete('/:id', requireAdmin, areasController.deleteArea);

export default router;
