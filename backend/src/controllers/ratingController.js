const Task = require('../models/Task');
const User = require('../models/User');
const { areObjectIdsEqual } = require('../utils/objectIdUtils');

// @desc    Rate a user after task completion
// @route   POST /api/tasks/:id/rate
// @access  Private
const rateUser = async (req, res) => {
  try {
    const { rating, comment, rateeRole } = req.body; // rateeRole: 'employer' or 'vendor'
    const taskId = req.params.id;
    const raterId = req.userId;
    const raterRole = req.user.role;

    console.log('Rating request:', { taskId, raterId: raterId.toString(), raterRole, rateeRole, rating });

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    console.log('Task found:', { 
      status: task.status, 
      employer: task.employer.toString(),
      assignedVendor: task.assignedVendor 
    });

    // Check if task is completed
    if (task.status !== 'completed') {
      return res.status(400).json({
        message: 'Can only rate after task is completed'
      });
    }

    // Validate rating (using 1-10 scale as per your Task model)
    if (rating < 1 || rating > 10) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 10'
      });
    }

    // Determine who is rating whom
    let ratedUserId;
    
    if (rateeRole === 'vendor' && raterRole === 'employer') {
      // Employer rating vendor
      if (!areObjectIdsEqual(task.employer, raterId)) {
        console.log('Employer mismatch:', { taskEmployer: task.employer.toString(), raterId: raterId.toString()
        });
        return res.status(403).json({
          message: 'Only the employer can rate the vendor for this task'
        });
      }
      
      // Check if there's an assigned vendor
      if (!task.assignedVendor) {
        return res.status(400).json({
          message: 'No vendor assigned to this task'
        });
      }
      
      ratedUserId = task.assignedVendor;
      
    } else if (rateeRole === 'employer' && raterRole === 'vendor') {
      // Vendor rating employer
      
      // Check if there's an assigned vendor first
      if (!task.assignedVendor) {
        return res.status(400).json({
          message: 'No vendor assigned to this task'
        });
      }
      
      if (!areObjectIdsEqual(task.assignedVendor, raterId)) {
        console.log('Vendor mismatch:', { taskVendor: task.assignedVendor.toString(), raterId: raterId.toString()  
        });
        return res.status(403).json({
          message: 'Invalid rating combination. Must be employer rating vendor or vendor rating employer.'
        });
      }
      
      ratedUserId = task.employer;
    } else {
      return res.status(400).json({
        message: 'Invalid rating combination. Must be employer rating vendor or vendor rating employer.'
      });
    }

    // Check if already rated
    const existingRating = task.ratings.find(
      r => areObjectIdsEqual(r.ratedBy, raterId) && r.role === raterRole
    );

    if (existingRating) {
      return res.status(400).json({
        message: 'You have already rated for this task'
      });
    }

    // Add rating to task
    task.ratings.push({
      rating,
      comment,
      ratedBy: raterId,
      role: raterRole
    });

    // Calculate new average ratings for the task
    task.calculateAverageRatings();
    await task.save();

    // Update the rated user's overall rating
    await updateUserRating(ratedUserId, rateeRole, rating);

    // Populate the new rating for response
    await task.populate('ratings.ratedBy', 'name');
    await task.populate('employer', 'name');
    await task.populate('assignedVendor', 'name');

    res.json({
      message: 'Rating submitted successfully',
      rating: task.ratings[task.ratings.length - 1],
      task: {
        id: task._id,
        title: task.title,
        averageRating: task.averageRating
      }
    });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({
      message: 'Error submitting rating',
      error: error.message
      });
    }
};

// Helper function to update user's overall rating
const updateUserRating = async (userId, userRole, newRating) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found for rating update:', userId);
      return;
    }

    // Initialize rating objects if they don't exist
    if (userRole === 'vendor') {
      if (!user.vendorProfile.rating) {
        user.vendorProfile.rating = {
          average: 0,
          count: 0,
          breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0 }
        };
      }
    } else {
      if (!user.employerRating) {
        user.employerRating = {
          average: 0,
          count: 0,
          breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0 }
        };
      }
    }

    const currentRating = userRole === 'vendor' ? user.vendorProfile.rating : user.employerRating;

    // Calculate new average
    const newCount = currentRating.count + 1;
    const newAverage = ((currentRating.average * currentRating.count) + newRating) / newCount;

    // Update breakdown
    const newBreakdown = { ...currentRating.breakdown };
    newBreakdown[newRating.toString()] = (newBreakdown[newRating.toString()] || 0) + 1;

    // Update user
    const updateData = {
      average: Math.round(newAverage * 10) / 10, // Round to 1 decimal
      count: newCount,
      breakdown: newBreakdown
    };

    if (userRole === 'vendor') {
      user.vendorProfile.rating = updateData;
    } else {
      user.employerRating = updateData;
    }

    await user.save();
    console.log(`Updated ${userRole} rating for user ${userId}:`, updateData);
  } catch (error) {
    console.error('Error updating user rating:', error);
  }
};

