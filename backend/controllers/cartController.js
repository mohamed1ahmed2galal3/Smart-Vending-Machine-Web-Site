const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get cart
 * @route   GET /api/v1/cart
 * @access  Public
 */
exports.getCart = asyncHandler(async (req, res, next) => {
  const sessionId = req.sessionId;
  const machineId = req.query.machineId || req.headers['x-machine-id'];

  let cart = await Cart.findOne({ sessionId })
    .populate({
      path: 'items.product',
      select: 'name price image stock isAvailable slotPosition'
    });

  if (!cart) {
    // Return empty cart structure
    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        machineId: machineId || null,
        items: [],
        subtotal: 0,
        tax: 0,
        taxRate: 0.08,
        total: 0,
        itemCount: 0
      }
    });
  }

  // Format response with calculated values
  const formattedItems = cart.items.map(item => ({
    product: item.product,
    quantity: item.quantity,
    priceAtAdd: item.priceAtAdd,
    subtotal: Math.round(item.priceAtAdd * item.quantity * 100) / 100
  }));

  res.status(200).json({
    success: true,
    data: {
      _id: cart._id,
      sessionId: cart.sessionId,
      machineId: cart.machineId,
      items: formattedItems,
      subtotal: cart.subtotal,
      tax: cart.tax,
      taxRate: cart.taxRate,
      total: cart.total,
      itemCount: cart.itemCount
    }
  });
});

/**
 * @desc    Add item to cart
 * @route   POST /api/v1/cart/items
 * @access  Public
 */
exports.addItem = asyncHandler(async (req, res, next) => {
  const sessionId = req.sessionId;
  const { productId, quantity = 1 } = req.body;
  const machineId = req.body.machineId || req.headers['x-machine-id'];

  if (!productId) {
    return next(new ErrorResponse('Product ID is required', 400));
  }

  if (!machineId) {
    return next(new ErrorResponse('Machine ID is required', 400));
  }

  // Validate product exists and is available
  const product = await Product.findById(productId);
  
  if (!product) {
    return next(new ErrorResponse('Product not found', 404));
  }

  if (!product.inStock) {
    return next(new ErrorResponse('Product is out of stock', 409));
  }

  if (product.stock < quantity) {
    return next(new ErrorResponse(`Only ${product.stock} items available`, 409));
  }

  // Find or create cart
  let cart = await Cart.findOne({ sessionId });

  if (!cart) {
    cart = new Cart({
      sessionId,
      machineId,
      items: []
    });
  }

  // Check if product already in cart
  const existingItemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    // Update quantity
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    
    if (newQuantity > 10) {
      return next(new ErrorResponse('Maximum 10 items per product allowed', 400));
    }
    
    if (newQuantity > product.stock) {
      return next(new ErrorResponse(`Only ${product.stock} items available`, 409));
    }
    
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item
    cart.items.push({
      product: productId,
      quantity,
      priceAtAdd: product.price
    });
  }

  await cart.save();

  // Populate and return updated cart
  cart = await Cart.findById(cart._id).populate({
    path: 'items.product',
    select: 'name price image stock isAvailable slotPosition'
  });

  res.status(200).json({
    success: true,
    message: 'Item added to cart',
    data: {
      cart: {
        _id: cart._id,
        sessionId: cart.sessionId,
        machineId: cart.machineId,
        items: cart.items,
        subtotal: cart.subtotal,
        tax: cart.tax,
        taxRate: cart.taxRate,
        total: cart.total,
        itemCount: cart.itemCount
      },
      addedItem: {
        productId,
        name: product.name,
        quantity,
        price: product.price
      }
    }
  });
});

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/v1/cart/items/:productId
 * @access  Public
 */
exports.updateItem = asyncHandler(async (req, res, next) => {
  const sessionId = req.sessionId;
  const { productId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || quantity === null) {
    return next(new ErrorResponse('Quantity is required', 400));
  }

  if (quantity < 0 || quantity > 10) {
    return next(new ErrorResponse('Quantity must be between 0 and 10', 400));
  }

  let cart = await Cart.findOne({ sessionId });

  if (!cart) {
    return next(new ErrorResponse('Cart not found', 404));
  }

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    return next(new ErrorResponse('Item not found in cart', 404));
  }

  if (quantity === 0) {
    // Remove item
    cart.items.splice(itemIndex, 1);
  } else {
    // Check stock
    const product = await Product.findById(productId);
    if (product && quantity > product.stock) {
      return next(new ErrorResponse(`Only ${product.stock} items available`, 409));
    }
    
    cart.items[itemIndex].quantity = quantity;
  }

  await cart.save();

  // Populate and return updated cart
  cart = await Cart.findById(cart._id).populate({
    path: 'items.product',
    select: 'name price image stock isAvailable slotPosition'
  });

  res.status(200).json({
    success: true,
    message: 'Cart updated',
    data: {
      _id: cart._id,
      sessionId: cart.sessionId,
      machineId: cart.machineId,
      items: cart.items,
      subtotal: cart.subtotal,
      tax: cart.tax,
      taxRate: cart.taxRate,
      total: cart.total,
      itemCount: cart.itemCount
    }
  });
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/v1/cart/items/:productId
 * @access  Public
 */
exports.removeItem = asyncHandler(async (req, res, next) => {
  const sessionId = req.sessionId;
  const { productId } = req.params;

  let cart = await Cart.findOne({ sessionId });

  if (!cart) {
    return next(new ErrorResponse('Cart not found', 404));
  }

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    return next(new ErrorResponse('Item not found in cart', 404));
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  // Populate and return updated cart
  cart = await Cart.findById(cart._id).populate({
    path: 'items.product',
    select: 'name price image stock isAvailable slotPosition'
  });

  res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    data: {
      _id: cart._id,
      sessionId: cart.sessionId,
      machineId: cart.machineId,
      items: cart.items,
      subtotal: cart.subtotal,
      tax: cart.tax,
      taxRate: cart.taxRate,
      total: cart.total,
      itemCount: cart.itemCount
    }
  });
});

/**
 * @desc    Clear cart
 * @route   DELETE /api/v1/cart
 * @access  Public
 */
exports.clearCart = asyncHandler(async (req, res, next) => {
  const sessionId = req.sessionId;

  const cart = await Cart.findOne({ sessionId });

  if (cart) {
    await cart.deleteOne();
  }

  res.status(200).json({
    success: true,
    message: 'Cart cleared'
  });
});
