const express = require('express');
const router = express.Router();

const {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart
} = require('../controllers/cartController');

const sessionHandler = require('../middleware/sessionHandler');

// Apply session handler to all cart routes
router.use(sessionHandler);

// Cart routes
router.get('/', getCart);
router.post('/items', addItem);
router.put('/items/:productId', updateItem);
router.delete('/items/:productId', removeItem);
router.delete('/', clearCart);

module.exports = router;
