import express from 'express';
import * as tagsController from '../controllers/tagsController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', tagsController.getAllTags);
router.post('/', requireAdmin, tagsController.createTag);
router.put('/:id', requireAdmin, tagsController.updateTag);
router.delete('/:id', requireAdmin, tagsController.deleteTag);

export default router;
