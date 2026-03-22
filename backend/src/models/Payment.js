const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: 'KES'
  },
  // M-Pesa specific fields
  mpesaRequest: {
    checkoutRequestID: String,
    merchantRequestID: String,
    customerMessage: String,
    responseCode: String,
    responseDescription: String
  },
  mpesaCallback: {
    resultCode: String,
    resultDesc: String,
    mpesaReceiptNumber: String,
    transactionDate: String,
    phoneNumber: String,
    amount: Number
  },

//Cash payment specific fields

  cashPayment: {
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    confirmedAt: Date
  },

  status: {
    type: String,
    enum: ['pending', 'initiated', 'completed', 'failed', 'cancelled', 'confirmed'],
    default: 'pending'
  },
  
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'card', 'cash'],
    default: 'mpesa'
  },
  // For platform fees
  platformFee: {
    type: Number,
    default: 0
  },
  vendorAmount: {
    type: Number,
    required: true
  },
  paidAt: Date,
  failedAt: Date
}, {
  timestamps: true
});

// Index for faster queries
paymentSchema.index({ task: 1 });
paymentSchema.index({ employer: 1 });
paymentSchema.index({ vendor: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ 'mpesaCallback.mpesaReceiptNumber': 1 });

module.exports = mongoose.model('Payment', paymentSchema);