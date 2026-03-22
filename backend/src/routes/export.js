const express = require('express');
const {
    exportUsers,
    exportTasks,
    exportPayments,
    exportActivities
} = require('../controllers/exportController');
const auth = require('../middleware/auth');

// All export routes require admin role
const router = express.Router();

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
});

router.get('/users', exportUsers);
router.get('/tasks', exportTasks);
router.get('/payments', exportPayments);
router.get('/activities', exportActivities);

module.exports = router;