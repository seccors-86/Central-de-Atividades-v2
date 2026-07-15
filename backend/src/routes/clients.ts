import { Router } from 'express';
import * as clientsController from '../controllers/clientsController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', clientsController.getAllClients);
router.get('/:id', clientsController.getClientById);
router.post('/', requireAdmin, clientsController.createClient);
router.put('/:id', requireAdmin, clientsController.updateClient);
router.delete('/:id', requireAdmin, clientsController.deleteClient);

export default router;
