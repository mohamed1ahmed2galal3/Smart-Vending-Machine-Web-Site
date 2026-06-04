const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { cancelExpiredPendingOrders } = require('../utils/orderExpiry');
const { normalizeEgyptianPhone } = require('../utils/phone');

/**
 * @desc    Create new order
 * @route   POST /api/v1/orders
 * @access  Public
 */
exports.createOrder = asyncHandler(async (req, res, next) => {
  const {
    sessionId,
    machineId,
    items,
    paymentMethod,
    paymentProvider,
    customerEmail,
    customerPhone,
    payerPhone
  } = req.body;

  if (!machineId) {
    return next(new ErrorResponse('Machine ID is required', 400));
  }

  if (!paymentMethod) {
    return next(new ErrorResponse('Payment method is required', 400));
  }

  const normalizedPaymentMethod = paymentProvider || paymentMethod;
  const normalizedPayerPhone = normalizeEgyptianPhone(payerPhone || customerPhone);
  const walletProviders = ['vodafone_cash', 'etisalat_cash', 'instapay'];

  if (walletProviders.includes(normalizedPaymentMethod) && !normalizedPayerPhone) {
    return next(new ErrorResponse('Payer phone is required for wallet payments', 400));
  }

  // Get items from cart or request body
  let orderItems = [];
  let subtotal = 0;

  if (items && items.length > 0) {
    // Create order from provided items
    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return next(new ErrorResponse(`Product not found: ${item.productId}`, 404));
      }
      
      if (!product.inStock) {
        return next(new ErrorResponse(`Product out of stock: ${product.name}`, 409));
      }
      
      if (product.stock < item.quantity) {
        return next(new ErrorResponse(`Insufficient stock for ${product.name}. Only ${product.stock} available.`, 409));
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.image,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: itemSubtotal,
        slotPosition: product.slotPosition
      });
    }
  } else {
    // Create order from cart
    const cart = await Cart.findOne({ sessionId: sessionId || req.sessionId })
      .populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return next(new ErrorResponse('Cart is empty', 400));
    }

    for (const item of cart.items) {
      const product = item.product;
      
      if (!product.inStock) {
        return next(new ErrorResponse(`Product out of stock: ${product.name}`, 409));
      }
      
      if (product.stock < item.quantity) {
        return next(new ErrorResponse(`Insufficient stock for ${product.name}`, 409));
      }

      const itemSubtotal = item.priceAtAdd * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.image,
        quantity: item.quantity,
        unitPrice: item.priceAtAdd,
        subtotal: itemSubtotal,
        slotPosition: product.slotPosition
      });
    }
  }

  // Calculate total (no tax)
  const taxRate = 0;
  const tax = 0;
  const total = subtotal;

  // Create order
  const order = await Order.create({
    sessionId: sessionId || req.sessionId,
    machineId,
    items: orderItems,
    subtotal,
    taxRate,
    tax,
    total,
    paymentMethod: normalizedPaymentMethod,
    paymentProvider: paymentProvider || (
      ['vodafone_cash', 'etisalat_cash', 'instapay'].includes(paymentMethod) ? paymentMethod : null
    ),
    customerEmail,
    customerPhone,
    payerPhone: normalizedPayerPhone,
    status: 'pending_payment',
    paymentStatus: 'pending'
  });

  res.status(201).json({
    success: true,
    data: {
      _id: order._id,
      orderNumber: order.orderNumber,
      machineId: order.machineId,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      amountPaid: order.amountPaid,
      balanceApplied: order.balanceApplied,
      balanceCredited: order.balanceCredited,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentProvider: order.paymentProvider,
      paymentDeadlineAt: order.paymentDeadlineAt,
      createdAt: order.createdAt
    }
  });
});

/**
 * @desc    Get order by ID
 * @route   GET /api/v1/orders/:orderId
 * @access  Public
 */