// @desc    Get ratings for a user
// @route   GET /api/users/:id/ratings
// @access  Private
const getUserRatings = async (req, res) => {
  try {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find all tasks where this user was involved and has ratings
    const tasks = await Task.find({
      $or: [
        { employer: userId, 'ratings.role': 'vendor' }, // User as employer, rated by vendors
        { assignedVendor: userId, 'ratings.role': 'employer' } // User as vendor, rated by employers
      ]
    })
    .populate('ratings.ratedBy', 'name')
    .select('title category ratings completedAt')
    .sort({ completedAt: -1 })
    .skip(skip)
    .limit(limit);

    // Extract ratings with task context
    const userRatings = [];
    tasks.forEach(task => {
      task.ratings.forEach(rating => {
        // Only include ratings that are for the requested user
        const isRatingForUser = 
          (areObjectIdsEqual(task.employer, userId) && rating.role === 'vendor') ||
          (task.assignedVendor && areObjectIdsEqual(task.assignedVendor, userId) && rating.role === 'employer');
        
        if (isRatingForUser) {
          userRatings.push({
            _id: rating._id,
            rating: rating.rating,
            comment: rating.comment,
            ratedBy: rating.ratedBy,
            role: rating.role,
            task: {
              id: task._id,
              title: task.title,
              category: task.category
            },
            createdAt: rating.createdAt
          });
        }
      });
    });

    // Get user to include rating summary
    const user = await User.findById(userId).select('vendorProfile employerRating name role');
    
    const total = await Task.countDocuments({
      $or: [
        { employer: userId, 'ratings.role': 'vendor' },
        { assignedVendor: userId, 'ratings.role': 'employer' }
      ]
    });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        ratings: user.role === 'vendor' ? 
          (user.vendorProfile.rating || { average: 0, count: 0, breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0 } }) : 
          (user.employerRating || { average: 0, count: 0, breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0 } })
      },
      ratings: userRatings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRatings: total
      }
    });
  } catch (error) {
    console.error('Get user ratings error:', error);
    res.status(500).json({
      message: 'Error fetching user ratings',
      error: error.message
    });
  }
};

// @desc    Get rating summary for current user
// @route   GET /api/users/ratings/summary
// @access  Private
const getRatingSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select('vendorProfile employerRating name role');
    
    let ratingSummary = {};
    
    if (user.role === 'vendor') {
      ratingSummary = user.vendorProfile?.rating || { average: 0, count: 0, breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0 } };
    } else if (user.role === 'employer') {
      ratingSummary = user.employerRating || { average: 0, count: 0, breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0 } };
    }

    // Get recent ratings
    const recentTasks = await Task.find({
      $or: [
        { employer: userId, 'ratings.role': 'vendor' },
        { assignedVendor: userId, 'ratings.role': 'employer' }
      ]
    })
    .populate('ratings.ratedBy', 'name')
    .select('title ratings employer assignedVendor')
    .sort({ 'ratings.createdAt': -1 })
    .limit(5);

    const recentRatings = [];
    recentTasks.forEach(task => {
      task.ratings.forEach(rating => {
        const isRatingForUser = 
          (task.employer && task.employer.toString() === userId && rating.role === 'vendor') ||
          (task.assignedVendor && task.assignedVendor.toString() === userId && rating.role === 'employer');
        
        if (isRatingForUser) {
          recentRatings.push({
            rating: rating.rating,
            comment: rating.comment,
            ratedBy: rating.ratedBy,
            taskTitle: task.title,
            createdAt: rating.createdAt
          });
        }
      });
    });

    res.json({
      summary: ratingSummary,
      recentRatings: recentRatings.slice(0, 3) // Only return 3 most recent
    });
  } catch (error) {
    console.error('Get rating summary error:', error);
    res.status(500).json({
      message: 'Error fetching rating summary',
      error: error.message
    });
  }
};

module.exports = {
  rateUser,
  getUserRatings,
  getRatingSummary
};
