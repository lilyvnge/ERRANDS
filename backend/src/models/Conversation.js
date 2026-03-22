const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    conversationType: {
        type: String,
        enum: ['task', 'direct'],
        default: 'task'
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    unreadCount: {
        employer: { type: Number, default: 0 },
        vendor: { type: Number, default: 0 }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

//Ensure one conversation per task
conversationSchema.index({ task: 1 }, { unique: true, partialFilterExpression: { task: { $exists: true } } });

// Index for participants queries
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

conversationSchema.methods.updateUnreadCount = function(userId, increment = true) {
    const userField = this.participants[0].toString() === userId.toString() ? 'employer' : 'vendor';

    if (increment) {
        this.unreadCount[userField] += 1;
    } else {
        this.unreadCount[userField] = 0;
    }
};

module.exports = mongoose.model('Conversation', conversationSchema);
