const express = require('express');
const router = express.Router();

const {
  getMachineInfo,
  getMachineStatus,
  getMachineInventory,
  createMachine,
  updateMachine,
  getAllMachines
} = require('../controllers/machineController');

// Public routes
router.get('/:machineId', getMachineInfo);
router.get('/:machineId/status', getMachineStatus);
router.get('/:machineId/inventory', getMachineInventory);

// Admin routes (should add auth middleware in production)
router.get('/', getAllMachines);
router.post('/', createMachine);
router.put('/:machineId', updateMachine);

module.exports = router;