exports.getOrder = asyncHandler(async (req, res, next) => {
  await cancelExpiredPendingOrders({ _id: req.params.orderId });

  const order = await Order.findById(req.params.orderId)
    .populate('items.product', 'name price image');

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

/**
 * @desc    Get order by order number
 * @route   GET /api/v1/orders/number/:orderNumber
 * @access  Public
 */
exports.getOrderByNumber = asyncHandler(async (req, res, next) => {
  await cancelExpiredPendingOrders();

  const order = await Order.findOne({ orderNumber: req.params.orderNumber })
    .populate('items.product', 'name price image');

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

/**
 * @desc    Get order status
 * @route   GET /api/v1/orders/:orderId/status
 * @access  Public
 */
exports.getOrderStatus = asyncHandler(async (req, res, next) => {
  await cancelExpiredPendingOrders({ _id: req.params.orderId });

  const order = await Order.findById(req.params.orderId)
    .select('orderNumber status paymentStatus dispensingStatus dispensingProgress pickupCode pickupCodeExpiresAt paymentDeadlineAt amountPaid balanceApplied balanceCredited total');

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Determine status message
  let message = '';
  switch (order.status) {
    case 'pending_payment':
      message = 'Awaiting payment...';
      break;
    case 'ready_to_dispense':
      message = 'Payment successful! Use your pickup code on the machine.';
      break;
    case 'dispensing':
      message = 'Dispensing your items...';
      break;
    case 'dispensed':
      message = 'Order completed. Please collect your items!';
      break;
    case 'declined':
      message = 'Payment was insufficient. The received amount was added to your account balance.';
      break;
    case 'cancelled':
      message = 'Order cancelled because payment was not received in time.';
      break;
    case 'dispense_failed':
      message = 'Dispensing failed. Please contact support.';
      break;
    default:
      message = 'Processing...';
  }

  const response = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    dispensingStatus: order.dispensingStatus,
    dispensingProgress: order.dispensingProgress,
    total: order.total,
    amountPaid: order.amountPaid,
    balanceApplied: order.balanceApplied,
    balanceCredited: order.balanceCredited,
    paymentDeadlineAt: order.paymentDeadlineAt,
    message
  };

  // Include pickup code only if payment is successful and the order is ready.
  if (order.paymentStatus === 'paid' && order.status === 'ready_to_dispense') {
    response.pickupCode = order.pickupCode;
    response.pickupCodeExpiresAt = order.pickupCodeExpiresAt;
  }

  res.status(200).json({
    success: true,
    data: response
  });
});

/**
 * @desc    Get orders by session
 * @route   GET /api/v1/orders/session/:sessionId
 * @access  Public
 */
exports.getOrdersBySession = asyncHandler(async (req, res, next) => {
  await cancelExpiredPendingOrders({ sessionId: req.params.sessionId });

  const orders = await Order.find({ sessionId: req.params.sessionId })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

/**
 * @desc    Cancel order
 * @route   PUT /api/v1/orders/:orderId/cancel
 * @access  Public
 */
exports.cancelOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Can only cancel orders still waiting for payment.
  if (order.status !== 'pending_payment') {
    return next(new ErrorResponse('Cannot cancel order in current status', 400));
  }

  order.status = 'cancelled';
  order.paymentStatus = 'cancelled';
  order.cancelledAt = new Date();
  await order.save();

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: order
  });
});

/**
 * @desc    Get multiple orders by IDs
 * @route   POST /api/v1/orders/multiple
 * @access  Public
 */
exports.getMultipleOrders = asyncHandler(async (req, res, next) => {
  const { orderIds } = req.body;

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return next(new ErrorResponse('Order IDs array is required', 400));
  }

  // Limit to prevent abuse
  const limitedIds = orderIds.slice(0, 50);

  await cancelExpiredPendingOrders({ _id: { $in: limitedIds } });

  const orders = await Order.find({ _id: { $in: limitedIds } })
    .sort({ createdAt: -1 })
    .select('orderNumber pickupCode pickupCodeExpiresAt paymentDeadlineAt status paymentStatus dispensingStatus items total amountPaid balanceApplied balanceCredited createdAt machineId');

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

/**
 * @desc    Regenerate pickup code for an order
 * @route   POST /api/v1/orders/:orderId/regenerate-code
 * @access  Public
 */
exports.regeneratePickupCode = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Only allow code regeneration for ready orders that haven't been dispensed.
  if (order.paymentStatus !== 'paid' || order.status !== 'ready_to_dispense') {
    return next(new ErrorResponse('Order must be ready to dispense to regenerate code', 400));
  }

  if (order.dispensingStatus === 'completed' || order.status === 'dispensed') {
    return next(new ErrorResponse('Order has already been dispensed', 400));
  }

  // Generate new pickup code
  const { generatePickupCode } = require('../utils/generateCode');
  let newCode;
  let isUnique = false;
  
  while (!isUnique) {
    newCode = generatePickupCode();
    const existingOrder = await Order.findOne({ 
      pickupCode: newCode,
      _id: { $ne: order._id },
      status: { $nin: ['dispensed', 'cancelled', 'refunded', 'declined', 'dispense_failed'] }
    });
    if (!existingOrder) {
      isUnique = true;
    }
  }
  
  order.pickupCode = newCode;
  order.pickupCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await order.save();

  res.status(200).json({
    success: true,
    message: 'Pickup code regenerated successfully',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      pickupCode: order.pickupCode,
      pickupCodeExpiresAt: order.pickupCodeExpiresAt
    }
  });
});
