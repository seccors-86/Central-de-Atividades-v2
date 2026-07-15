import express from 'express';
import { getBuckets, createBucket, updateBucket, deleteBucket } from '../controllers/bucketsController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getBuckets);
router.post('/', requireAdmin, createBucket);
router.put('/:id', requireAdmin, updateBucket);
router.delete('/:id', requireAdmin, deleteBucket);

export default router;
