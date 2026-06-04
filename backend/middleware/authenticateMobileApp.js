const ErrorResponse = require('../utils/errorResponse');

const authenticateMobileApp = (req, res, next) => {
  const expectedKey = process.env.MOBILE_API_KEY;

  if (!expectedKey) {
    return next();
  }

  const apiKey = req.headers['x-mobile-api-key'];
  if (apiKey !== expectedKey) {
    return next(new ErrorResponse('Invalid mobile API key', 401));
  }

  next();
};

module.exports = authenticateMobileApp;
