const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const User = require('../models/User');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { normalizeEgyptianPhone } = require('../utils/phone');
const { cancelExpiredPendingOrders } = require('../utils/orderExpiry');

const WALLET_PROVIDERS = ['vodafone_cash', 'etisalat_cash', 'instapay'];

const toMoney = (value) => Math.round(Number(value) * 100) / 100;

const buildWalletIdempotencyKey = ({
  provider,
  senderPhone,
  amount,
  smsTimestamp,
  rawMessage
}) => crypto
  .createHash('sha256')
  .update([
    provider,
    senderPhone,
    toMoney(amount).toFixed(2),
    smsTimestamp ? new Date(smsTimestamp).getTime() : '',
    rawMessage || ''
  ].join('|'))
  .digest('hex');

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

  // Amount in minor units for gateway-style integrations
  const amount = Math.round(order.total * 100);

  // For development/testing without Stripe
  if (!stripe) {
    // Create mock payment intent for testing
    const mockPaymentIntent = {
      id: `pi_mock_${Date.now()}`,
      client_secret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
      amount,
      currency: 'egp'
    };

    return res.status(200).json({
      success: true,
      data: {
        clientSecret: mockPaymentIntent.client_secret,
        paymentIntentId: mockPaymentIntent.id,
        amount,
        currency: 'egp'
      }
    });
  }

  // Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'egp',
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
      currency: 'egp'
    }
  });
});

/**
 * @desc    Process payment (confirm payment and update order)
 * @route   POST /api/v1/payments/process
 * @access  Public
 */
