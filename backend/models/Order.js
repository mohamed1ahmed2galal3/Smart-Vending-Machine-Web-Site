const mongoose = require('mongoose');
const { generatePickupCode } = require('../utils/generateCode');

const ORDER_STATUSES = [
  'pending_payment',
  'cancelled',
  'declined',
  'ready_to_dispense',
  'dispensing',
  'dispensed',
  'dispense_failed',
  'refunded'
];

const PAYMENT_STATUSES = [
  'pending',
  'partial',
  'paid',
  'insufficient',
  'failed',
  'refunded',
  'cancelled'
];

const PAYMENT_METHODS = [
  'vodafone_cash',
  'etisalat_cash',
  'instapay',
  'account_balance',
  'card',
  'wallet',
  'qr_code'
];

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  productName: {
    type: String,
    required: true
    // Snapshot of product name at order time
  },
  
  productImage: {
    type: String
  },
  
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  
  unitPrice: {
    type: Number,
    required: true
  },
  
  subtotal: {
    type: Number,
    required: true
  },
  
  slotPosition: {
    type: String,
    required: true
  },
  
  dispensed: {
    type: Boolean,
    default: false
  },
  
  dispensedAt: {
    type: Date
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
    // Auto-generated in pre-save hook, e.g., "83921"
  },
  
  // 6-digit pickup code for hardware verification
  pickupCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
    // Generated only after payment is accepted
  },
  
  // When the pickup code expires (e.g., 24 hours after payment)
  pickupCodeExpiresAt: {
    type: Date
  },

  pickupCodeUsedAt: {
    type: Date
  },

  paymentDeadlineAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000),
    index: true
  },
  
  sessionId: {
    type: String,
    required: true
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  machineId: {
    type: String,
    required: [true, 'Machine ID is required'],
    index: true
  },
  
  items: [orderItemSchema],
  
  subtotal: {
    type: Number,
    required: true
  },
  
  taxRate: {
    type: Number,
    default: 0
  },
  
  tax: {
    type: Number,
    required: true
  },
  
  total: {
    type: Number,
    required: true
  },

  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },

  balanceApplied: {
    type: Number,
    default: 0,
    min: 0
  },

  balanceCredited: {
    type: Number,
    default: 0,
    min: 0
  },
  
  status: {
    type: String,
    enum: ORDER_STATUSES,
    default: 'pending_payment',
    index: true
  },
  
  paymentStatus: {
    type: String,
    enum: PAYMENT_STATUSES,
    default: 'pending'
  },
  
  paymentMethod: {
    type: String,
    enum: PAYMENT_METHODS,
    required: true
  },

  paymentProvider: {
    type: String,
    enum: ['vodafone_cash', 'etisalat_cash', 'instapay', null],
    default: null
  },
  
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  
  dispensingStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'partial'],
    default: 'pending'
  },
  
  dispensingProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  dispensingId: {
    type: String
    // ID from hardware for tracking dispense
  },
  
  completedAt: {
    type: Date
  },

  readyAt: {
    type: Date
  },

  cancelledAt: {
    type: Date
  },

  declinedAt: {
    type: Date
  },
  
  failureReason: {
    type: String
  },
  
  customerEmail: {
    type: String,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  
  customerPhone: {
    type: String
  },

  payerPhone: {
    type: String,
    index: true
  },
  
  receiptSent: {
    type: Boolean,
    default: false
  }
  
}, {
  timestamps: true
});

// Pre-save middleware to generate order number and pickup code
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = String(80000 + count + 1);
  }
  
  // Generate pickup code only after the order is actually ready to dispense.
  if (this.status === 'ready_to_dispense' && this.paymentStatus === 'paid' && !this.pickupCode) {
    let code;
    let isUnique = false;
    
    // Ensure unique pickup code
    while (!isUnique) {
      code = generatePickupCode();
      const existingOrder = await this.constructor.findOne({ 
        pickupCode: code,
        status: { $nin: ['dispensed', 'cancelled', 'refunded', 'declined', 'dispense_failed'] }
      });
      if (!existingOrder) {
        isUnique = true;
      }
    }
    
    this.pickupCode = code;
    this.readyAt = this.readyAt || new Date();
    // Pickup code valid for 24 hours after becoming ready.
    this.pickupCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Indexes
orderSchema.index({ machineId: 1, status: 1 });
orderSchema.index({ sessionId: 1 });
orderSchema.index({ payerPhone: 1, paymentProvider: 1, status: 1 });
orderSchema.index({ paymentDeadlineAt: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1 });

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;
orderSchema.statics.PAYMENT_STATUSES = PAYMENT_STATUSES;
orderSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;

module.exports = mongoose.model('Order', orderSchema);
