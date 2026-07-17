import express from 'express';
import { login, recover, resetRecoveredPassword, getRecoveryConfig, logout } from '../controllers/authController.js';
import { verifyMfaLogin } from '../controllers/mfaController.js';

const router = express.Router();

router.post('/login', login);
router.post('/recover', recover);
router.post('/recover/request', recover);
router.post('/recover/reset', resetRecoveredPassword);
router.get('/recover/config', getRecoveryConfig);
router.post('/logout', logout);
router.post('/mfa/verify', verifyMfaLogin);

export default router;
