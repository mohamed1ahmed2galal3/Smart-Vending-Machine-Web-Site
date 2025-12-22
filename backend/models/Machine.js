const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  position: {
    type: String,
    required: true
    // e.g., "A1", "B3"
  },
  
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  
  maxCapacity: {
    type: Number,
    default: 15
  },
  
  isOperational: {
    type: Boolean,
    default: true
  },
  
  lastDispenseAt: {
    type: Date
  },
  
  errorCount: {
    type: Number,
    default: 0
  }
});

const machineSchema = new mongoose.Schema({
  machineId: {
    type: String,
    required: true,
    unique: true,
    index: true
    // e.g., "VM-4029"
  },
  
  name: {
    type: String,
    default: 'SmartVend Machine'
  },
  
  location: {
    building: String,
    floor: String,
    description: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'error'],
    default: 'offline',
    index: true
  },
  
  isOperational: {
    type: Boolean,
    default: true
  },
  
  slots: [slotSchema],
  
  temperature: {
    current: Number,
    min: { type: Number, default: 2 },
    max: { type: Number, default: 8 },
    unit: { type: String, default: 'celsius' }
  },
  
  lastHeartbeat: {
    type: Date
  },
  
  lastRestocked: {
    type: Date
  },
  
  lastMaintenance: {
    type: Date
  },
  
  firmwareVersion: {
    type: String
  },
  
  errors: [{
    code: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
  }],
  
  totalDispenses: {
    type: Number,
    default: 0
  },
  
  totalRevenue: {
    type: Number,
    default: 0
  },
  
  apiKey: {
    type: String,
    select: false
    // For hardware authentication
  }
  
}, {
  timestamps: true
});

// Method to check if machine is available
machineSchema.methods.isAvailable = function() {
  return this.status === 'online' && this.isOperational;
};

// Indexes
machineSchema.index({ machineId: 1 }, { unique: true });
machineSchema.index({ status: 1 });

module.exports = mongoose.model('Machine', machineSchema);
