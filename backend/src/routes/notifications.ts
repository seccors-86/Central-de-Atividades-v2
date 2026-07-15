import express from 'express';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { clearNotifications, deleteNotification, getNotifications, markNotificationRead, markAllNotificationsRead, sendBroadcast } from '../controllers/notificationsController.js';

const router = express.Router();

router.get('/', getNotifications);
router.post('/broadcast', requireAdmin, sendBroadcast);
router.put('/read-all', markAllNotificationsRead);
router.delete('/clear', clearNotifications);
router.delete('/:id', deleteNotification);
router.put('/:id/read', markNotificationRead);

export default router;
