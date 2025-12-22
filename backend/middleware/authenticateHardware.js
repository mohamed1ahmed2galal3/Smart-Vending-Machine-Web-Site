const ErrorResponse = require('../utils/errorResponse');
const Machine = require('../models/Machine');

/**
 * Middleware to authenticate hardware requests
 * Hardware must provide valid API key in headers
 */
const authenticateHardware = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-hardware-api-key'];
    const machineId = req.body.machineId || req.params.machineId;
    
    if (!apiKey) {
      return next(new ErrorResponse('Hardware API key is required', 401));
    }
    
    if (!machineId) {
      return next(new ErrorResponse('Machine ID is required', 400));
    }
    
    // Verify API key matches the machine
    const machine = await Machine.findOne({ machineId }).select('+apiKey');
    
    if (!machine) {
      return next(new ErrorResponse(`Machine not found: ${machineId}`, 404));
    }
    
    // In production, compare hashed API keys
    // For simplicity, using direct comparison or environment variable
    const validKey = machine.apiKey || process.env.HARDWARE_API_KEY;
    
    if (apiKey !== validKey) {
      return next(new ErrorResponse('Invalid hardware API key', 401));
    }
    
    // Attach machine to request
    req.machine = machine;
    req.machineId = machineId;
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticateHardware;
