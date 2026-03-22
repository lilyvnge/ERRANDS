const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Send notification to users
// @route   POST /api/admin/notifications/send
// @access  Private (Admin only)
const sendNotification = async (req, res) => {
  try {
    const { userIds, title, message, type, priority, relatedEntity, relatedEntityId, actionUrl } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: 'User IDs are required and must be a non-empty array'
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        message: 'Title and message are required'
      });
    }

    // Validate users exist
    const users = await User.find({ _id: { $in: userIds } }).select('_id');
    const validUserIds = users.map(user => user._id);

    if (validUserIds.length === 0) {
      return res.status(400).json({
        message: 'No valid users found'
      });
    }

    // Create notifications
    const notifications = validUserIds.map(userId => ({
      user: userId,
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      relatedEntity,
      relatedEntityId,
      actionUrl
    }));

    await Notification.insertMany(notifications);

    await logAdminActivity(req, 'notification_sent', 'notification', null, {
      userCount: validUserIds.length,
      title,
      type,
      priority
    });

    res.json({
      message: `Notification sent to ${validUserIds.length} users`,
      sentCount: validUserIds.length
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      message: 'Error sending notification',
      error: error.message
    });
  }
};

// @desc    Send notification to all users of a specific role
// @route   POST /api/admin/notifications/broadcast
// @access  Private (Admin only)
const broadcastNotification = async (req, res) => {
  try {
    const { role, title, message, type, priority, relatedEntity, relatedEntityId, actionUrl } = req.body;

    if (!role) {
      return res.status(400).json({
        message: 'Role is required'
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        message: 'Title and message are required'
      });
    }

    // Get users by role
    const users = await User.find({ role, isActive: true }).select('_id');
    const userIds = users.map(user => user._id);

    if (userIds.length === 0) {
      return res.status(400).json({
        message: `No active users found with role: ${role}`
      });
    }

    // Create notifications
    const notifications = userIds.map(userId => ({
      user: userId,
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      relatedEntity,
      relatedEntityId,
      actionUrl
    }));

    await Notification.insertMany(notifications);

    await logAdminActivity(req, 'notification_broadcast', 'notification', null, {
      role,
      userCount: userIds.length,
      title,
      type,
      priority
    });

    res.json({
      message: `Notification broadcast to ${userIds.length} ${role}s`,
      sentCount: userIds.length
    });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      message: 'Error broadcasting notification',
      error: error.message
    });
  }
};

// @desc    Get notifications (admin sees all, users see their own)
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, priority, isRead } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (req.user.role !== 'admin') {
      filter.user = req.userId;
    }

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    const query = Notification.find(filter);
    if (req.user.role === 'admin') {
      query.populate('user', 'name email role');
    }

    const notifications = await query
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);

    // Get notification statistics
    const notificationStats = await Notification.aggregate([
      {
        $group: {
          _id: {
            type: '$type',
            isRead: '$isRead'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      notifications,
      statistics: notificationStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    console.log('Marking notification as read:', req.params.id);
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      console.log('Notification not found:', req.params.id);
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Ensure user owns the notification
    if (notification.user.toString() !== req.userId && req.user.role !== 'admin') {
      console.log('Unauthorized access to notification:', req.params.id, 'by user:', req.userId);
      return res.status(403).json({ message: 'Not authorized to access this notification' });
    }

    notification.isRead = true;
    notification.readAt = Date.now();
    await notification.save();
    console.log('Notification marked as read successfully:', req.params.id);

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      message: 'Error marking notification as read',
      error: error.message
    });
  }
};

module.exports = {
  sendNotification,
  broadcastNotification,
  getNotifications,
  markAsRead
};
