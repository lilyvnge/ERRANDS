const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Task = require('../models/Task');
const User = require('../models/User');
const { areObjectIdsEqual, isUserAuthorizedForTask } = require('../utils/objectIdUtils');

// @desc    Get or create conversation for a task
// @route   GET /api/chat/conversation/:taskId
// @access  Private
const getOrCreateConversation = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;

    console.log('=== CHAT DEBUG START ===');
    console.log('Request details:', { taskId, userId });
    console.log('User from request:', req.user);

    // Find the task
    const task = await Task.findById(taskId)
      .populate('employer', 'name')
      .populate('assignedVendor', 'name');

    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    console.log('✅ Task found:', {
      taskId: task._id.toString(),
      employerId: task.employer?._id?.toString(),
      employerName: task.employer?.name,
      assignedVendorId: task.assignedVendor?._id?.toString(),
      assignedVendorName: task.assignedVendor?.name,
      taskStatus: task.status
    });

      // Debug: Check if user is part of the task
      const isEmployer = task.employer && areObjectIdsEqual(task.employer._id, userId);
      const isVendor = task.assignedVendor && areObjectIdsEqual(task.assignedVendor._id, userId);

      console.log('🔍 Authorization check:', {
        currentUserId: userId.toString(),
        taskEmployerId: task.employer?._id?.toString(),
        taskVendorId: task.assignedVendor?._id?.toString(),
        isEmployer,
        isVendor
      });

      if (!isEmployer && !isVendor) {
        console.log('❌ User NOT authorized for this conversation');
        console.log('=== CHAT DEBUG END ===');
        return res.status(403).json({
          message: 'Not authorized to access this conversation',
          debug: {
            currentUser: userId.toString(),
            taskEmployer: task.employer?._id?.toString(),
            taskVendor: task.assignedVendor?._id?.toString(),
            isEmployer,
            isVendor
          }
        });
      }

      console.log('✅ User authorized for conversation');

      // Check if vendor is assigned
      if (!task.assignedVendor) {
        console.log('❌ No vendor assigned to task');
        console.log('=== CHAT DEBUG END ===');
        return res.status(400).json({
          message: 'No vendor assigned to this task yet'
        });
      }

    // Find or create conversation
    let conversation = await Conversation.findOne({ task: taskId })
      .populate('participants', 'name role vendorProfile')
      .populate('lastMessage');

    if (!task.assignedVendor) {
      return res.status(400).json({
        message: 'No vendor assigned to this task yet'
      });
    }

    if (!conversation) {
    conversation = await Conversation.create({
      participants: [task.employer._id, task.assignedVendor],
      task: taskId,
      conversationType: 'task'
    });

    await conversation.populate('participants', 'name role vendorProfile');
    
    console.log('✅  New Conversation created:', conversation._id.toString());
    } else {
      console.log('✅ Existing Conversation found:', conversation._id.toString());
    }

    // Mark messages as read for this user
    await Message.updateMany(
      {
        conversation: conversation._id,
        receiver: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // Reset unread count for this user
    conversation.updateUnreadCount(userId, false);
    await conversation.save();

    res.json({
      conversation,
      task: {
        id: task._id,
        title: task.title,
        status: task.status
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      message: 'Error fetching conversation',
      error: error.message
    });
  }
};

// @desc    Get or create direct conversation (non-task)
// @route   GET /api/chat/direct/:userId
// @access  Private (Admin only)
const getOrCreateDirectConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { userId: otherUserId } = req.params;

    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to start direct conversations' });
    }
    if (!otherUserId || otherUserId === userId.toString()) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    const otherUser = await User.findById(otherUserId).select('_id name role');
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let conversation = await Conversation.findOne({
      conversationType: 'direct',
      participants: { $all: [userId, otherUserId] },
      $expr: { $eq: [{ $size: '$participants' }, 2] }
    })
      .populate('participants', 'name role vendorProfile')
      .populate('lastMessage');

    if (!conversation) {
      const orderedParticipants = [userId, otherUserId]
        .map((id) => id.toString())
        .sort()
        .map((id) => id);
      conversation = await Conversation.create({
        participants: orderedParticipants,
        conversationType: 'direct'
      });
      await conversation.populate('participants', 'name role vendorProfile');
    }

    await Message.updateMany(
      {
        conversation: conversation._id,
        receiver: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    conversation.updateUnreadCount(userId, false);
    await conversation.save();

    res.json({
      conversation
    });
  } catch (error) {
    console.error('Get direct conversation error:', error);
    res.status(500).json({
      message: 'Error fetching conversation',
      error: error.message
    });
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/conversation/:conversationId/messages
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Check if user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found'
      });
    }

    if (!conversation.participants.includes(req.userId)) {
      return res.status(403).json({
        message: 'Not authorized to access these messages'
      });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name role')
      .populate('receiver', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Message.countDocuments({ conversation: conversationId });

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: req.userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // Reset unread count
    conversation.updateUnreadCount(req.userId, false);
    await conversation.save();

    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      message: 'Error fetching messages',
      error: error.message
    });
  }
};