exports.processPayment = asyncHandler(async (req, res, next) => {
  const { orderId, paymentIntentId, paymentMethod, method, cardDetails } = req.body;

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
  const resolvedMethod = paymentMethod || method || order.paymentMethod;
  const payment = await Payment.create({
    order: order._id,
    paymentIntentId,
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    amount: order.total,
    currency: 'EGP',
    method: resolvedMethod,
    provider: ['vodafone_cash', 'etisalat_cash', 'instapay'].includes(resolvedMethod)
      ? resolvedMethod
      : order.paymentProvider,
    status: 'succeeded',
    cardDetails: cardDetails || {},
    paidAt: new Date()
  });

  // Update order status. Saving in this state generates the pickup code.
  order.paymentStatus = 'paid';
  order.status = 'ready_to_dispense';
  order.amountPaid = order.total;
  order.readyAt = new Date();
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
 * @desc    Ingest wallet SMS transaction from the mobile app
 * @route   POST /api/v1/payments/wallet-notifications
 * @access  Mobile app
 */
exports.ingestWalletTransaction = asyncHandler(async (req, res, next) => {
  const {
    provider,
    senderPhone,
    senderName,
    amount,
    smsTimestamp,
    rawMessage,
    idempotencyKey
  } = req.body;

  if (!WALLET_PROVIDERS.includes(provider)) {
    return next(new ErrorResponse('Unsupported wallet provider', 400));
  }

  const normalizedPhone = normalizeEgyptianPhone(senderPhone);
  if (!normalizedPhone) {
    return next(new ErrorResponse('Sender phone is required', 400));
  }

  const paymentAmount = toMoney(amount);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return next(new ErrorResponse('A positive payment amount is required', 400));
  }

  const smsDate = smsTimestamp ? new Date(smsTimestamp) : new Date();
  if (Number.isNaN(smsDate.getTime())) {
    return next(new ErrorResponse('Invalid SMS timestamp', 400));
  }

  const dedupeKey = idempotencyKey || buildWalletIdempotencyKey({
    provider,
    senderPhone: normalizedPhone,
    amount: paymentAmount,
    smsTimestamp: smsDate,
    rawMessage
  });

  const existingPayment = await Payment.findOne({ idempotencyKey: dedupeKey });
  if (existingPayment) {
    return res.status(200).json({
      success: true,
      duplicate: true,
      message: 'Transaction was already processed',
      data: {
        paymentId: existingPayment._id,
        orderId: existingPayment.order,
        status: existingPayment.status
      }
    });
  }

  let user = await User.findOne({ phone: normalizedPhone });
  if (!user) {
    user = await User.create({
      phone: normalizedPhone,
      name: senderName
    });
  } else if (senderName && !user.name) {
    user.name = senderName;
    await user.save();
  }

  const payment = await Payment.create({
    user: user._id,
    idempotencyKey: dedupeKey,
    transactionId: `wallet_${dedupeKey.slice(0, 24)}`,
    amount: paymentAmount,
    currency: 'EGP',
    method: provider,
    provider,
    senderPhone: normalizedPhone,
    senderName,
    smsTimestamp: smsDate,
    rawMessage,
    status: 'received'
  });

  await cancelExpiredPendingOrders({
    paymentProvider: provider,
    payerPhone: normalizedPhone
  });

  const order = await Order.findOne({
    paymentProvider: provider,
    payerPhone: normalizedPhone,
    status: 'pending_payment',
    paymentDeadlineAt: { $gte: new Date() }
  }).sort({ createdAt: 1 });

  const priorBalance = toMoney(user.accountBalance || 0);

  if (!order) {
    user.accountBalance = toMoney(priorBalance + paymentAmount);
    user.balanceUpdatedAt = new Date();
    await user.save();

    payment.status = 'succeeded';
    payment.metadata = {
      reconciliation: 'credited_without_pending_order',
      priorBalance,
      newBalance: user.accountBalance
    };
    await payment.save();

    return res.status(200).json({
      success: true,
      matched: false,
      message: 'No pending order matched this transaction. Amount credited to account balance.',
      data: {
        paymentId: payment._id,
        provider,
        senderPhone: normalizedPhone,
        amount: paymentAmount,
        balanceCredited: paymentAmount,
        accountBalance: user.accountBalance
      }
    });
  }

  const availableAmount = toMoney(priorBalance + paymentAmount);

  payment.order = order._id;
  payment.status = availableAmount >= order.total ? 'succeeded' : 'partial';

  order.user = user._id;
  order.paymentId = payment._id;
  order.amountPaid = paymentAmount;

  if (availableAmount >= order.total) {
    const balanceApplied = Math.min(
      priorBalance,
      Math.max(0, toMoney(order.total - paymentAmount))
    );
    const incomingUsed = toMoney(order.total - balanceApplied);
    const balanceCredited = Math.max(0, toMoney(paymentAmount - incomingUsed));

    user.accountBalance = toMoney(availableAmount - order.total);
    user.totalSpent = toMoney((user.totalSpent || 0) + order.total);
    user.lastOrderAt = new Date();
    user.balanceUpdatedAt = new Date();
    if (!user.orderHistory.some(id => id.toString() === order._id.toString())) {
      user.orderHistory.push(order._id);
    }

    order.status = 'ready_to_dispense';
    order.paymentStatus = 'paid';
    order.balanceApplied = balanceApplied;
    order.balanceCredited = balanceCredited;
    order.readyAt = new Date();

    payment.metadata = {
      reconciliation: 'order_ready',
      priorBalance,
      balanceApplied,
      balanceCredited,
      newBalance: user.accountBalance
    };

    await user.save();
    await order.save();
    await payment.save();

    await Cart.findOneAndDelete({ sessionId: order.sessionId });

    return res.status(200).json({
      success: true,
      matched: true,
      message: balanceCredited > 0
        ? 'Payment received. Extra balance was added to the user account.'
        : 'Payment received. Order is ready to dispense.',
      data: {
        paymentId: payment._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        amountPaid: order.amountPaid,
        balanceApplied: order.balanceApplied,
        balanceCredited: order.balanceCredited,
        accountBalance: user.accountBalance,
        pickupCode: order.pickupCode,
        pickupCodeExpiresAt: order.pickupCodeExpiresAt
      }
    });
  }

  user.accountBalance = availableAmount;
  user.balanceUpdatedAt = new Date();

  order.status = 'declined';
  order.paymentStatus = 'insufficient';
  order.balanceApplied = 0;
  order.balanceCredited = paymentAmount;
  order.declinedAt = new Date();
  order.failureReason = 'Transferred amount plus account balance was insufficient';

  payment.metadata = {
    reconciliation: 'insufficient_funds',
    priorBalance,
    balanceCredited: paymentAmount,
    newBalance: user.accountBalance,
    orderTotal: order.total
  };

  await user.save();
  await order.save();
  await payment.save();

  res.status(200).json({
    success: true,
    matched: true,
    message: 'Payment was insufficient. Amount was added to account balance.',
    data: {
      paymentId: payment._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      amountPaid: order.amountPaid,
      balanceCredited: order.balanceCredited,
      accountBalance: user.accountBalance,
      shortfall: toMoney(order.total - availableAmount)
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

  await cancelExpiredPendingOrders({ _id: orderId });

  const payment = await Payment.findOne({ order: orderId });
  const order = await Order.findById(orderId);

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      orderId,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      transactionStatus: payment?.status,
      transactionId: payment?.transactionId,
      amount: payment?.amount || order.total,
      method: payment?.method || order.paymentMethod,
      paidAt: payment?.paidAt,
      pickupCode: order.status === 'ready_to_dispense' && order.paymentStatus === 'paid'
        ? order.pickupCode
        : undefined,
      pickupCodeExpiresAt: order.status === 'ready_to_dispense' && order.paymentStatus === 'paid'
        ? order.pickupCodeExpiresAt
        : undefined
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
          order.status = 'ready_to_dispense';
          order.amountPaid = order.total;
          order.readyAt = new Date();
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
          order.status = 'declined';
          order.declinedAt = new Date();
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
