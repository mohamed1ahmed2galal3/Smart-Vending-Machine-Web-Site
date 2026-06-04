const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  
  phone: {
    type: String,
    unique: true,
    sparse: true
  },
  
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  role: {
    type: String,
    enum: ['customer', 'admin', 'technician'],
    default: 'customer'
  },
  
  preferences: {
    favoriteProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    receivePromotions: { type: Boolean, default: false }
  },
  
  orderHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  
  totalSpent: {
    type: Number,
    default: 0
  },

  accountBalance: {
    type: Number,
    default: 0,
    min: [0, 'Account balance cannot be negative']
  },

  balanceUpdatedAt: {
    type: Date
  },
  
  lastOrderAt: {
    type: Date
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
