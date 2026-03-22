const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  against: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'service_not_provided',
      'poor_service_quality', 
      'payment_issue',
      'vendor_no_show',
      'employer_cancellation',
      'safety_concern',
      'harassment',
      'other'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  evidence: [{
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'audio', 'other']
    },
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'closed', 'escalated'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  // Communication between admin and parties
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    isInternal: {
      type: Boolean,
      default: false
    },
    attachments: [{
      type: String, // URL to file
      description: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Resolution details
  resolution: {
    decision: {
      type: String,
      enum: ['refund_full', 'refund_partial', 'payment_released', 'task_credited', 'warning_issued', 'account_suspended', 'no_action']
    },
    amountRefunded: Number,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    notes: String,
    feedbackToParties: String
  },
  // Timestamps for tracking
  respondedAt: Date,
  escalatedAt: Date,
  closedAt: Date,
  // Automatic escalation if no response
  lastReminderSent: Date,
  reminderCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
disputeSchema.index({ task: 1 });
disputeSchema.index({ raisedBy: 1 });
disputeSchema.index({ against: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ priority: 1 });
disputeSchema.index({ createdAt: -1 });

// Method to check if dispute can be escalated
disputeSchema.methods.canEscalate = function() {
  const hoursSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  return this.status === 'open' && hoursSinceCreation > 48 && this.reminderCount >= 2;
};

module.exports = mongoose.model('Dispute', disputeSchema);