// @desc    Get user's conversations
// @route   GET /api/chat/conversations
// @access  Private
const getUserConversations = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.userId;

    const conversations = await Conversation.find({
      participants: req.userId,
      isActive: true
    })
    .populate('participants', 'name role vendorProfile')
    .populate('task', 'title status')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Conversation.countDocuments({
      participants: req.userId,
      isActive: true
    });

    const withUnread = conversations.map((conv) => {
      const convObj = conv.toObject();
      let unreadForUser = 0;
      if (convObj.conversationType === 'direct') {
        const p0 = convObj.participants?.[0]?._id?.toString?.();
        const p1 = convObj.participants?.[1]?._id?.toString?.();
        if (p0 && p0 === userId.toString()) unreadForUser = convObj.unreadCount?.employer || 0;
        else if (p1 && p1 === userId.toString()) unreadForUser = convObj.unreadCount?.vendor || 0;
      } else if (req.user?.role === 'employer') {
        unreadForUser = convObj.unreadCount?.employer || 0;
      } else if (req.user?.role === 'vendor') {
        unreadForUser = convObj.unreadCount?.vendor || 0;
      } else {
        const p0 = convObj.participants?.[0]?._id?.toString?.();
        if (p0 && p0 === userId.toString()) unreadForUser = convObj.unreadCount?.employer || 0;
        else unreadForUser = convObj.unreadCount?.vendor || 0;
      }
      return { ...convObj, unreadCountForUser: unreadForUser };
    });

    res.json({
      conversations: withUnread,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      message: 'Error fetching conversations',
      error: error.message
    });
  }
};

// @desc    Send a message (REST endpoint for fallback)
// @route   POST /api/chat/message
// @access  Private
// @desc    Send a message (REST endpoint for fallback)
// @route   POST /api/chat/message
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, messageType = 'text', fileUrl } = req.body;
    const senderId = req.userId;

    console.log('=== SEND MESSAGE DEBUG START ===');
    console.log('Message details:', { conversationId, senderId, content });

    // Find conversation
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name role _id');

    if (!conversation) {
      console.log('❌ Conversation not found');
      return res.status(404).json({
        message: 'Conversation not found'
      });
    }

    console.log('✅ Conversation found:', {
      conversationId: conversation._id.toString(),
      participants: conversation.participants.map(p => ({
        id: p._id.toString(),
        name: p.name,
        role: p.role
      }))
    });

    // Check if user is authorized to send messages in this conversation
    const isParticipant = conversation.participants.some(
      p => p._id.toString() === senderId.toString()
    );

    console.log('🔍 Authorization check:', {
      senderId: senderId.toString(),
      participantIds: conversation.participants.map(p => p._id.toString()),
      isParticipant
    });

    if (!isParticipant) {
      console.log('❌ User NOT authorized to send messages in this conversation');
      console.log('=== SEND MESSAGE DEBUG END ===');
      return res.status(403).json({
        message: 'Not authorized to send messages in this conversation',
        debug: {
          senderId: senderId.toString(),
          participantIds: conversation.participants.map(p => p._id.toString())
        }
      });
    }

    console.log('✅ User authorized to send message');

    // Find receiver (the other participant)
    const receiver = conversation.participants.find(
      p => p._id.toString() !== senderId.toString()
    );

    if (!receiver) {
      console.log('❌ No receiver found');
      console.log('=== SEND MESSAGE DEBUG END ===');
      return res.status(400).json({
        message: 'No receiver found for this conversation'
      });
    }

    console.log('✅ Receiver found:', {
      receiverId: receiver._id.toString(),
      receiverName: receiver.name
    });

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      receiver: receiver._id,
      content,
      messageType,
      fileUrl
    });

    console.log('✅ Message created:', message._id.toString());

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    conversation.updateUnreadCount(receiver._id, true);
    await conversation.save();

    console.log('✅ Conversation updated');

    // Populate message for response
    await message.populate('sender', 'name role');
    await message.populate('receiver', 'name role');

    console.log('✅ Message populated');
    console.log('=== SEND MESSAGE DEBUG END ===');

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: message
    });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({
      message: 'Error sending message',
      error: error.message
    });
  }
};

module.exports = {
  getOrCreateConversation,
  getOrCreateDirectConversation,
  getMessages,
  getUserConversations,
  sendMessage
};
