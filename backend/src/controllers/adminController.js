const User = require('../models/User');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AdminActivity = require('../models/AdminActivity');
const { areObjectIdsEqual } = require('../utils/objectIdUtils');

// @desc    Get platform overview statistics
// @route   GET /api/admin/overview
// @access  Private (Admin only)
const getPlatformOverview = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalTasks = await Task.countDocuments();
        const totalPayments = await Payment.countDocuments();
        const totalEmployers = await User.countDocuments({ role: 'employer' });
        const totalVendors = await User.countDocuments({ role: 'vendor' });

        // Task status breakdown
        const taskStatusCounts = await Task.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Payment status breakdown
        const paymentStatusCounts = await Payment.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        // Revenue calculation
        const revenueStats = await Payment.aggregate([
            {
                $match: { status: 'completed' }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$platformFee' },
                    totalPaidToVendors: { $sum: '$vendorAmount' },
                    totalTransactions: { $sum: 1 },
                    averageTransaction: { $avg: '$amount' }
                }
            }
        ]);

        //Recent activity (Last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentStats = {
            newUsers: await User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
            newTasks: await Task.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
            newPayments: await Payment.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
            completedTasks: await Task.countDocuments({ status: 'completed', updatedAt: { $gte: oneWeekAgo } })
        };

        // Category breakdown
        const categoryCounts = await Task.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalBudget: { $sum: '$budget' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        res.json({
            overview: {
                totalUsers,
                totalEmployers,
                totalVendors,
                totalTasks,
                totalPayments,
                taskStatusCounts,
                paymentStatusCounts,
                revenue: revenueStats[0] || {
                    totalRevenue: 0,
                    totalPaidToVendors: 0,
                    totalTransactions: 0,
                    averageTransaction: 0
                },
                recentActivity: recentStats,
                categoryCounts
            }
        });
    } catch (error) {
        console.error('Admin overview error:', error);
        res.status(500).json({ message: 'Server error fetching platform overview',
            error: error.message
         });
        }
};

// @desc    Get all users with filtering and pagination
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            role,
            search,
            isActive,
            isVerified
        } = req.query;

        const skip = (page - 1) * limit;

        let filter = {};

        // Role filter
        if (role && role !== 'all') {
            filter.role = role;
        }

        // Active status filter
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        // Verification status filter
        if (isVerified !== undefined && role === 'vendor') {
            filter['vendorProfile.isVerified'] = isVerified === 'true';
        }

        // Search filter
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(filter);

        // Get additional stats for each user
        const usersWithStats = await Promise.all(users.map(async (user) => {
            let userStats = {};

            if (user.role === 'employer') {
                const tasksCreated = await Task.countDocuments({ employer: user._id });
                const totalSpent = await Payment.aggregate([
                    { $match: { payer: user._id, status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]);

                userStats.taskCreated = tasksCreated;
                userStats.totalSpent = totalSpent[0]?.total || 0;
                userStats.averageRating = user.employerRating?.average || 0;

            } else if (user.role === 'vendor') {
                const tasksCompleted = await Task.countDocuments({ assignedVendor: user._id, status: 'completed' });
                const totalEarned = await Payment.aggregate([
                    { $match: { vendor: user._id, status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$vendorAmount' } } }
                ]);

                userStats.tasksCompleted = tasksCompleted;
                userStats.totalEarned = totalEarned[0]?.total || 0;
                userStats.averageRating = user.vendorProfile?.rating?.average || 0;
                userStats.isVerified = user.vendorProfile?.isVerified || false;
            }

            return {
                ...user.toObject(),
                stats: userStats
            };
        }));

        res.json({
            users: usersWithStats,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalUsers: total
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error fetching users',
            error: error.message
         });
    }
};

// @desc    Update user status (activate/deactivate)
// @route   PATCH /api/admin/users/:userId/status
// @access  Private (Admin only)
const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isActive = isActive;;
        await user.save();

        res.json({ message: "User ${isActive ? 'activated' : 'deactivated'} successfully", 
            user: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
         });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ message: 'Server error updating user status',
            error: error.message
         });
    }
}

