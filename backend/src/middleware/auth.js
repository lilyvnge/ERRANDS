const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        let token;

        //Check for token in header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        //Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        //Get user from token
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'Token is not valid' });
        }

        //Add user to request
        req.userId = user._id;
        req.user = user;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

module.exports = auth;

