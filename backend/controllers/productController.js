const Product = require('../models/Product');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all products
 * @route   GET /api/v1/products
 * @access  Public
 */
exports.getProducts = asyncHandler(async (req, res, next) => {
  const {
    category,
    minPrice,
    maxPrice,
    inStock,
    search,
    machineId,
    page = 1,
    limit = 12
  } = req.query;

  // Build query
  const query = {};

  // Filter by machine ID
  if (machineId) {
    query.machineId = machineId;
  }

  // Filter by category
  if (category) {
    const categoryDoc = await Category.findOne({ 
      $or: [
        { slug: category },
        { _id: category }
      ]
    });
    if (categoryDoc) {
      query.category = categoryDoc._id;
    }
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // In stock filter
  if (inStock === 'true') {
    query.stock = { $gt: 0 };
    query.isAvailable = true;
  }

  // Search by name
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const products = await Product.find(query)
    .populate('category', 'name slug icon')
    .skip(skip)
    .limit(limitNum)
    .sort({ createdAt: -1 });

  // Get total count
  const totalItems = await Product.countDocuments(query);
  const totalPages = Math.ceil(totalItems / limitNum);

  res.status(200).json({
    success: true,
    count: products.length,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems
    },
    data: products
  });
});

/**
 * @desc    Get single product
 * @route   GET /api/v1/products/:productId
 * @access  Public
 */
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.productId)
    .populate('category', 'name slug icon');

  if (!product) {
    return next(new ErrorResponse('Product not found', 404));
  }

  res.status(200).json({
    success: true,
    data: product
  });
});

/**
 * @desc    Get products by category
 * @route   GET /api/v1/products/category/:categorySlug
 * @access  Public
 */
exports.getProductsByCategory = asyncHandler(async (req, res, next) => {
  const { categorySlug } = req.params;
  const { machineId, page = 1, limit = 12 } = req.query;

  // Find category
  const category = await Category.findOne({ slug: categorySlug });
  
  if (!category) {
    return next(new ErrorResponse('Category not found', 404));
  }

  // Build query
  const query = { 
    category: category._id,
    isAvailable: true
  };

  if (machineId) {
    query.machineId = machineId;
  }

  // Pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const products = await Product.find(query)
    .populate('category', 'name slug icon')
    .skip(skip)
    .limit(limitNum);

  const totalItems = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    count: products.length,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalItems / limitNum),
      totalItems
    },
    data: products
  });
});

/**
 * @desc    Check product availability
 * @route   GET /api/v1/products/:productId/availability
 * @access  Public
 */
exports.checkAvailability = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.productId)
    .select('name isAvailable stock slotPosition machineId');

  if (!product) {
    return next(new ErrorResponse('Product not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      productId: product._id,
      name: product.name,
      isAvailable: product.inStock,
      stock: product.stock,
      slotPosition: product.slotPosition,
      stockStatus: product.stockStatus
    }
  });
});

/**
 * @desc    Create new product (Admin)
 * @route   POST /api/v1/products
 * @access  Private/Admin
 */
exports.createProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    data: product
  });
});

/**
 * @desc    Update product (Admin)
 * @route   PUT /api/v1/products/:productId
 * @access  Private/Admin
 */
exports.updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.productId);

  if (!product) {
    return next(new ErrorResponse('Product not found', 404));
  }

  product = await Product.findByIdAndUpdate(req.params.productId, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: product
  });
});

/**
 * @desc    Delete product (Admin)
 * @route   DELETE /api/v1/products/:productId
 * @access  Private/Admin
 */
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    return next(new ErrorResponse('Product not found', 404));
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully'
  });
});