// @desc    Get all tasks with filtering and pagination
// @route   GET /api/admin/tasks
// @access  Private (Admin only)
const getTasks = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            category,
            search,
            hasPayment
        } = req.query;

        const skip = (page - 1) * limit;

        let filter = {};

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (hasPayment !== undefined) {
            if (hasPayment === 'true') {
                filter.paymentStatus = 'paid';
            } else {
                filter.paymentStatus = { $ne: 'paid' };
            }
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const tasks = await Task.find(filter)
            .populate('employer', 'name email phone')
            .populate('assignedVendor', 'name email phone vendorProfile')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

const total = await Task.countDocuments(filter);

// Get payment info for each task
const tasksWithPayments = await Promise.all(tasks.map(async (task) => {
    const payment = await Payment.findOne({ task: task._id });
    return {
        ...task.toObject(),
        payment: payment ? {
            id: payment._id,
            amount: payment.amount,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            paidAt: payment.paidAt
        } : null
    };
}));

res.json({
    tasks: tasksWithPayments,
    pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
    }
});
} catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error fetching tasks', error: error.message });
}
};

// @desc    Update task status (admin override)
// @route   PATCH /api/admin/tasks/:taskId/status
// @access  Private (Admin only)

const updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status, adminNotes } = req.body;

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const oldStatus = task.status;
        task.status = status;

        if (status === 'completed' && oldStatus !== 'completed') {
            task.completedAt = new Date();
        }

        // Add admin action log
        task.adminActions = task.adminActions || [];
        task.adminActions.push({
            action: 'Status Update',
            fromStatus: oldStatus,
            toStatus: status,
            adminId: req.userId,
            notes: adminNotes,
            timestamp: new Date()
        });

        await task.save();

        await task.populate('employer', 'name email');
        await task.populate('assignedVendor', 'name email');

        res.json({ message: 'Task status updated successfully',
            task: {
                id: task._id,
                title: task.title,
                status: task.status,
                employer: task.employer,
                assignedVendor: task.assignedVendor,
                adminActions: task.adminActions
             }  });
    } catch (error) {
        console.error('Update task status error:', error);
        res.status(500).json({ message: 'Server error updating task status',
            error: error.message
         });
        }
};

// @desc    Get all payments with filtering and pagination
// @route   GET /api/admin/payments
// @access  Private (Admin only)
const getPayments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            paymentMethod,
            search,
            dateFrom,
            dateTo
        } = req.query;

        const skip = (page - 1) * limit;

        let filter = {};

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (paymentMethod && paymentMethod !== 'all') {
            filter.paymentMethod = paymentMethod;
        }

        // Date range filter
        if (dateFrom || dateTo) {
            filter.createdAt = {};

            if (dateFrom || dateTo) {
                filter.createdAt = {};
                if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
                if (dateTo) filter.createdAt.$lte = new Date(dateTo);
            }
        }

        if (search) {
      // Search by task title, employer name, or vendor name
      const tasks = await Task.find({
        $or: [
          { title: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const taskIds = tasks.map(task => task._id);
      filter.$or = [
        { task: { $in: taskIds } },
        { 'mpesaCallback.mpesaReceiptNumber': { $regex: search, $options: 'i' } }
      ];
    }

    const payments = await Payment.find(filter)
      .populate('task', 'title category')
      .populate('employer', 'name email')
      .populate('vendor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    // Calculate totals
    const totals = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPlatformFees: { $sum: '$platformFee' },
          totalVendorPayouts: { $sum: '$vendorAmount' }
        }
      }
    ]);

    res.json({
      payments,
      totals: totals[0] || {
        totalAmount: 0,
        totalPlatformFees: 0,
        totalVendorPayouts: 0
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      message: 'Error fetching payments',
      error: error.message
    });
}
};


// @desc    Get vendor verification requests
// @route   GET /api/admin/verifications
// @access  Private (Admin only)
const getVerificationRequests = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'pending' 
    } = req.query;
    
    const skip = (page - 1) * limit;

    const filter = {
      role: 'vendor',
      'vendorProfile.verification.status': status
    };

    const vendors = await User.find(filter)
      .select('name email phone vendorProfile.verification vendorProfile.skills createdAt')
      .sort({ 'vendorProfile.verification.submittedAt': 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      verifications: vendors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get verification requests error:', error);
    res.status(500).json({
      message: 'Error fetching verification requests',
      error: error.message
    });
  }
};

