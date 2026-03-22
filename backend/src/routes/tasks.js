const express = require('express');
const {
    createTask,
    getTasks,
    getTask,
    updateTask,
    assignTask,
    updateTaskStatus,
    getMyTasks,
    getTaskParticipants,
    getTaskPaymentStatus
} = require('../controllers/taskController');
const auth = require('../middleware/auth');

const router = express.Router();

//All routes are protected
router.use(auth);

//Task CRUD operations
router.post('/', createTask);
router.get('/', getTasks);
router.get('/user/my-tasks', getMyTasks);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.put('/:id/assign', assignTask);
router.put('/:id/status', updateTaskStatus);
router.get('/:id/participants', getTaskParticipants);
router.get('/:id/payment-status', getTaskPaymentStatus);

//Task actions
router.patch('/:id/assign', assignTask);
router.patch('/:id/status', updateTaskStatus);

module.exports = router;