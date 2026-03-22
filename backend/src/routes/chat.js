const express = require('express');
const {
    getOrCreateConversation,
    getOrCreateDirectConversation,
    sendMessage,
    getMessages,
    getUserConversations
} = require('../controllers/chatController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// Conversation routes
router.get('/conversation/:taskId', getOrCreateConversation);
router.get('/direct/:userId', getOrCreateDirectConversation);
router.get('/conversation/:conversationId/messages', getMessages);
router.get('/conversations', getUserConversations);

// Message routes
router.post('/message', sendMessage);

module.exports = router;
