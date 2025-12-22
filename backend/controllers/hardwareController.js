const Order = require('../models/Order');
const Product = require('../models/Product');
const Machine = require('../models/Machine');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Verify pickup code and get order details (for hardware)
 * @route   POST /api/v1/hardware/verify-code
 * @access  Hardware
 */
exports.verifyPickupCode = asyncHandler(async (req, res, next) => {
  const { machineId, pickupCode } = req.body;

  if (!pickupCode) {
    return next(new ErrorResponse('Pickup code is required', 400));
  }

  if (!machineId) {
    return next(new ErrorResponse('Machine ID is required', 400));
  }

  // Find order with this pickup code
  const order = await Order.findOne({
    pickupCode,
    machineId,
    status: 'paid', // Only paid orders can be dispensed
    paymentStatus: 'paid'
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Invalid Code',
      message: 'Invalid or expired pickup code'
    });
  }

  // Check if code has expired
  if (order.pickupCodeExpiresAt && new Date() > order.pickupCodeExpiresAt) {
    return res.status(400).json({
      success: false,
      error: 'Code Expired',
      message: 'Pickup code has expired'
    });
  }

  // Return order items for dispensing
  res.status(200).json({
    success: true,
    message: 'Code verified successfully',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      items: order.items.map(item => ({
        productId: item.product,
        productName: item.productName,
        slotPosition: item.slotPosition,
        quantity: item.quantity,
        dispensed: item.dispensed
      })),
      totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0)
    }
  });
});

/**
 * @desc    Trigger dispense command
 * @route   POST /api/v1/hardware/dispense
 * @access  Hardware
 */
