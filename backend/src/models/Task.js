const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  comment: {
    type: String,
    maxlength: 500
  },
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['employer', 'vendor'],
    required: true
  }
}, {
  timestamps: true
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a task title'],
    maxlength: 100
  },
  description: {
    type: String,
    required: [true, 'Please provide a task description'],
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: ['laundry', 'cleaning', 'water-delivery', 'grocery-shopping', 'food-delivery', 'errand-running', 'plumbing', 'electrical', 'carpentry', 'babysitting', 'gardening', 'petcare', 'moving', 'other']
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  location: {
    address: String,
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in-progress', 'completion-requested', 'completed', 'cancelled', 'disputed'],
    default: 'open'
  },
  assignedVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  estimatedHours: Number,
  
  // Enhanced Rating System
  ratings: [ratingSchema],
  
  // For quick access to average ratings
  averageRating: {
    employer: { type: Number, default: 0 },
    vendor: { type: Number, default: 0 }
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  
  completedAt: Date,
  completionRequestedAt: Date,
  completionExpiresAt: Date,
  completionRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completionDecision: {
    type: String,
    enum: ['pending', 'approved', 'auto-approved', 'disputed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for location-based queries
taskSchema.index({ location: '2dsphere' });

// Calculate average ratings when a new rating is added
taskSchema.methods.calculateAverageRatings = function() {
  const employerRatings = this.ratings.filter(r => r.role === 'employer');
  const vendorRatings = this.ratings.filter(r => r.role === 'vendor');
  
  this.averageRating.employer = employerRatings.length > 0 
    ? employerRatings.reduce((sum, r) => sum + r.rating, 0) / employerRatings.length 
    : 0;
    
  this.averageRating.vendor = vendorRatings.length > 0 
    ? vendorRatings.reduce((sum, r) => sum + r.rating, 0) / vendorRatings.length 
    : 0;
};

module.exports = mongoose.model('Task', taskSchema);
