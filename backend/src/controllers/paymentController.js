const Payment = require('../models/Payment');
const Task = require('../models/Task');
const User = require('../models/User');
const mpesaService = require('../utils/mpesaUtils');
const { areObjectIdsEqual } = require('../utils/objectIdUtils');

// @desc    Initiate M-Pesa payment for a task
// @route   POST /api/payments/mpesa/stk-push
// @access  Private (Employer only)
const initiateMpesaPayment = async (req, res) => {
  try {
    const { taskId, phoneNumber } = req.body;
    const employerId = req.userId;

    console.log('Initiating M-Pesa payment:', { taskId, employerId, phoneNumber });

    // Find the task
    const task = await Task.findById(taskId)
      .populate('employer', 'name phone')
      .populate('assignedVendor', 'name vendorProfile');

    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Verify task is completed
    if (task.status !== 'completed') {
      return res.status(400).json({
        message: 'Payment can only be initiated for completed tasks'
      });
    }

    // Verify user is the employer
    if (!areObjectIdsEqual(task.employer._id, employerId)) {
      return res.status(403).json({
        message: 'Only the employer can initiate payment for this task'
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ task: taskId, status: { $in: ['pending', 'initiated', 'completed'] } });
    if (existingPayment) {
      return res.status(400).json({
        message: 'Payment already exists for this task',
        paymentId: existingPayment._id
      });
    }

    const amount = task.budget;
    
    // Calculate platform fee (5% for example)
    const platformFee = amount * 0.05;
    const vendorAmount = amount - platformFee;

    // Create payment record
    const payment = await Payment.create({
      task: taskId,
      employer: employerId,
      vendor: task.assignedVendor._id,
      amount: amount,
      platformFee: platformFee,
      vendorAmount: vendorAmount,
      status: 'initiated'
    });

    // Initiate M-Pesa STK Push
    const mpesaResponse = await mpesaService.initiateSTKPush(
      phoneNumber,
      amount,
      `ERRANDS-${task._id.toString().slice(-6)}`, // Account reference
      `Payment for task: ${task.title}` // Transaction description
    );

    // Update payment with M-Pesa response
    payment.mpesaRequest = {
      checkoutRequestID: mpesaResponse.CheckoutRequestID,
      merchantRequestID: mpesaResponse.MerchantRequestID,
      customerMessage: mpesaResponse.CustomerMessage,
      responseCode: mpesaResponse.ResponseCode,
      responseDescription: mpesaResponse.ResponseDescription
    };

    payment.status = mpesaResponse.ResponseCode === '0' ? 'initiated' : 'failed';
    
    await payment.save();

    res.json({
      message: 'M-Pesa payment initiated successfully',
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        mpesaResponse: {
          customerMessage: mpesaResponse.CustomerMessage,
          checkoutRequestID: mpesaResponse.CheckoutRequestID
        }
      }
    });
  } catch (error) {
    console.error('Initiate M-Pesa payment error:', error);
    res.status(500).json({
      message: 'Error initiating M-Pesa payment',
      error: error.message
    });
  }
};

// @desc    Handle M-Pesa callback
// @route   POST /api/payments/mpesa/callback
// @access  Public (Called by Safaricom)
const handleMpesaCallback = async (req, res) => {
  try {
    const callbackData = req.body;

    console.log('M-Pesa callback received:', JSON.stringify(callbackData, null, 2));

    // Safaricom sends the data in a specific format
    const stkCallback = callbackData.Body.stkCallback;
    
    if (!stkCallback) {
      console.error('Invalid M-Pesa callback format');
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback format' });
    }

    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    // Find payment by checkoutRequestID
    const payment = await Payment.findOne({ 'mpesaRequest.checkoutRequestID': checkoutRequestID })
      .populate('task')
      .populate('vendor');

    if (!payment) {
      console.error('Payment not found for checkoutRequestID:', checkoutRequestID);
      return res.status(404).json({ ResultCode: 1, ResultDesc: 'Payment not found' });
    }

    if (resultCode === 0) {
      // Payment successful
      const callbackMetadata = stkCallback.CallbackMetadata;
      if (callbackMetadata && callbackMetadata.Item) {
        const items = callbackMetadata.Item;
        
        const mpesaReceiptNumber = items.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
        const transactionDate = items.find(item => item.Name === 'TransactionDate')?.Value;
        const phoneNumber = items.find(item => item.Name === 'PhoneNumber')?.Value;
        const amount = items.find(item => item.Name === 'Amount')?.Value;

        payment.mpesaCallback = {
          resultCode,
          resultDesc,
          mpesaReceiptNumber,
          transactionDate,
          phoneNumber,
          amount
        };

        payment.status = 'completed';
        payment.paidAt = new Date();

        // Update task payment status
        await Task.findByIdAndUpdate(payment.task._id, { 
          $set: { 'paymentStatus': 'paid' } 
        });

        console.log(`Payment completed for task ${payment.task._id}, receipt: ${mpesaReceiptNumber}`);

        // Here you could:
        // 1. Send notification to vendor
        // 2. Update vendor's balance
        // 3. Trigger payout to vendor

      }
    } else {
      // Payment failed
      payment.mpesaCallback = {
        resultCode,
        resultDesc
      };
      payment.status = 'failed';
      payment.failedAt = new Date();
    }

    await payment.save();

    // Always return success to Safaricom
    res.json({ ResultCode: 0, ResultDesc: 'Callback processed successfully' });

  } catch (error) {
    console.error('M-Pesa callback processing error:', error);
    // Still return success to Safaricom to prevent retries
    res.json({ ResultCode: 0, ResultDesc: 'Callback processing attempted' });
  }
};

