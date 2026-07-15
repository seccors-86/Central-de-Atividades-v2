import express from 'express';
import { getSuggestions, createSuggestion, updateSuggestionStatus, toggleVote, updateSuggestion, deleteSuggestion, getSuggestionVoters } from '../controllers/suggestionsController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getSuggestions);
router.post('/', createSuggestion);
router.put('/:id/status', requireAdmin, updateSuggestionStatus);
router.post('/:id/vote', toggleVote);
router.put('/:id', updateSuggestion);
router.delete('/:id', deleteSuggestion);
router.get('/:id/voters', getSuggestionVoters);

export default router;
