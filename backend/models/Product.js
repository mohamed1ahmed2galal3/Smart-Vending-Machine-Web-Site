const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  
  image: {
    type: String,
    required: [true, 'Product image is required']
  },
  
  size: {
    type: String,
    trim: true
    // e.g., "12oz", "500ml", "60g"
  },
  
  tags: [{
    type: String,
    trim: true
    // e.g., ["zero-sugar", "organic", "gluten-free", "low-calorie"]
  }],
  
  nutritionInfo: {
    calories: { type: Number, default: 0 },
    sugar: { type: String },
    protein: { type: String },
    fat: { type: String },
    carbs: { type: String }
  },
  
  stock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  
  slotPosition: {
    type: String,
    required: [true, 'Slot position is required'],
    trim: true
    // e.g., "A1", "B3", "C2"
  },
  
  machineId: {
    type: String,
    required: [true, 'Machine ID is required']
  },
  
  isAvailable: {
    type: Boolean,
    default: true
  },
  
  isBestSeller: {
    type: Boolean,
    default: false
  },
  
  isChilled: {
    type: Boolean,
    default: false
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if in stock
productSchema.virtual('inStock').get(function() {
  return this.stock > 0 && this.isAvailable;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= 3) return 'low_stock';
  return 'in_stock';
});

// Index for common queries
productSchema.index({ category: 1, isAvailable: 1 });
productSchema.index({ machineId: 1, slotPosition: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ tags: 1 });

module.exports = mongoose.model('Product', productSchema);
