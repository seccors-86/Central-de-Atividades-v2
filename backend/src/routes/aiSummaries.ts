import express from 'express';
import * as aiSummariesController from '../controllers/aiSummariesController.js';

const router = express.Router();

router.get('/', aiSummariesController.getAllAISummaries);
router.post('/', aiSummariesController.createAISummary);

export default router;