// @desc    Create cash payment record (for employer initiating cash payment)
// @route   POST /api/payments/cash/create
// @access  Private (Employer only)

const createCashPayment = async (req, res) => {
  try {
    const { taskId, amount, notes } = req.body;
    const employerId = req.userId;

    console.log('Creating cash payment record:', { taskId, employerId, amount });

    // Find the task
    const task = await Task.findById(taskId)
      .populate('employer', 'name phone')
      .populate('assignedVendor', 'name vendorProfile');

    if (!task) {
        return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Verify user is the employer
    if (!areObjectIdsEqual(task.employer._id, employerId)) {
      return res.status(403).json({
        message: 'Only the employer can create cash payment for this task'
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ task: taskId, status: { $in: ['pending', 'initiated', 'completed', 'confirmed'] } });
    if (existingPayment) {
        return res.status(400).json({
        message: 'Payment already exists for this task',
        paymentId: existingPayment._id
      });
    }

    // Use task budget if amount not provided
    const paymentAmount = amount || task.budget;

    // Calculate platform fee (5% for example)
    const platformFee = paymentAmount * 0.05;
    const vendorAmount = paymentAmount - platformFee;

    // Create payment record
    const payment = await Payment.create({
      task: taskId,
        employer: employerId,
        vendor: task.assignedVendor._id,
        amount: paymentAmount,
        platformFee: platformFee,
        vendorAmount: vendorAmount,
        paymentMethod: 'cash',
        status: 'pending',
        cashPayment: {
            notes: notes
        }
    });

    await payment.populate('task', 'title status');
    await payment.populate('employer', 'name');
    await payment.populate('vendor', 'name');

    res.status(201).json({
        message: 'Cash payment record created successfully. Vendor to confirm upon receipt.',
        payment: {
        id: payment._id,
        amount: payment.amount,
        vendorAmount: payment.vendorAmount,
        platformFee: payment.platformFee,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        task: payment.task,
        employer: payment.employer,
        vendor: payment.vendor
      }
    });
  } catch (error) {
    console.error('Create cash payment error:', error);
    res.status(500).json({
        message: 'Error creating cash payment record',
        error: error.message
    });
  }
};

// @desc    Vendor confirms cash payment receipt
// @route   PATCH /api/payments/cash/:paymentId/confirm
// @access  Private (Vendor only)

const confirmCashPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const vendorId = req.userId;

    console.log('Vendor confirming cash payment:', { paymentId, vendorId });

    // Find the payment
    const payment = await Payment.findById(paymentId)
      .populate('task', 'title status')
      .populate('vendor', 'name');

    if (!payment) {
      return res.status(404).json({
        message: 'Payment not found'
      });
    }

    // Verify payment method is cash
    if (payment.paymentMethod !== 'cash') {
      return res.status(400).json({
        message: 'This payment is not a cash payment'
      });
    }

    // Verify user is the vendor
    if (!areObjectIdsEqual(payment.vendor._id, vendorId)) {
      return res.status(403).json({
        message: 'Only the assigned vendor can confirm this cash payment'
      });
    }

    // Verify payment is still pending
    if (payment.status !== 'pending') {
      return res.status(400).json({
        message: 'Payment is not in a confirmable state'
      });
    }

    // Update payment as confirmed
    payment.status = 'confirmed';
    payment.paidAt = new Date();
    payment.cashPayment = {
        confirmedBy: vendorId,
        confirmedAt: new Date(),
        notes: notes || payment.cashPayment?.notes
    };

    // Update task payment status
    await Task.findByIdAndUpdate(payment.task._id, { 
      $set: { 'paymentStatus': 'paid' } 
    });

    await payment.save();

    //Populate for response
    await payment.populate('employer', 'name');
    await payment.populate('vendor', 'name');

    // Additional functionality:
    // 1. Send notification to employer
    // 2. Update vendor's balance
    // 3. Trigger post-payment actions

   res.json({
      message: 'Cash payment confirmed successfully',
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt,
        paymentMethod: payment.paymentMethod,
        task: payment.task,
        employer: payment.employer,
        vendor: payment.vendor,
        cashPayment: payment.cashPayment
      }
    });
  } catch (error) { 
    console.error('Confirm cash payment error:', error);
    res.status(500).json({
      message: 'Error confirming cash payment',
        error: error.message
    });
  }
};

