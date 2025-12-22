const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    max: [10, 'Maximum 10 items per product']
  },
  
  priceAtAdd: {
    type: Number,
    required: true
    // Price when item was added (in case price changes)
  }
});

const cartSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    unique: true,
    index: true
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    // Optional - for logged-in users
  },
  
  machineId: {
    type: String,
    required: [true, 'Machine ID is required']
  },
  
  items: [cartItemSchema],
  
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000),
    index: { expires: 0 }
    // Cart expires after 30 minutes of inactivity
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for subtotal
cartSchema.virtual('subtotal').get(function() {
  return this.items.reduce((total, item) => {
    return total + (item.priceAtAdd * item.quantity);
  }, 0);
});

// Virtual for item count
cartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((count, item) => count + item.quantity, 0);
});

// Virtual for tax (no tax)
cartSchema.virtual('tax').get(function() {
  return 0;
});

// Virtual for tax rate
cartSchema.virtual('taxRate').get(function() {
  return 0;
});

// Virtual for total (no tax)
cartSchema.virtual('total').get(function() {
  return this.subtotal;
});

// Update expiration time on save
cartSchema.pre('save', function(next) {
  this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
