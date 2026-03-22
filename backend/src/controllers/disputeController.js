const Dispute = require('../models/Dispute');
const Task = require('../models/Task');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { areObjectIdsEqual } = require('../utils/objectIdUtils');
const { logAdminActivity } = require('../middleware/adminActivityLogger');

// @desc    Create a new dispute
// @route   POST /api/disputes
// @access  Private
const createDispute = async (req, res) => {
  try {
    const { taskId, type, title, description, evidence } = req.body;
    const raisedBy = req.userId;

    // Find the task
    const task = await Task.findById(taskId)
      .populate('employer', 'name')
      .populate('assignedVendor', 'name');

    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Check if user is involved in the task
    const isEmployer = areObjectIdsEqual(task.employer._id, raisedBy);
    const isVendor = task.assignedVendor && areObjectIdsEqual(task.assignedVendor._id, raisedBy);

    if (!isEmployer && !isVendor) {
      return res.status(403).json({
        message: 'You are not authorized to raise a dispute for this task'
      });
    }

    // Ensure there is an opposing party
    if (isEmployer && !task.assignedVendor) {
      return res.status(400).json({ message: 'No vendor assigned to this task yet.' });
    }
    if (isVendor && !task.employer) {
      return res.status(400).json({ message: 'Task has no employer set.' });
    }

    // Determine the other party
    const against = isEmployer ? task.assignedVendor._id : task.employer._id;

    // Check if dispute already exists for this task
    const existingDispute = await Dispute.findOne({ 
      task: taskId,
      $or: [
        { raisedBy: raisedBy },
        { against: raisedBy }
      ]
    });

    if (existingDispute) {
      return res.status(400).json({
        message: 'A dispute already exists for this task'
      });
    }

    // Create dispute
    // Normalize evidence: allow array of strings (urls) or objects
    const normalizedEvidence = Array.isArray(evidence)
      ? evidence.map((ev) =>
          typeof ev === 'string'
            ? { type: 'other', url: ev }
            : {
                type: ev.type || 'other',
                url: ev.url || ev.documentUrl || '',
                description: ev.description
              }
        )
      : [];

    const dispute = await Dispute.create({
      task: taskId,
      raisedBy,
      against,
      type,
      title,
      description,
      evidence: normalizedEvidence
    });

    await dispute.populate('task', 'title budget status');
    await dispute.populate('raisedBy', 'name email');
    await dispute.populate('against', 'name email');

    // Add initial message from the user who raised the dispute
    dispute.messages.push({
      sender: raisedBy,
      message: description,
      isInternal: false
    });

    await dispute.save();

    res.status(201).json({
      message: 'Dispute raised successfully',
      dispute
    });
  } catch (error) {
    console.error('Create dispute error:', error);
    res.status(500).json({
      message: 'Error creating dispute',
      error: error.message
    });
  }
};

// @desc    Get disputes for admin
// @route   GET /api/admin/disputes
// @access  Private (Admin only)
const getDisputes = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority, 
      type,
      search 
    } = req.query;
    
    const skip = (page - 1) * limit;

    let filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (search) {
      const tasks = await Task.find({
        $or: [
          { title: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const taskIds = tasks.map(task => task._id);
      filter.$or = [
        { task: { $in: taskIds } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const disputes = await Dispute.find(filter)
      .populate('task', 'title budget category')
      .populate('raisedBy', 'name email phone')
      .populate('against', 'name email phone')
      .populate('resolution.resolvedBy', 'name')
      .populate('messages.sender', 'name role')
      .sort({ 
        priority: -1, 
        createdAt: -1 
      })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Dispute.countDocuments(filter);

    // Get dispute statistics
    const disputeStats = await Dispute.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      disputes,
      statistics: disputeStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({
      message: 'Error fetching disputes',
      error: error.message
    });
  }
};

// @desc    Add message to dispute
// @route   POST /api/admin/disputes/:disputeId/messages
// @access  Private (Admin only)
const addDisputeMessage = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { message, isInternal = false, attachments } = req.body;
    const adminId = req.userId;

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({
        message: 'Dispute not found'
      });
    }

    dispute.messages.push({
      sender: adminId,
      message,
      isInternal,
      attachments: attachments || []
    });

    // Update status if this is the first admin response
    if (dispute.status === 'open') {
      dispute.status = 'under_review';
      dispute.respondedAt = new Date();
    }

    await dispute.save();

    await logAdminActivity(req, 'dispute_message_added', 'dispute', disputeId, {
      messageLength: message.length,
      isInternal
    });

    res.json({
      message: 'Message added successfully',
      disputeMessage: dispute.messages[dispute.messages.length - 1]
    });
  } catch (error) {
    console.error('Add dispute message error:', error);
    res.status(500).json({
      message: 'Error adding message to dispute',
      error: error.message
    });
  }
};

// @desc    Resolve dispute
// @route   PATCH /api/admin/disputes/:disputeId/resolve
// @access  Private (Admin only)
const resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { decision, status, amountRefunded, notes, feedbackToParties } = req.body;
    const adminId = req.userId;

    const dispute = await Dispute.findById(disputeId)
      .populate('task')
      .populate('raisedBy')
      .populate('against');

    if (!dispute) {
      return res.status(404).json({
        message: 'Dispute not found'
      });
    }

    // Normalize decision/status to avoid undefined access
    const finalStatus = status || 'resolved';
    const decisionText = typeof decision === 'string' && decision.trim()
      ? decision
      : finalStatus === 'rejected'
        ? 'no_action'
        : 'payment_released';

    // Update dispute resolution
    dispute.resolution = {
      decision: decisionText,
      amountRefunded: amountRefunded || 0,
      resolvedBy: adminId,
      resolvedAt: new Date(),
      notes,
      feedbackToParties
    };

    dispute.status = finalStatus;
    dispute.closedAt = new Date();

    await dispute.save();

    // Handle payment adjustments based on resolution
    if (decisionText && decisionText.includes('refund')) {
      await handlePaymentRefund(dispute, amountRefunded);
    }

    await logAdminActivity(req, 'dispute_resolved', 'dispute', disputeId, {
      decision,
      amountRefunded,
      notes
    });

    res.json({
      message: 'Dispute resolved successfully',
      dispute
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({
      message: 'Error resolving dispute',
      error: error.message
    });
  }
};

// Helper function to handle payment refunds
const handlePaymentRefund = async (dispute, amountRefunded) => {
  try {
    const payment = await Payment.findOne({ task: dispute.task._id });
    if (payment && payment.status === 'completed') {
      // Create refund record (you would integrate with your payment provider here)
      console.log(`Processing refund of ${amountRefunded} for dispute ${dispute._id}`);
      
      // Update payment status to reflect refund
      payment.status = 'refunded';
      await payment.save();
    }
  } catch (error) {
    console.error('Payment refund error:', error);
    throw error;
  }
};

// @desc    Get user's disputes
// @route   GET /api/disputes/user/my-disputes
// @access  Private
const getUserDisputes = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const disputes = await Dispute.find({
      $or: [
        { raisedBy: userId },
        { against: userId }
      ]
    })
      .populate('task', 'title budget category')
      .populate('raisedBy', 'name')
      .populate('against', 'name')
      .populate('messages.sender', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Dispute.countDocuments({
      $or: [
        { raisedBy: userId },
        { against: userId }
      ]
    });

    res.json({
      disputes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get user disputes error:', error);
    res.status(500).json({
      message: 'Error fetching user disputes',
      error: error.message
    });
  }
};

module.exports = {
  createDispute,
  getDisputes,
  addDisputeMessage,
  resolveDispute,
  getUserDisputes
};
