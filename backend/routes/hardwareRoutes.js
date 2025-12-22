const express = require('express');
const router = express.Router();

const {
  verifyPickupCode,
  triggerDispense,
  updateDispenseStatus,
  reportHealth,
  updateInventory,
  getPendingOrders
} = require('../controllers/hardwareController');

const authenticateHardware = require('../middleware/authenticateHardware');

// Hardware routes - all require hardware authentication
// Note: In development, you can bypass auth by setting HARDWARE_API_KEY in .env

// Verify pickup code (6-digit code from user)
router.post('/verify-code', verifyPickupCode);

// Dispensing operations
router.post('/dispense', triggerDispense);
router.post('/dispense/status', updateDispenseStatus);

// Machine health and inventory
router.post('/health', reportHealth);
router.put('/inventory', updateInventory);

// Get pending orders for machine
router.get('/:machineId/pending-orders', getPendingOrders);

module.exports = router;
