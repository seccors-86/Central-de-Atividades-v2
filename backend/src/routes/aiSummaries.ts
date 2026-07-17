import express from 'express';
import * as aiSummariesController from '../controllers/aiSummariesController.js';
import { requireManagerOrAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireManagerOrAdmin);
router.get('/', aiSummariesController.getAllAISummaries);
router.delete('/:id', aiSummariesController.deleteAISummary);

export default router;
