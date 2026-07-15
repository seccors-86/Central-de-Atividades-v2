import express from 'express';
import { getComments, getProjectAllComments, createComment, deleteComment, updateComment } from '../controllers/commentsController.js';

const router = express.Router();

router.get('/project/:id/all', getProjectAllComments);
router.get('/:entity_type/:entity_id', getComments);
router.post('/', createComment);
router.delete('/:id', deleteComment);
router.put('/:id', updateComment);

export default router;
