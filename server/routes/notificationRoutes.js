const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  getNotificationSummary,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', getMyNotifications);
router.get('/summary', getNotificationSummary);
router.put('/read-all', markAllNotificationsRead);
router.put('/:id/read', markNotificationRead);

module.exports = router;
