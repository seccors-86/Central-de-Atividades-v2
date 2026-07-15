import express from 'express';
import * as activityLogsController from '../controllers/activityLogsController.js';

const router = express.Router();

router.get('/', activityLogsController.getAllActivityLogs);
router.get('/:id', activityLogsController.getActivityLogById);
router.post('/', activityLogsController.createActivityLog);
router.put('/:id', activityLogsController.updateActivityLog);
router.delete('/:id', activityLogsController.deleteActivityLog);

export default router;
