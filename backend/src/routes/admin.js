const express = require('express');
const {
  getPlatformOverview,
  getUsers,
  updateUserStatus,
  getTasks,
  updateTaskStatus,
  getPayments,
  getVerificationRequests,
  getPlatformAnalytics,
  getAdminActivities,
  bulkUpdateUsers,
  bulkUpdateTasks
} = require('../controllers/adminController');
const auth = require('../middleware/auth');
const { adminActivityMiddleware } = require('../middleware/adminActivityLogger');

const router = express.Router();

// All admin routes are protected and require admin role
router.use(auth);

// Admin role middleware
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
});

// Platform overview and analytics
router.get('/overview', getPlatformOverview);
router.get('/analytics', getPlatformAnalytics);

// User management with activity logging
router.get('/users', getUsers);
router.patch('/users/:userId/status', 
  adminActivityMiddleware('user_status_update', 'user', (req) => req.params.userId),
  updateUserStatus
);

// Task management with activity logging
router.get('/tasks', getTasks);
router.patch('/tasks/:taskId/status',
  adminActivityMiddleware('task_status_update', 'task', (req) => req.params.taskId),
  updateTaskStatus
);

// Payment management
router.get('/payments', getPayments);

// Verification management
router.get('/verifications', getVerificationRequests);

// Admin activity logs
router.get('/activities', getAdminActivities);

// Bulk operations
router.patch('/users/bulk',
    adminActivityMiddleware('user_bulk_update', 'user'),
  bulkUpdateUsers
);
router.patch('/tasks/bulk',
  adminActivityMiddleware('task_bulk_update', 'task'),
  bulkUpdateTasks
);

module.exports = router;