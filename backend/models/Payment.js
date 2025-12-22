const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
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
  
  amount: {
    type: Number,
    required: true
  },
  
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  method: {
    type: String,
    enum: ['card', 'wallet', 'qr_code'],
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true
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
    of: String
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
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
