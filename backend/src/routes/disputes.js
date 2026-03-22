const express = require('express');
const { 
    createDispute,
    getDisputes,
    addDisputeMessage,
    resolveDispute,
    getUserDisputes
} = require('../controllers/disputeController');
const auth = require('../middleware/auth');
const { adminActivityMiddleware } = require('../middleware/adminActivityLogger');

const router = express.Router();

// User routes
router.use(auth);
router.post('/', createDispute);
router.get('/user/my-disputes', getUserDisputes);

// Admin routes
router.get('/admin/disputes', auth, (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
}, getDisputes);

router.post('/admin/disputes/:disputeId/messages', auth, (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
}, 
    adminActivityMiddleware('dispute_message_added', 'dispute', (req) => req.params.disputeId),
    addDisputeMessage
);

router.patch('/admin/disputes/:disputeId/resolve', auth, (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
},
    adminActivityMiddleware('dispute_resolved', 'dispute', (req) => req.params.disputeId),
    resolveDispute
);

module.exports = router;