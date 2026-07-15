import { Router } from 'express';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { beginMfaSetup, confirmMfaSetup, disableOwnMfa, getMfaConfig, resetUserMfa, setMfaRequired } from '../controllers/mfaController.js';

const router = Router();
router.get('/config', getMfaConfig);
router.put('/config', requireAdmin, setMfaRequired);
router.post('/setup', beginMfaSetup);
router.post('/confirm', confirmMfaSetup);
router.post('/disable', disableOwnMfa);
router.delete('/users/:id', requireAdmin, resetUserMfa);
export default router;
