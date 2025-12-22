const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Initialize Stripe (conditionally based on environment)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

/**
 * @desc    Create payment intent
 * @route   POST /api/v1/payments/create-intent
 * @access  Public
 */
exports.createPaymentIntent = asyncHandler(async (req, res, next) => {
  const { orderId, paymentMethod } = req.body;

  if (!orderId) {
    return next(new ErrorResponse('Order ID is required', 400));
  }

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  if (order.paymentStatus === 'paid') {
    return next(new ErrorResponse('Order already paid', 400));
  }

  // Amount in cents for Stripe
  const amount = Math.round(order.total * 100);

  // For development/testing without Stripe
  if (!stripe) {
    // Create mock payment intent for testing
    const mockPaymentIntent = {
      id: `pi_mock_${Date.now()}`,
      client_secret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
      amount,
      currency: 'usd'
    };

    return res.status(200).json({
      success: true,
      data: {
        clientSecret: mockPaymentIntent.client_secret,
        paymentIntentId: mockPaymentIntent.id,
        amount,
        currency: 'usd'
      }
    });
  }

  // Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber
    }
  });

  res.status(200).json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency: 'usd'
    }
  });
});

/**
 * @desc    Process payment (confirm payment and update order)
 * @route   POST /api/v1/payments/process
 * @access  Public
 */
exports.processPayment = asyncHandler(async (req, res, next) => {
  const { orderId, paymentIntentId, paymentMethod, cardDetails } = req.body;

  if (!orderId) {
    return next(new ErrorResponse('Order ID is required', 400));
  }

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  if (order.paymentStatus === 'paid') {
    return next(new ErrorResponse('Order already paid', 400));
  }

  // Create payment record
  const payment = await Payment.create({
    order: order._id,
    paymentIntentId,
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    amount: order.total,
    currency: 'USD',
    method: paymentMethod || order.paymentMethod,
    status: 'succeeded',
    cardDetails: cardDetails || {},
    paidAt: new Date()
  });

  // Update order status
  order.paymentStatus = 'paid';
  order.status = 'paid';
  order.paymentId = payment._id;
  await order.save();

  // Clear the cart after successful payment
  await Cart.findOneAndDelete({ sessionId: order.sessionId });

  res.status(200).json({
    success: true,
    message: 'Payment successful',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentStatus: 'paid',
      transactionId: payment.transactionId,
      amount: payment.amount,
      paidAt: payment.paidAt,
      pickupCode: order.pickupCode,
      pickupCodeExpiresAt: order.pickupCodeExpiresAt
    }
  });
});

/**
 * @desc    Get payment status
 * @route   GET /api/v1/payments/:orderId/status
 * @access  Public
 */
exports.getPaymentStatus = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  const payment = await Payment.findOne({ order: orderId });
  const order = await Order.findById(orderId);

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      orderId,
      paymentStatus: payment ? payment.status : order.paymentStatus,
      transactionId: payment?.transactionId,
      amount: payment?.amount || order.total,
      method: payment?.method || order.paymentMethod,
      paidAt: payment?.paidAt
    }
  });
});

/**
 * @desc    Handle Stripe webhook
 * @route   POST /api/v1/payments/webhook
 * @access  Public (Stripe)
 */
exports.handleWebhook = asyncHandler(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    // For development without Stripe
    return res.status(200).json({ received: true });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return next(new ErrorResponse(`Webhook Error: ${err.message}`, 400));
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Update order and payment status
      if (paymentIntent.metadata.orderId) {
        const order = await Order.findById(paymentIntent.metadata.orderId);
        if (order && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.status = 'paid';
          await order.save();

          // Update payment record if exists
          await Payment.findOneAndUpdate(
            { paymentIntentId: paymentIntent.id },
            { 
              status: 'succeeded',
              paidAt: new Date()
            }
          );
        }
      }
      break;

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object;
      if (failedIntent.metadata.orderId) {
        const order = await Order.findById(failedIntent.metadata.orderId);
        if (order) {
          order.paymentStatus = 'failed';
          order.status = 'failed';
          order.failureReason = failedIntent.last_payment_error?.message;
          await order.save();

          // Update payment record
          await Payment.findOneAndUpdate(
            { paymentIntentId: failedIntent.id },
            { 
              status: 'failed',
              failureCode: failedIntent.last_payment_error?.code,
              failureMessage: failedIntent.last_payment_error?.message
            }
          );
        }
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
});

/**
 * @desc    Request refund
 * @route   POST /api/v1/payments/:orderId/refund
 * @access  Public
 */
exports.requestRefund = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  const order = await Order.findById(orderId);
  const payment = await Payment.findOne({ order: orderId });

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  if (!payment || payment.status !== 'succeeded') {
    return next(new ErrorResponse('No successful payment found for this order', 400));
  }

  // For production, process refund through Stripe
  // For now, just update status
  payment.status = 'refunded';
  payment.refundedAmount = payment.amount;
  payment.refundReason = reason;
  payment.refundedAt = new Date();
  await payment.save();

  order.status = 'refunded';
  order.paymentStatus = 'refunded';
  await order.save();

  res.status(200).json({
    success: true,
    message: 'Refund processed successfully',
    data: {
      orderId: order._id,
      refundedAmount: payment.refundedAmount,
      refundedAt: payment.refundedAt
    }
  });
});