exports.triggerDispense = asyncHandler(async (req, res, next) => {
  const { machineId, orderId, items } = req.body;

  if (!orderId) {
    return next(new ErrorResponse('Order ID is required', 400));
  }

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  if (order.machineId !== machineId) {
    return next(new ErrorResponse('Order does not belong to this machine', 400));
  }

  if (order.status !== 'paid') {
    return next(new ErrorResponse('Order must be paid before dispensing', 400));
  }

  // Generate dispensing ID
  const dispensingId = `disp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Update order status
  order.status = 'dispensing';
  order.dispensingStatus = 'in_progress';
  order.dispensingId = dispensingId;
  order.dispensingProgress = 0;
  await order.save();

  res.status(200).json({
    success: true,
    message: 'Dispense command sent',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      dispensingId,
      status: 'initiated',
      items: items || order.items.map(item => ({
        slotPosition: item.slotPosition,
        quantity: item.quantity
      }))
    }
  });
});

/**
 * @desc    Update dispense status (from hardware)
 * @route   POST /api/v1/hardware/dispense/status
 * @access  Hardware
 */
exports.updateDispenseStatus = asyncHandler(async (req, res, next) => {
  const { machineId, dispensingId, orderId, status, progress, itemsDispensed } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  if (order.machineId !== machineId) {
    return next(new ErrorResponse('Order does not belong to this machine', 400));
  }

  // Update order dispensing status
  order.dispensingStatus = status;
  order.dispensingProgress = progress || order.dispensingProgress;

  // Update individual items if provided
  if (itemsDispensed && Array.isArray(itemsDispensed)) {
    for (const dispensedItem of itemsDispensed) {
      const orderItem = order.items.find(
        item => item.slotPosition === dispensedItem.slotPosition
      );
      
      if (orderItem && dispensedItem.success) {
        orderItem.dispensed = true;
        orderItem.dispensedAt = new Date();

        // Decrement product stock
        await Product.findByIdAndUpdate(orderItem.product, {
          $inc: { stock: -orderItem.quantity }
        });

        // Update machine slot stock
        await Machine.findOneAndUpdate(
          { machineId, 'slots.position': dispensedItem.slotPosition },
          { 
            $inc: { 'slots.$.stock': -orderItem.quantity },
            $set: { 'slots.$.lastDispenseAt': new Date() }
          }
        );
      }
    }
  }

  // Check if all items dispensed
  if (status === 'completed') {
    order.status = 'completed';
    order.completedAt = new Date();
    order.dispensingProgress = 100;

    // Update machine statistics
    await Machine.findOneAndUpdate(
      { machineId },
      { 
        $inc: { 
          totalDispenses: 1,
          totalRevenue: order.total
        }
      }
    );
  } else if (status === 'failed') {
    order.status = 'failed';
    order.failureReason = req.body.failureReason || 'Dispensing failed';
  }

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Status updated',
    data: {
      orderId: order._id,
      status: order.status,
      dispensingStatus: order.dispensingStatus,
      dispensingProgress: order.dispensingProgress
    }
  });
});

/**
 * @desc    Report machine health
 * @route   POST /api/v1/hardware/health
 * @access  Hardware
 */
exports.reportHealth = asyncHandler(async (req, res, next) => {
  const { machineId, status, temperature, errors, inventory } = req.body;

  const machine = await Machine.findOne({ machineId });

  if (!machine) {
    return next(new ErrorResponse('Machine not found', 404));
  }

  // Update machine status
  machine.status = status || machine.status;
  machine.lastHeartbeat = new Date();

  // Update temperature
  if (temperature !== undefined) {
    machine.temperature.current = temperature;
  }

  // Add errors if any
  if (errors && Array.isArray(errors)) {
    for (const error of errors) {
      machine.errors.push({
        code: error.code,
        message: error.message,
        timestamp: new Date(),
        resolved: false
      });
    }
  }

  // Update inventory if provided
  if (inventory && Array.isArray(inventory)) {
    for (const slot of inventory) {
      const slotIndex = machine.slots.findIndex(s => s.position === slot.slotPosition);
      if (slotIndex > -1) {
        machine.slots[slotIndex].stock = slot.stock;
      }
    }
  }

  await machine.save();

  res.status(200).json({
    success: true,
    message: 'Health report received',
    data: {
      machineId: machine.machineId,
      status: machine.status,
      lastHeartbeat: machine.lastHeartbeat
    }
  });
});

/**
 * @desc    Update inventory after restock
 * @route   PUT /api/v1/hardware/inventory
 * @access  Hardware
 */
exports.updateInventory = asyncHandler(async (req, res, next) => {
  const { machineId, slots } = req.body;

  const machine = await Machine.findOne({ machineId });

  if (!machine) {
    return next(new ErrorResponse('Machine not found', 404));
  }

  // Update slots
  if (slots && Array.isArray(slots)) {
    for (const slot of slots) {
      const slotIndex = machine.slots.findIndex(s => s.position === slot.position);
      
      if (slotIndex > -1) {
        // Update existing slot
        machine.slots[slotIndex].stock = slot.stock;
        if (slot.productId) {
          machine.slots[slotIndex].product = slot.productId;
        }
      } else {
        // Add new slot
        machine.slots.push({
          position: slot.position,
          product: slot.productId,
          stock: slot.stock,
          maxCapacity: slot.maxCapacity || 15
        });
      }

      // Also update product stock
      if (slot.productId) {
        await Product.findByIdAndUpdate(slot.productId, {
          stock: slot.stock,
          slotPosition: slot.position,
          machineId
        });
      }
    }
  }

  machine.lastRestocked = new Date();
  await machine.save();

  res.status(200).json({
    success: true,
    message: 'Inventory updated',
    data: {
      machineId: machine.machineId,
      lastRestocked: machine.lastRestocked,
      slots: machine.slots
    }
  });
});

/**
 * @desc    Get pending orders for machine (for hardware polling)
 * @route   GET /api/v1/hardware/:machineId/pending-orders
 * @access  Hardware
 */
exports.getPendingOrders = asyncHandler(async (req, res, next) => {
  const { machineId } = req.params;

  const orders = await Order.find({
    machineId,
    status: { $in: ['paid', 'dispensing'] },
    paymentStatus: 'paid'
  }).select('orderNumber pickupCode items status dispensingStatus');

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});