// @desc    Check payment status
// @route   GET /api/payments/:paymentId/status
// @access  Private
const checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.userId;

    const payment = await Payment.findById(paymentId)
      .populate('task', 'title status')
      .populate('employer', 'name')
      .populate('vendor', 'name');

    if (!payment) {
      return res.status(404).json({
        message: 'Payment not found'
      });
    }

    // Check if user is authorized (employer or vendor for this payment)
    const isAuthorized = areObjectIdsEqual(payment.employer._id, userId) || 
                        areObjectIdsEqual(payment.vendor._id, userId);

    if (!isAuthorized && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Not authorized to view this payment'
      });
    }

    // If payment is initiated, check status with M-Pesa
    if (payment.status === 'initiated' && payment.mpesaRequest?.checkoutRequestID) {
      try {
        const statusResponse = await mpesaService.checkTransactionStatus(
          payment.mpesaRequest.checkoutRequestID
        );

        // Update payment status based on M-Pesa response
        if (statusResponse.ResultCode === 0) {
          payment.status = 'completed';
          await payment.save();
        }
      } catch (statusError) {
        console.error('Error checking M-Pesa status:', statusError);
        // Continue with current payment status
      }
    }

    res.json({
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        platformFee: payment.platformFee,
        vendorAmount: payment.vendorAmount,
        paidAt: payment.paidAt,
        mpesaReceipt: payment.mpesaCallback?.mpesaReceiptNumber,
        task: payment.task,
        employer: payment.employer,
        vendor: payment.vendor
      }
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      message: 'Error checking payment status',
      error: error.message
    });
  }
};

// @desc    Get payments for user
// @route   GET /api/payments/user/my-payments
// @access  Private
const getUserPayments = async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.user.role;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (userRole === 'employer') {
      filter.employer = userId;
    } else if (userRole === 'vendor') {
      filter.vendor = userId;
    }

    if (status) {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .populate('task', 'title category')
      .populate('employer', 'name')
      .populate('vendor', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    res.json({
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      },
      summary: {
        totalEarnings: userRole === 'vendor' ? await Payment.aggregate([
          { $match: { vendor: userId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$vendorAmount' } } }
        ]) : null,
        pendingPayments: await Payment.countDocuments({ ...filter, status: 'pending' })
      }
    });
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({
      message: 'Error fetching payments',
      error: error.message
    });
  }
};

// @desc    Vendor reports cash payment received
// @route   POST /api/payments/cash/vendor-report
// @access  Private (Vendor only)
const vendorReportCashPayment = async (req, res) => {
  try {
    const { taskId, amount, notes } = req.body;
    const vendorId = req.userId;

    console.log('Vendor reporting cash payment:', { taskId, vendorId, amount });

    // Find the task
    const task = await Task.findById(taskId)
      .populate('employer', 'name phone')
      .populate('assignedVendor', 'name vendorProfile');

    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Verify user is the assigned vendor
    if (!areObjectIdsEqual(task.assignedVendor._id, vendorId)) {
      return res.status(403).json({
        message: 'Only the assigned vendor can report cash payment for this task'
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ task: taskId, status: { $in: ['pending', 'initiated', 'completed', 'confirmed'] } });
    if (existingPayment) {
        return res.status(400).json({
        message: 'Payment already exists for this task',
        paymentId: existingPayment._id
      });
    }

    // Use task budget if amount not provided
    const paymentAmount = amount || task.budget;

    // Calculate platform fee (5% for example)
    const platformFee = paymentAmount * 0.05;
    const vendorAmount = paymentAmount - platformFee;

    // Create payment record
    const payment = await Payment.create({
      task: taskId,
        employer: task.employer._id,
        vendor: vendorId,
        amount: paymentAmount,
        platformFee: platformFee,
        vendorAmount: vendorAmount,
        paymentMethod: 'cash',
        status: 'confirmed',
        paidAt: new Date(),
        cashPayment: {
            confirmedBy: vendorId,
            confirmedAt: new Date(),
            notes: notes
        }
    });

    // Update task payment status
    await Task.findByIdAndUpdate(task._id, { 
      $set: { 'paymentStatus': 'paid' } 
    });

    await payment.populate('task', 'title status');
    await payment.populate('employer', 'name');
    await payment.populate('vendor', 'name');

    res.status(201).json({
        message: 'Cash payment reported and confirmed successfully.',
        payment: {
        id: payment._id,
        amount: payment.amount,
        vendorAmount: payment.vendorAmount,
        platformFee: payment.platformFee,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        task: payment.task,
        employer: payment.employer,
        vendor: payment.vendor
      }
    });
  } catch (error) {
    console.error('Vendor report cash payment error:', error);
    res.status(500).json({
        message: 'Error reporting cash payment',
        error: error.message
    });
  }
};  

module.exports = {
  initiateMpesaPayment,
  handleMpesaCallback,
  checkPaymentStatus,
  getUserPayments,
  createCashPayment,
  confirmCashPayment,
  vendorReportCashPayment
};