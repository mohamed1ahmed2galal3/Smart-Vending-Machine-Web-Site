const express = require('express');
const router = express.Router();

const {
  createPaymentIntent,
  processPayment,
  getPaymentStatus,
  handleWebhook,
  requestRefund
} = require('../controllers/paymentController');

// Payment routes
router.post('/create-intent', createPaymentIntent);
router.post('/process', processPayment);
router.get('/:orderId/status', getPaymentStatus);
router.post('/:orderId/refund', requestRefund);

// Stripe webhook - use raw body parser
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
