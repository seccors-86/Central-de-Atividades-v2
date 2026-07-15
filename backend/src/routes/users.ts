import express from 'express';
import * as usersController from '../controllers/usersController.js';
import { requireManagerOrAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', usersController.getAllUsers);
router.get('/:id', usersController.getUserById);
router.post('/', requireManagerOrAdmin, usersController.createUser);
router.put('/:id', usersController.updateUser);
router.delete('/:id', requireManagerOrAdmin, usersController.deleteUser);

export default router;
