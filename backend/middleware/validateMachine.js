const ErrorResponse = require('../utils/errorResponse');
const Machine = require('../models/Machine');

/**
 * Middleware to validate machine ID
 * Checks if the machine exists and is operational
 */
const validateMachine = async (req, res, next) => {
  try {
    // Get machine ID from various sources
    const machineId = req.params.machineId || 
                      req.body.machineId || 
                      req.query.machineId ||
                      req.headers['x-machine-id'];
    
    if (!machineId) {
      return next(new ErrorResponse('Machine ID is required', 400));
    }
    
    // Find the machine
    const machine = await Machine.findOne({ machineId });
    
    if (!machine) {
      return next(new ErrorResponse(`Machine not found with ID: ${machineId}`, 404));
    }
    
    // Attach machine to request
    req.machine = machine;
    req.machineId = machineId;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to verify machine is online/operational
 */
const requireOnlineMachine = async (req, res, next) => {
  // First validate machine exists
  await validateMachine(req, res, (err) => {
    if (err) return next(err);
    
    if (!req.machine.isAvailable()) {
      return next(new ErrorResponse('Machine is currently unavailable', 503));
    }
    
    next();
  });
};

module.exports = {
  validateMachine,
  requireOnlineMachine
};
