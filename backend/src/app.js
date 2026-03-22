const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const configuredOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.CLIENT_URLS || '').split(',').map((origin) => origin.trim()).filter(Boolean)
];

const allowedOrigins = Array.from(new Set([
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    ...configuredOrigins
]));


//Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const ratingRoutes = require('./routes/ratings');
const verificationRoutes = require('./routes/verification');
const chatRoutes = require('./routes/chat');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const disputeRoutes = require('./routes/disputes');
const notificationRoutes = require('./routes/notifications');
const exportRoutes = require('./routes/export')
const socketAuth = require('./middleware/socketAuth');
const Conversation = require('./models/Conversation');


// Debug: Check if routes are loaded
// console.log('Auth Routes:', authRoutes);
// console.log('Task Routes:', taskRoutes);
// console.log('Rating Routes:', ratingRoutes);

const app = express();
const server = createServer(app);

//Socket.io setup for real-time chat
const io = new Server(server, {
    cors: {
        origin: function(origin, callback) {


            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST'],
        credentials: true
    },
    path: '/socket.io/'
});
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({
    origin: function(origin, callback) {
        // List of allowed origins


        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
io.use(socketAuth);

//Log all incoming requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

//Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api', ratingRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/export', exportRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.userId, socket.id);

    // Join user to their personal room for notifications (use template literal)
    socket.join(`user_${socket.userId}`);
    io.emit('user_online', { userId: socket.userId });

  // Join conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${socket.id} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
    console.log(`User ${socket.id} left conversation ${conversationId}`);
  });

  // Send message
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, senderId, content, messageType = 'text', fileUrl } = data;

      // Here you would typically:
      // 1. Validate the sender has permission
      // 2. Save message to database
      // 3. Update conversation
      // 4. Emit to other participants

      // For now, we'll broadcast to the conversation room
      socket.to(conversationId).emit('receive_message', {
        conversationId,
        senderId,
        content,
        messageType,
        fileUrl,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // Typing indicators
  socket.on('typing_start', (data) => {
    socket.to(data.conversationId).emit('user_typing', {
      userId: data.userId,
      isTyping: true
    });
  });

  socket.on('typing_stop', (data) => {
    socket.to(data.conversationId).emit('user_typing', {
      userId: data.userId,
      isTyping: false
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    io.emit('user_offline', { userId: socket.userId });
  });
});

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        message: 'ERRANDS API is running!',
        timestamp: new Date().toISOString(), 
        status: 'OK',
        routes: {
            auth: {
                'POST /register': 'Register a new user',
                'POST /login': 'Login user',
                'GET /profile': 'Get user profile (protected)',
                'GET /me': 'Get current user info (protected)',
                'POST /tasks': 'Create a new task (protected)',
                'GET /tasks': 'Get all tasks (protected)',
                'GET /tasks/user/my-tasks': 'Get my tasks (protected)',
                'GET /tasks/:id': 'Get task by ID (protected)',
                'POST /tasks/:id/rate': 'Rate a user for a task (protected)',
                'GET /users/:id/ratings': 'Get all ratings for a user (protected)',
                'GET /users/ratings/summary': 'Get rating summary for a user (protected)',
                'PUT /tasks/:id': 'Update a task (protected)',
                'PATCH /tasks/:id/assign': 'Assign a task to a vendor (protected)',
                'PATCH /tasks/:id/status': 'Update task status (protected)'
            }
        }
    });
});


app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

//Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!', error: process.env.NODE_ENV === 'development' ? err.message : {} });
});

//404 handler
app.use((req, res) => {
    console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: [
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/profile',
            'GET /api/health',
            'GET /api/auth/me',
            'POST /api/tasks',
            'GET /api/tasks',
            'GET /api/tasks/user/my-tasks',
            'GET /api/tasks/:id',
            'POST /api/tasks/:id/rate',
            'GET /api/users/:id/ratings',
            'GET /api/users/ratings/summary',
            'PUT /api/tasks/:id',
            'PATCH /api/tasks/:id/assign',
            'PATCH /api/tasks/:id/status'
        ]
     });
});

const PORT = process.env.PORT || 5000;

//Database connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/errands')
    .then(async () => {
        console.log('Connected to MongoDB');
        // Ensure conversation indexes support non-task (direct) chats
        try {
            const indexes = await Conversation.collection.indexes();
            const taskIndex = indexes.find((idx) => idx.name === 'task_1');
            if (taskIndex && taskIndex.unique && !taskIndex.partialFilterExpression && !taskIndex.sparse) {
                await Conversation.collection.dropIndex('task_1');
            }
            await Conversation.collection.createIndex(
                { task: 1 },
                { unique: true, partialFilterExpression: { task: { $exists: true } } }
            );
        } catch (err) {
            console.warn('Conversation index check failed:', err.message || err);
        }
        // Start the HTTP server created with `createServer(app)` so socket.io is attached correctly
        server.listen(PORT, () => {
            console.log(`ERRANDS Server is running on port ${PORT}`);
            console.log(`Health check available at http://localhost:${PORT}/api/health`);
            console.log('Socket.io server running');
            console.log('Available routes:');
            console.log('POST /api/auth/register');
            console.log('POST /api/auth/login');
            console.log('GET /api/auth/me');
            console.log('Tasks:');
            console.log('POST /api/tasks');
            console.log('GET /api/tasks');
            console.log('GET /api/tasks/user/my-tasks');
            console.log('GET /api/tasks/:id');
        });
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    });

module.exports = { app, server, io };
