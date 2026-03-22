const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
    type: String,
    required: true,
    maxlength: 200
    },
    message: {
        type: String,
        required: true,
        maxlength: 1000
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error', 'system', 'payment', 'dispute', 'verification'],
        default: 'info'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    relatedEntity: {
        type: String,
        enum: ['user', 'task', 'payment', 'dispute', 'verification', 'system']
    },
    relatedEntityId: {
        type: mongoose.Schema.Types.ObjectId
    },
    actionUrl: String,
    isRead: {
        type: Boolean,
        default: false
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    readAt: Date,
    expiresAt: Date
    }, {
    timestamps: true
    });

    // Indexes
    notificationSchema.index({ user: 1, sentAt: -1 });
    notificationSchema.index({ isRead: 1 });
    notificationSchema.index({ isArchived: 1 });
    notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    module.exports = mongoose.model('Notification', notificationSchema);