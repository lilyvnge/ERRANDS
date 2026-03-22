const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address'] 
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },  
    phone: {
        type: String,
        maxlength: [15, 'Please enter a phone number']
    },
    role: {
        type: String,
        enum: ['employer', 'vendor', 'admin'],
        default: 'employer'
    },
    
//Vendor specific fields
    vendorProfile: {
        skills: [{
            type: String,
            enum: ['laundry', 'cleaning', 'delivery', 'shopping', 'plumbing', 'electrical', 'carpentry', 'babysitting', 'gardening', 'petcare', 'moving', 'other']
        }],
        description: String,
        hourlyRate: Number,
        isVerified: {
            type: Boolean,
            default: false
        },
        verificationDocuments: [{
            documentType: String,
            documentUrl: String,
            uploadedAt: Date
        }],

        // Verification system
        verification: {
            status: {
                type: String,
                enum: ['pending', 'verified', 'rejected', 'unverified'],
                default: 'unverified'
            },
            submittedAt: Date,
            reviewedAt: Date,
            reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            rejectionReason: String,
            documents: [{
                documentType: {
                    type: String,
                    enum: ['id_card', 'passport', 'driver_license', 'business_license', 'proof_of_address', 'certificate', 'selfie', 'Other']
                },
                documentUrl: String,
                uploadedAt: Date,
                status: {
                    type: String,
                    enum: ['pending', 'approved', 'rejected'],
                    default: 'pending'
                }
            }]
        },

        // Enhanced rating system
        rating: {
            average: { type: Number, default: 0 },
            count: { type: Number, default: 0 },
            breakdown: {
            '1': { type: Number, default: 0 },
            '2': { type: Number, default: 0 },
            '3': { type: Number, default: 0 },
            '4': { type: Number, default: 0 },
            '5': { type: Number, default: 0 },
            '6': { type: Number, default: 0 },
            '7': { type: Number, default: 0 },
            '8': { type: Number, default: 0 },
            '9': { type: Number, default: 0 },
            '10': { type: Number, default: 0}
        }
        },

    },

    //Location fields
    location: {
        address: String,
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere'
        }
    },

    // Add employer rating as well
    employerRating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
        breakdown: {
            '1': { type: Number, default: 0 },
            '2': { type: Number, default: 0 },
            '3': { type: Number, default: 0 },
            '4': { type: Number, default: 0 },
            '5': { type: Number, default: 0 },
            '6': { type: Number, default: 0 },
            '7': { type: Number, default: 0 },
            '8': { type: Number, default: 0 },
            '9': { type: Number, default: 0 },
            '10': { type: Number, default: 0 }
        }
    }, 

    isActive: {
    type: Boolean,
    default: true
        }
},

 {
     timestamps: true
    });

//Password hashing middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

//Password comparison method
userSchema.methods.matchPassword = async function(enteredPassword) {
    try {
    return await bcrypt.compare(enteredPassword, this.password);
    } catch (error) {
      throw new Error('Error comparing passwords');
    }
};

//Remove password from JSON output
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
