const mongoose = require('mongoose');
const { generatePickupCode } = require('../utils/generateCode');

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
    index: true
    // Auto-generated in pre-save hook
  },
  
  // When the pickup code expires (e.g., 24 hours after payment)
  pickupCodeExpiresAt: {
    type: Date
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
    default: 0.08
  },
  
  tax: {
    type: Number,
    required: true
  },
  
  total: {
    type: Number,
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'paid', 'dispensing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  
  paymentMethod: {
    type: String,
    enum: ['card', 'wallet', 'qr_code'],
    required: true
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
  
  // Generate pickup code if not exists
  if (!this.pickupCode) {
    let code;
    let isUnique = false;
    
    // Ensure unique pickup code
    while (!isUnique) {
      code = generatePickupCode();
      const existingOrder = await this.constructor.findOne({ 
        pickupCode: code,
        status: { $nin: ['completed', 'cancelled', 'refunded', 'failed'] }
      });
      if (!existingOrder) {
        isUnique = true;
      }
    }
    
    this.pickupCode = code;
    // Pickup code valid for 24 hours after creation
    this.pickupCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Indexes
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ pickupCode: 1 });
orderSchema.index({ machineId: 1, status: 1 });
orderSchema.index({ sessionId: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
