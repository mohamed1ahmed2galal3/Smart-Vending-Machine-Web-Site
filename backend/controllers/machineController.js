const Machine = require('../models/Machine');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get machine info
 * @route   GET /api/v1/machine/:machineId
 * @access  Public
 */
exports.getMachineInfo = asyncHandler(async (req, res, next) => {
  const machine = await Machine.findOne({ machineId: req.params.machineId })
    .populate('slots.product', 'name price image');

  if (!machine) {
    return next(new ErrorResponse('Machine not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      _id: machine._id,
      machineId: machine.machineId,
      name: machine.name,
      location: machine.location,
      status: machine.status,
      isOperational: machine.isOperational,
      lastRestocked: machine.lastRestocked,
      temperature: machine.temperature,
      slots: machine.slots
    }
  });
});

/**
 * @desc    Get machine status
 * @route   GET /api/v1/machine/:machineId/status
 * @access  Public
 */
exports.getMachineStatus = asyncHandler(async (req, res, next) => {
  const machine = await Machine.findOne({ machineId: req.params.machineId })
    .select('machineId status isOperational lastHeartbeat errors');

  if (!machine) {
    return next(new ErrorResponse('Machine not found', 404));
  }

  // Get unresolved errors
  const activeErrors = machine.errors.filter(e => !e.resolved);

  res.status(200).json({
    success: true,
    data: {
      machineId: machine.machineId,
      status: machine.status,
      isOperational: machine.isOperational,
      lastHeartbeat: machine.lastHeartbeat,
      errors: activeErrors
    }
  });
});

/**
 * @desc    Get machine inventory
 * @route   GET /api/v1/machine/:machineId/inventory
 * @access  Public
 */
exports.getMachineInventory = asyncHandler(async (req, res, next) => {
  const machine = await Machine.findOne({ machineId: req.params.machineId })
    .populate('slots.product', 'name price image category');

  if (!machine) {
    return next(new ErrorResponse('Machine not found', 404));
  }

  // Also get products for this machine
  const products = await Product.find({ 
    machineId: req.params.machineId,
    isAvailable: true 
  }).populate('category', 'name slug icon');

  res.status(200).json({
    success: true,
    data: {
      machineId: machine.machineId,
      slots: machine.slots,
      products
    }
  });
});

/**
 * @desc    Create machine (Admin)
 * @route   POST /api/v1/machine
 * @access  Private/Admin
 */
exports.createMachine = asyncHandler(async (req, res, next) => {
  const machine = await Machine.create(req.body);

  res.status(201).json({
    success: true,
    data: machine
  });
});

/**
 * @desc    Update machine (Admin)
 * @route   PUT /api/v1/machine/:machineId
 * @access  Private/Admin
 */
exports.updateMachine = asyncHandler(async (req, res, next) => {
  let machine = await Machine.findOne({ machineId: req.params.machineId });

  if (!machine) {
    return next(new ErrorResponse('Machine not found', 404));
  }

  machine = await Machine.findOneAndUpdate(
    { machineId: req.params.machineId },
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: machine
  });
});

/**
 * @desc    Get all machines (Admin)
 * @route   GET /api/v1/machines
 * @access  Private/Admin
 */
exports.getAllMachines = asyncHandler(async (req, res, next) => {
  const machines = await Machine.find();

  res.status(200).json({
    success: true,
    count: machines.length,
    data: machines
  });
});
