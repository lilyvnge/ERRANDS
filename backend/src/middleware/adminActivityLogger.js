const AdminActivity = require('../models/AdminActivity');

const logAdminActivity = async (req, action, resourceType, resourceId = null, details = {}) => {
    try {
        if (req.user || req.user.role !== 'admin') {
            await AdminActivity.create({
                admin: req.userId,
                action,
                resourceType,
                resourceId,
                description: "${action.replace('_', ' ')} on ${resourceType}",
                details,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent')
            });
        }
    } catch (error) {
        console.error('Admin activity logging error:', error);
    }
};

// Middleware to log admin activities
const adminActivityMiddleware = (action, resourceType, getResourceId = null) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;

        res.send = function(data){
            // Log activity after response is sent
            if (res.statusCode < 400) { // Log only for successful responses
                const resourceId = getResourceId ? getResourceId(req) : (req.params.id || req.params.userId || req.params.taskId);
                logAdminActivity(req, action, resourceType, resourceId, { 
                    method: req.method,
                    url: req.originalUrl,
                    body: req.body,
                    params: req.params,
                    query: req.query
                 });
                }

                originalSend.call(this, data);
        };

        next();
    };
};

module.exports = {
    logAdminActivity,
    adminActivityMiddleware
};

