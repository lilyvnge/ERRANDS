const { parseTwoDigitYear } = require('moment');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { areObjectIdsEqual, isUserAuthorizedForTask } = require('../utils/objectIdUtils');

const emitUserNotification = async (req, userId, payload) => {
  try {
    const io = req.app.get('io');
    if (!io || !userId) return;
    io.to(`user_${userId}`).emit('notification', payload);
    await Notification.create({
      user: userId,
      title: payload.title || 'Notification',
      message: payload.message || '',
      type: payload.type || 'info',
      relatedEntity: payload.relatedEntity || 'task',
      relatedEntityId: payload.taskId || payload.relatedEntityId
    });
  } catch (err) {
    console.error('Emit notification error:', err);
  }
};

//@description Create a new task
//@route POST /api/tasks
//@access Private (Employer only)
const createTask = async (req, res) => {
    try {
        const { title, description, category, budget, location, urgency, estimatedHours } = req.body;

        //Check if user is employer
        if (req.user.role !== 'employer') {
            return res.status(403).json({ message: 'Only employers can create tasks' });
        }

        const task = await Task.create({
            title,
            description,
            category,
            budget,
            urgency: urgency || 'medium',
            estimatedHours,
            employer: req.userId,
            location: location ? {
                address: location.address,
                type: 'Point',
                coordinates: Array.isArray(location.coordinates) ? location.coordinates : undefined
            } : undefined
        });

        //Populate employer field
        await task.populate('employer', 'name email phone');

        res.status(201).json({
            message: 'Task created successfully',
            task
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            message: 'Error creating task',
            error: error.message 
        });
    }
};

// helper to auto-complete if vendor requested and deadline passed
const maybeAutoComplete = async (task) => {
    if (
        task &&
        task.status === 'completion-requested' &&
        task.completionExpiresAt &&
        task.completionExpiresAt <= new Date()
    ) {
        task.status = 'completed';
        task.completedAt = new Date();
        task.completionDecision = 'auto-approved';
        await task.save();
    }
    return task;
};

//desc Get all tasks (with filters)
//route GET /api/tasks
//access Public (for now, will be private later)
const getTasks = async (req, res) => {
    try {
        const {
            category,
            minBudget,
            maxBudget,
            status,
            latitude,
            longitude,
            maxDistance,
            page = 1,
            limit = 10
        } = req.query;

        //Build filter object
        let filter = {};
        // Employers only see their own tasks by default
        if (req.user?.role === 'employer') {
            filter.employer = req.userId;
        } else if (req.user?.role === 'vendor') {
            // Vendors: see open/unassigned tasks + tasks assigned to them
            filter.$or = [
                { status: 'open', assignedVendor: { $exists: false } },
                { assignedVendor: req.userId }
            ];
        } else {
            filter.status = 'open'; // Default to open tasks for unauthenticated/other roles
        }

        if (category) filter.category = category;
        if (status) {
            if (req.user?.role === 'vendor' && status !== 'open') {
                filter.assignedVendor = req.userId;
                delete filter.$or;
            }
            filter.status = status;
        }
        if (minBudget || maxBudget) {
            filter.budget = {};
            if (minBudget) filter.budget.$gte = Number(minBudget);
            if (maxBudget) filter.budget.$lte = Number(maxBudget);
        }

        //Location-based filtering
        if (latitude && longitude && maxDistance) {
            filter.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseInt(maxDistance) * 1000 // in meters
                }
            };
        }

        const tasks = await Task.find(filter)
            .populate('employer', 'name rating')
            .populate('assignedVendor', 'name vendorProfile')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Task.countDocuments(filter);

        res.json({
            tasks,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({
            message: 'Error fetching tasks',
            error: error.message 
        });
    }
};

// desc Get single task
// route GET /api/tasks/:id
// access Public
const getTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('employer', 'name email phone rating')
            .populate('assignedVendor', 'name phone vendorProfile rating');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (req.user?.role === 'vendor') {
            const assignedRef = task.assignedVendor && typeof task.assignedVendor === 'object'
                ? task.assignedVendor._id || task.assignedVendor
                : task.assignedVendor;
            const isAssignedToVendor = assignedRef ? areObjectIdsEqual(assignedRef, req.userId) : false;

            if (assignedRef && !isAssignedToVendor) {
                return res.status(403).json({ message: 'Not authorized to view this task' });
            }
            if (!assignedRef && task.status !== 'open') {
                return res.status(403).json({ message: 'Not authorized to view this task' });
            }
        }

        await maybeAutoComplete(task);

        res.json({ task });
    } catch (error) {
        console.error('Get task by ID error:', error);
        res.status(500).json({
            message: 'Error fetching task',
            error: error.message 
        });
    }
};

