const mongoose = require('mongoose');

const PAYMENT_METHODS = [
  'vodafone_cash',
  'etisalat_cash',
  'instapay',
  'account_balance',
  'manual_adjustment',
  'card',
  'wallet',
  'qr_code'
];

const PAYMENT_STATUSES = [
  'received',
  'matched',
  'partial',
  'succeeded',
  'failed',
  'refunded',
  'cancelled',
  'duplicate'
];

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  transactionId: {
    type: String,
    unique: true,
    sparse: true
    // External payment gateway transaction ID
  },
  
  paymentIntentId: {
    type: String
    // Stripe payment intent ID
  },

  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  
  amount: {
    type: Number,
    required: true
  },
  
  currency: {
    type: String,
    default: 'EGP',
    uppercase: true
  },
  
  method: {
    type: String,
    enum: PAYMENT_METHODS,
    required: true
  },
  
  status: {
    type: String,
    enum: PAYMENT_STATUSES,
    default: 'received',
    index: true
  },

  provider: {
    type: String,
    enum: ['vodafone_cash', 'etisalat_cash', 'instapay', null],
    default: null
  },

  senderPhone: {
    type: String,
    index: true
  },

  senderName: {
    type: String
  },

  smsTimestamp: {
    type: Date
  },

  rawMessage: {
    type: String
  },
  
  cardDetails: {
    brand: String,        // e.g., "visa", "mastercard"
    lastFourDigits: String,
    expiryMonth: Number,
    expiryYear: Number,
    cardholderName: String
  },
  
  walletType: {
    type: String
    // e.g., "apple_pay", "google_pay"
  },
  
  failureCode: {
    type: String
  },
  
  failureMessage: {
    type: String
  },
  
  refundedAmount: {
    type: Number,
    default: 0
  },
  
  refundReason: {
    type: String
  },
  
  refundedAt: {
    type: Date
  },
  
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
    // Additional data from payment gateway
  },
  
  paidAt: {
    type: Date
  }
  
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ order: 1 });
paymentSchema.index({ provider: 1, senderPhone: 1, amount: 1, smsTimestamp: 1 });
paymentSchema.index({ createdAt: -1 });

paymentSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;
paymentSchema.statics.PAYMENT_STATUSES = PAYMENT_STATUSES;

module.exports = mongoose.model('Payment', paymentSchema);
