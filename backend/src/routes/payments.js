const express = require('express');
const {
  initiateMpesaPayment,
  handleMpesaCallback,
  checkPaymentStatus,
  getUserPayments,
  createCashPayment,
  confirmCashPayment,
  vendorReportCashPayment
} = require('../controllers/paymentController');
const auth = require('../middleware/auth');

const router = express.Router();


// Protected routes
router.use(auth);

// M-Pesa payment routes
router.post('/mpesa/stk-push', initiateMpesaPayment);

// Cash payment routes
router.post('/cash/create', createCashPayment);
router.patch('/cash/:paymentId/confirm', confirmCashPayment);
router.post('/cash/vendor-report', vendorReportCashPayment);

router.get('/:paymentId/status', checkPaymentStatus);
router.get('/user/my-payments', getUserPayments);

// Public callback route (called by Safaricom)
router.post('/mpesa/callback', handleMpesaCallback);

module.exports = router;