//desc Update task 
//route PUT /api/tasks/:id
//access Private (Task owner or admin)
const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        //Check if user is task owner or admin
        if (!areObjectIdsEqual(task.employer, req.userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this task' });
            }

        if (req.user.role === 'employer' && Object.prototype.hasOwnProperty.call(req.body, 'budget')) {
            if (task.status !== 'open' || task.assignedVendor) {
                return res.status(400).json({ message: 'Budget can only be updated before a task is assigned' });
            }
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
        .populate('employer', 'name email phone')
        .populate('assignedVendor', 'name vendorProfile');

        res.json({
            message: 'Task updated successfully',
            task: updatedTask
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            message: 'Error updating task',
            error: error.message 
        });
    }
};

//@desc Assign vendor to task (employer can assign, vendor can accept/self-assign)
//@route POST /api/tasks/:id/assign
//@access Private (Employer or Vendor or Admin)
const assignTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        // If task is already assigned, cannot accept/assign
        if (task.status !== 'open') {
            return res.status(400).json({ message: 'Task is no longer available' });
        }

        // Two flows:
        // - Vendor accepts the task (self-assign): req.user.role === 'vendor'
        // - Employer assigns a vendor: req.user.role === 'employer' (must provide vendorId in body)
        // - Admin can assign as well
        let vendorIdToAssign = null;

        if (req.user.role === 'vendor') {
            // Vendor can self-assign but must be verified
            const vendor = await User.findById(req.userId).select('vendorProfile.isVerified');
            if (!vendor?.vendorProfile?.isVerified) {
                return res.status(403).json({ message: 'Only verified vendors can accept tasks' });
            }
            vendorIdToAssign = req.userId;
        } else if (req.user.role === 'employer' || req.user.role === 'admin') {
            // Employer or admin must provide vendorId in body and vendor must be verified
            const { vendorId } = req.body;
            if (!vendorId) {
                return res.status(400).json({ message: 'vendorId is required to assign a vendor' });
            }
            const vendor = await User.findById(vendorId).select('vendorProfile.isVerified');
            if (!vendor) {
                return res.status(404).json({ message: 'Vendor not found' });
            }
            if (!vendor.vendorProfile?.isVerified) {
                return res.status(400).json({ message: 'Vendor is not verified and cannot be assigned' });
            }
            vendorIdToAssign = vendorId;
        } else {
            return res.status(403).json({ message: 'Not authorized to assign this task' });
        }

        const activeTask = await Task.findOne({
            assignedVendor: vendorIdToAssign,
            status: { $nin: ['completed', 'cancelled'] }
        }).select('title status');

        if (activeTask) {
            return res.status(409).json({
                code: 'VENDOR_ACTIVE_TASK',
                message: 'You already have an active task. Complete it before accepting another.',
                activeTask: {
                    id: activeTask._id,
                    title: activeTask.title,
                    status: activeTask.status
                }
            });
        }

        // Update task
        task.assignedVendor = vendorIdToAssign;
        task.status = 'assigned';
        await task.save();

        await task.populate('assignedVendor', 'name vendorProfile');
        await task.populate('employer', 'name email phone');

        // Notify employer about assignment
        await emitUserNotification(req, task.employer?._id || task.employer, {
            type: 'info',
            title: 'Task assigned',
            message: `Your task "${task.title}" has been assigned${task.assignedVendor?.name ? ` to ${task.assignedVendor.name}` : ''}.`,
            taskId: task._id,
            createdAt: new Date().toISOString()
        });
        // Notify vendor about assignment (including self-assign)
        await emitUserNotification(req, vendorIdToAssign, {
            type: 'info',
            title: 'Task assigned',
            message: `You have been assigned the task "${task.title}".`,
            taskId: task._id,
            createdAt: new Date().toISOString()
        });

        res.json({
            message: 'Task assigned successfully',
            task
        });
    } catch (error) {
        console.error('Assign task error:', error);
        res.status(500).json({
            message: 'Error assigning task',
            error: error.message 
        });
    }
};

