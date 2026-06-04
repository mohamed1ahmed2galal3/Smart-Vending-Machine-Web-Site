const Order = require('../models/Order');

const cancelExpiredPendingOrders = async (extraFilter = {}) => {
  const now = new Date();

  return Order.updateMany(
    {
      ...extraFilter,
      status: 'pending_payment',
      paymentDeadlineAt: { $lt: now }
    },
    {
      $set: {
        status: 'cancelled',
        paymentStatus: 'cancelled',
        cancelledAt: now,
        failureReason: 'Payment was not received within 5 minutes'
      }
    }
  );
};

module.exports = {
  cancelExpiredPendingOrders
};
