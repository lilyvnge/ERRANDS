const express = require('express');
const {
  sendNotification,
  broadcastNotification,
  getNotifications,
  markAsRead
} = require('../controllers/notificationController');
const auth = require('../middleware/auth');
const { adminActivityMiddleware } = require('../middleware/adminActivityLogger');

const router = express.Router();

// All notification routes require auth
router.use(auth);

// Admin-only actions
router.post('/send', (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
}, adminActivityMiddleware('notification_broadcast', 'notification'), broadcastNotification);

router.post('/broadcast', (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
}, adminActivityMiddleware('notification_broadcast', 'notification'), broadcastNotification);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);

module.exports = router;
