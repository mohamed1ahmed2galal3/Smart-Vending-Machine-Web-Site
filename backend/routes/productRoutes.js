const express = require('express');
const router = express.Router();

const {
  getProducts,
  getProduct,
  getProductsByCategory,
  checkAvailability,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

// Public routes
router.get('/', getProducts);
router.get('/category/:categorySlug', getProductsByCategory);
router.get('/:productId', getProduct);
router.get('/:productId/availability', checkAvailability);

// Admin routes (should add auth middleware in production)
router.post('/', createProduct);
router.put('/:productId', updateProduct);
router.delete('/:productId', deleteProduct);

module.exports = router;
