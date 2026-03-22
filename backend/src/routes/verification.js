const express = require('express');
const {
    submitVerification,
    getVerificationStatus,
    getPendingVerifications,
    reviewVerification,
    getVerifiedVendors,
    getVendorProfile
} = require('../controllers/verificationController');
const auth = require('../middleware/auth');

const router = express.Router();

//Vendor routes
router.post('/submit', auth, submitVerification);
router.get('/status', auth, getVerificationStatus);

//Public routes
router.get('/vendors/verified', getVerifiedVendors);
router.get('/vendors/:id', getVendorProfile);

//Admin routes
router.get('/admin/verifications/pending', auth, getPendingVerifications);
router.put('/admin/verifications/:userId/review', auth, reviewVerification);

module.exports = router;
