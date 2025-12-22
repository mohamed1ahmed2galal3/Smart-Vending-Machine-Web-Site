const express = require('express');
const router = express.Router();

const {
  createOrder,
  getOrder,
  getOrderByNumber,
  getOrderStatus,
  getOrdersBySession,
  cancelOrder
} = require('../controllers/orderController');

const sessionHandler = require('../middleware/sessionHandler');

// Apply session handler
router.use(sessionHandler);

// Order routes
router.post('/', createOrder);
router.get('/number/:orderNumber', getOrderByNumber);
router.get('/session/:sessionId', getOrdersBySession);
router.get('/:orderId', getOrder);
router.get('/:orderId/status', getOrderStatus);
router.put('/:orderId/cancel', cancelOrder);

module.exports = router;
