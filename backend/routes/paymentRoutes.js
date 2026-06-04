const express = require('express');
const router = express.Router();

const {
  createPaymentIntent,
  processPayment,
  ingestWalletTransaction,
  ingestWalletTransactionsBulk,
  getPaymentStatus,
  handleWebhook,
  requestRefund
} = require('../controllers/paymentController');
const authenticateMobileApp = require('../middleware/authenticateMobileApp');

// Payment routes
router.post('/create-intent', createPaymentIntent);
router.post('/process', processPayment);
router.post('/wallet-notifications/bulk', authenticateMobileApp, ingestWalletTransactionsBulk);
router.post('/wallet-notifications', authenticateMobileApp, ingestWalletTransaction);
router.get('/:orderId/status', getPaymentStatus);
router.post('/:orderId/refund', requestRefund);

// Stripe webhook - use raw body parser
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