// @desc    Get platform analytics and charts data
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
const getPlatformAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y

    let days;
    switch (period) {
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      case '1y': days = 365; break;
      default: days = 30;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // User registration trend
    const userRegistrations = await User.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Task creation trend
    const taskCreations = await Task.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Revenue trend
    const revenueTrend = await Payment.aggregate([
      {
        $match: { 
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          dailyRevenue: { $sum: '$platformFee' },
          dailyPayouts: { $sum: '$vendorAmount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Category performance
    const categoryPerformance = await Task.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: '$category',
          taskCount: { $sum: 1 },
          avgBudget: { $avg: '$budget' },
          completionRate: {
            $avg: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { taskCount: -1 }
      }
    ]);

    res.json({
      analytics: {
        period,
        userRegistrations,
        taskCreations,
        revenueTrend,
        categoryPerformance
      }
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      message: 'Error fetching platform analytics',
      error: error.message
    });
  }
};

// @desc    Bulk update users
// @route   PATCH /api/admin/users/bulk
// @access  Private (Admin only)
const bulkUpdateUsers = async (req, res) => {
  try {
    const { userIds, updateFields } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: 'User IDs are required and must be a non-empty array'
      });
    }

    if (!updateFields || typeof updateFields !== 'object') {
      return res.status(400).json({
        message: 'Update fields are required and must be an object'
      });
    }

    // Allowed fields for bulk update
    const allowedFields = ['isActive', 'role'];
    const updateData = {};

    Object.keys(updateFields).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = updateFields[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: 'No valid fields to update. Allowed fields: ' + allowedFields.join(', ')
      });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: updateData }
    );

    await logAdminActivity(req, 'user_bulk_update', 'user', null, {
      userIds: userIds.length,
      updateData,
      modifiedCount: result.modifiedCount
    });

    res.json({
      message: `Successfully updated ${result.modifiedCount} users`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error('Bulk update users error:', error);
    res.status(500).json({
      message: 'Error bulk updating users',
      error: error.message
    });
  }
};

// @desc    Bulk update tasks
// @route   PATCH /api/admin/tasks/bulk
// @access  Private (Admin only)
const bulkUpdateTasks = async (req, res) => {
  try {
    const { taskIds, updateFields } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        message: 'Task IDs are required and must be a non-empty array'
      });
    }

    if (!updateFields || typeof updateFields !== 'object') {
      return res.status(400).json({
        message: 'Update fields are required and must be an object'
      });
    }

    // Allowed fields for bulk update
    const allowedFields = ['status', 'priority', 'paymentStatus'];
    const updateData = {};

    Object.keys(updateFields).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = updateFields[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: 'No valid fields to update. Allowed fields: ' + allowedFields.join(', ')
      });
    }

    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: updateData }
    );

    await logAdminActivity(req, 'task_bulk_update', 'task', null, {
      taskIds: taskIds.length,
      updateData,
      modifiedCount: result.modifiedCount
    });

    res.json({
      message: `Successfully updated ${result.modifiedCount} tasks`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error('Bulk update tasks error:', error);
    res.status(500).json({
      message: 'Error bulk updating tasks',
      error: error.message
    });
  }
};

// @desc    Get admin activities
// @route   GET /api/admin/activities
// @access  Private (Admin only)
const getAdminActivities = async (req, res) => {
  try {
    const { page = 1, limit = 20, action, resourceType, adminId } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (action && action !== 'all') {
      filter.action = action;
    }

    if (resourceType && resourceType !== 'all') {
      filter.resourceType = resourceType;
    }

    if (adminId) {
      filter.admin = adminId;
    }

    const activities = await AdminActivity.find(filter)
      .populate('admin', 'name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdminActivity.countDocuments(filter);

    // Get activity statistics
    const activityStats = await AdminActivity.aggregate([
      {
        $group: {
          _id: {
            action: '$action',
            resourceType: '$resourceType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      activities,
      statistics: activityStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get admin activities error:', error);
    res.status(500).json({
      message: 'Error fetching admin activities',
      error: error.message
    });
  }
};

module.exports = {
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
};