//@desk Update task status
//@route PATCH /api/tasks/:id/status
//@access Private (Task owner, assigned vendor, or admin)
const updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        //Check authorization
        const isEmployer = areObjectIdsEqual(task.employer, req.userId);
        const isVendor = task.assignedVendor && areObjectIdsEqual(task.assignedVendor, req.userId);

        if (!isEmployer && !isVendor && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update task status' });
        }

        // Vendor requests completion
        if (status === 'completion-requested') {
            if (!isVendor) {
                return res.status(403).json({ message: 'Only assigned vendor can request completion' });
            }
            task.status = 'completion-requested';
            task.completionRequestedAt = new Date();
            task.completionExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour window
            task.completionRequestedBy = req.userId;
            task.completionDecision = 'pending';
        }
        // Employer approves completion
        else if (status === 'completed') {
            if (!isEmployer && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only employer can approve completion' });
            }
            task.status = 'completed';
            task.completedAt = Date.now();
            if (task.completionRequestedAt) {
                task.completionDecision = 'approved';
            }
        }
        // Employer disputes
        else if (status === 'disputed') {
            if (!isEmployer && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only employer can dispute completion' });
            }
            task.status = 'disputed';
            task.completionDecision = 'disputed';
        } else {
            // fallback for other statuses
            task.status = status;
        }

        await task.save();

        if (status === 'completion-requested') {
            await emitUserNotification(req, task.employer, {
                type: 'info',
                title: 'Completion requested',
                message: `Vendor requested completion for "${task.title}".`,
                taskId: task._id,
                createdAt: new Date().toISOString()
            });
        }
        if (status === 'completed' && task.assignedVendor) {
            await emitUserNotification(req, task.assignedVendor, {
                type: 'success',
                title: 'Task completed',
                message: `Your task "${task.title}" has been approved and completed.`,
                taskId: task._id,
                createdAt: new Date().toISOString()
            });
        }
        if (status === 'disputed' && task.assignedVendor) {
            await emitUserNotification(req, task.assignedVendor, {
                type: 'warning',
                title: 'Task disputed',
                message: `The employer has opened a dispute on "${task.title}".`,
                taskId: task._id,
                createdAt: new Date().toISOString()
            });
        }

        res.json({
            message: 'Task status updated successfully',
            task
        });
    } catch (error) {
        console.error('Update task status error:', error);
        res.status(500).json({
            message: 'Error updating task status',
            error: error.message 
        });
    }
};

//@desc Get user's task (either as employer or vendor)
//@route GET /api/tasks/user/my-tasks
//@access Private
const getMyTasks = async (req, res) => {
    try {
    const { type, status, category, urgency, minBudget, maxBudget, page = 1, limit = 10 } = req.query;

    // type is used as role scope (employer/vendor/all)
    const filter = {};

    const scopedType = type || (req.user.role === 'vendor' ? 'vendor' : req.user.role === 'employer' ? 'employer' : 'all');

    if (scopedType === 'employer') {
        filter.employer = req.userId;
    } else if (scopedType === 'vendor') {
        filter.assignedVendor = req.userId;
    }

        // optional explicit status filter
        if (status) {
            filter.status = status;
        }
        if (category) {
            filter.category = category;
        }
        if (urgency) {
            filter.urgency = urgency;
        }
        if (minBudget || maxBudget) {
            filter.budget = {};
            if (minBudget) filter.budget.$gte = Number(minBudget);
            if (maxBudget) filter.budget.$lte = Number(maxBudget);
        }

        const tasks = await Task.find(filter)
            .populate('employer', 'name phone')
            .populate('assignedVendor', 'name vendorProfile')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // auto-complete expired requests before responding
        await Promise.all(tasks.map(maybeAutoComplete));

        const total = await Task.countDocuments(filter);

        res.json({
            tasks,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total,
            userRole: req.user.role
        });
    } catch (error) {
        console.error('Get user tasks error:', error);
        res.status(500).json({
            message: 'Error fetching user tasks',
            error: error.message 
        });
    }
};

// @desc    Get task participants
// @route   GET /api/tasks/:id/participants
// @access  Private
const getTaskParticipants = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('employer', 'name email role')
      .populate('assignedVendor', 'name email role');

    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    res.json({
      taskId: task._id,
      employer: task.employer,
      assignedVendor: task.assignedVendor,
      currentUser: {
        id: req.userId,
        role: req.user.role
      },
      canChat: !!task.assignedVendor
    });
  } catch (error) {
    console.error('Get task participants error:', error);
    res.status(500).json({
      message: 'Error fetching task participants',
      error: error.message
    });
  }
};

// @desc    Check if task is paid
// @route   GET /api/tasks/:id/payment-status
// @access  Private (Task participants only)
const getTaskPaymentStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
        .populate('employer', 'name')
        .populate('assignedVendor', 'name');

    if (!task) {
        return res.status(404).json({
            message: 'Task not found'
        });
    }

    // Check if user is authorized
    const isEmployer = areObjectIdsEqual(task.employer._id, req.userId);
    const isVendor = task.assignedVendor && areObjectIdsEqual(task.assignedVendor._id, req.userId);

    if (!isEmployer && !isVendor && req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Not authorized to view payment status for this task'
        });
    }

    // Find payment for this task
    const payment = await Payment.findOne({ task: task._id })
    .populate('employer', 'name')
    .populate('vendor', 'name');

    res.json({
        task: {
            id: task._id,
            title: task.title,
            budget: task.budget,
            status: task.status,
            paymentStatus: task.paymentStatus
        },
        payment: payment ? {
            id: payment._id,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            paidAt: payment.paidAt,
            vendorAmount: payment.vendorAmount,
            platformFee: payment.platformFee
        } : null
    });
  } catch (error) {
    console.error('Get task payment status error:', error);
    res.status(500).json({
        message: 'Error fetching task payment status',
        error: error.message
    });
  }
};


module.exports = {
    createTask,
    getTasks,
    getTask,
    updateTask,
    assignTask,
    updateTaskStatus,
    getMyTasks,
    getTaskParticipants,
    getTaskPaymentStatus
};


