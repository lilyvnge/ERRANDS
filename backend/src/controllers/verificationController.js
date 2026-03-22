const User = require('../models/User');
const { areObjectIdsEqual } = require('../utils/objectIdUtils');

// @desc    Submit verification documents
// @route   POST /api/verification/submit
// @access  Private (Vendor only)
const submitVerification = async (req, res) => {
  try {
    const { documents } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        message: 'Only vendors can submit verification documents'
      });
    }

    // Validate documents
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        message: 'At least one document is required for verification'
      });
    }

    // Update verification status and documents
    user.vendorProfile.verification = {
      status: 'pending',
      submittedAt: new Date(),
      documents: documents.map(doc => ({
        documentType: doc.documentType,
        documentUrl: doc.documentUrl,
        uploadedAt: new Date(),
        status: 'pending'
      }))
    };

    await user.save();

    res.json({
      message: 'Verification documents submitted successfully',
      verification: user.vendorProfile.verification
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({
      message: 'Error submitting verification documents',
      error: error.message
    });
  }
};

// @desc    Get verification status
// @route   GET /api/verification/status
// @access  Private (Vendor only)
const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        message: 'Only vendors can check verification status'
      });
    }

    res.json({
      verification: user.vendorProfile.verification
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      message: 'Error fetching verification status',
      error: error.message
    });
  }
};

// @desc    Admin: Get all pending verifications
// @route   GET /api/admin/verifications/pending
// @access  Private (Admin only)
const getPendingVerifications = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only admins can access verification requests'
      });
    }

    const pendingVerifications = await User.find({
      role: 'vendor',
      'vendorProfile.verification.status': 'pending'
    })
    .select('name email phone vendorProfile.verification createdAt')
    .sort({ 'vendorProfile.verification.submittedAt': 1 });

    res.json({
      verifications: pendingVerifications,
      count: pendingVerifications.length
    });
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({
      message: 'Error fetching pending verifications',
      error: error.message
    });
  }
};

// @desc    Admin: Review verification
// @route   PUT /api/admin/verifications/:userId/review
// @access  Private (Admin only)
const reviewVerification = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const { userId } = req.params;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only admins can review verifications'
      });
    }

    const vendor = await User.findById(userId);
    
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({
        message: 'Vendor not found'
      });
    }

    if (vendor.vendorProfile.verification.status !== 'pending') {
      return res.status(400).json({
        message: 'Verification is not in pending status'
      });
    }

    // Update verification status
    vendor.vendorProfile.verification.status = status;
    vendor.vendorProfile.verification.reviewedAt = new Date();
    vendor.vendorProfile.verification.reviewedBy = req.userId;
    
    if (status === 'rejected' && rejectionReason) {
      vendor.vendorProfile.verification.rejectionReason = rejectionReason;
    }

    // Update vendor's overall verification status
    vendor.vendorProfile.isVerified = status === 'verified';

    await vendor.save();

    res.json({
      message: `Verification ${status} successfully`,
      verification: vendor.vendorProfile.verification
    });
  } catch (error) {
    console.error('Review verification error:', error);
    res.status(500).json({
      message: 'Error reviewing verification',
      error: error.message
    });
  }
};

// @desc    Get verified vendors (optional skill + proximity filter)
// @route   GET /api/vendors/verified
// @access  Public
const getVerifiedVendors = async (req, res) => {
  try {
    const { category, page = 1, limit = 10, latitude, longitude, maxDistance } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      role: 'vendor',
      'vendorProfile.verification.status': 'verified',
      'vendorProfile.isVerified': true
    };

    if (category) {
      filter['vendorProfile.skills'] = category;
    }

    // Proximity filter if coordinates + distance (km) provided
    if (latitude && longitude && maxDistance) {
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance) * 1000 // meters
        }
      };
    }

    const vendors = await User.find(filter)
      .select('name email phone vendorProfile rating location createdAt')
      .sort({ 'vendorProfile.rating.average': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      vendors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get verified vendors error:', error);
    res.status(500).json({
      message: 'Error fetching verified vendors',
      error: error.message
    });
  }
};

// @desc    Get a single vendor profile (public)
// @route   GET /api/vendors/:id
// @access  Public
const getVendorProfile = async (req, res) => {
  try {
    const vendor = await User.findOne({
      _id: req.params.id,
      role: 'vendor'
    }).select('name email phone vendorProfile rating employerRating location createdAt');

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json({ vendor });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({
      message: 'Error fetching vendor profile',
      error: error.message
    });
  }
};

module.exports = {
  submitVerification,
  getVerificationStatus,
  getPendingVerifications,
  reviewVerification,
  getVerifiedVendors,
  getVendorProfile
};
