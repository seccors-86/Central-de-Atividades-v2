import express from 'express';
import { login, recover, logout } from '../controllers/authController.js';
import { verifyMfaLogin } from '../controllers/mfaController.js';

const router = express.Router();

router.post('/login', login);
router.post('/recover', recover);
router.post('/logout', logout);
router.post('/mfa/verify', verifyMfaLogin);

export default router;
