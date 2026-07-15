import { Router } from 'express';
import {
  getSupportTickets, createSupportTicket, updateSupportTicket,
  deleteSupportTicket, getSupportStats,
} from '../controllers/supportController.js';

const router = Router();

router.get('/stats', getSupportStats);
router.get('/', getSupportTickets);
router.post('/', createSupportTicket);
router.put('/:id', updateSupportTicket);
router.delete('/:id', deleteSupportTicket);

export default router;
