const machines = [
  {
    machineId: 'VM-4029',
    name: 'SmartVend - Building A',
    location: {
      building: 'Building A',
      floor: '2nd Floor',
      description: 'Near the cafeteria entrance'
    },
    status: 'online',
    isOperational: true,
    temperature: {
      current: 4,
      min: 2,
      max: 8,
      unit: 'celsius'
    },
    lastHeartbeat: new Date(),
    lastRestocked: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    firmwareVersion: '2.1.0',
    errors: [],
    totalDispenses: 0,
    totalRevenue: 0,
    slots: [] // Will be populated based on products
  }
];

module.exports = machines;
