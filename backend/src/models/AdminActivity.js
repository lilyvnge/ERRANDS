const mongoose = require('mongoose');

const adminActivitySchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['user_status_update', 'user_bulk_update', 'user_created', 'user_deleted',
               'task_status_update', 'task_bulk_update', 'task_created', 'task_deleted',
               'payment_processed', 'payment_refunded', 'payment_verified', 'verification_approved', 'verification_rejected', 'verification_reviewed', 'dispute_resolved',
            'dispute_escalated', 'dispute_created', 'notification_sent', 'export_generated', 'system_settings_updated', 'login', 'logout']
    },
    resourceType: {
        type: String,
        enum: ['user', 'task', 'payment', 'verification', 'dispute', 'notification', 'system'],
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    description: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
adminActivitySchema.index({ admin: 1 });
adminActivitySchema.index({ action: 1 });
adminActivitySchema.index({ resourceType: 1 });
adminActivitySchema.index({ resourceId: 1 });
adminActivitySchema.index({ timestamp: -1 });

module.exports = mongoose.model('AdminActivity', adminActivitySchema);
