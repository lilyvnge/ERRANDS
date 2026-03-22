const User = require('../models/User');
const jwt = require('jsonwebtoken');

//JWT Token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

//@deskription Register a new user
//@route POST /api/auth/register
//@access Public
const register = async (req, res) => {
    try {
        const { name, email, password, phone, role, vendorProfile, location } = req.body;

        //Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        //Create new user
        const user = await User.create({
            name,
            email,
            password,       //Automatically hashed by pre-save middleware
            phone,
            role: role || 'employer',
            location: location ? {
                address: location.address,
                type: 'Point',
                coordinates: Array.isArray(location.coordinates) ? location.coordinates : undefined
            } : undefined,
            vendorProfile: role === 'vendor' ? vendorProfile : undefined 
        });

        //Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'User registered successfully',
            user,
            token
        });
    } catch (error) {
        console.error('Registration error:', error);

        //Handle duplicate email error
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        //Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Validation error', errors: messages });
        }

        res.status(500).json({
            message: 'Error registering user',
            error: error.message 
        });
    } 
};
 

//@deskription Login user
//@route POST /api/auth/login
//@access Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        //Check for user and password
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        //Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ message: 'User account is deactivated' });
        }

        //Check password
        const isPasswordCorrect = await user.matchPassword(password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        //Generate token
        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            user,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Error logging in',
            error: error.message 
        });
    }
};

//@deskription Get current user profile
//@route GET /api/auth/profile
//@access Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }   

        res.json({user});
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            message: 'Error fetching user profile',
            error: error.message 
        });
    }
};

module.exports = {
    register,
    login,
    getMe
};
