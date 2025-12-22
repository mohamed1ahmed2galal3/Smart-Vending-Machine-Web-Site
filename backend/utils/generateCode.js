/**
 * Generate a random 6-digit pickup code
 * @returns {string} - 6 digit code
 */
const generatePickupCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a unique order number
 * @param {number} count - Current order count
 * @returns {string} - Order number
 */
const generateOrderNumber = (count) => {
  return String(80000 + count + 1);
};

/**
 * Generate a session ID
 * @returns {string} - Session ID
 */
const generateSessionId = () => {
  const { v4: uuidv4 } = require('uuid');
  return `sess_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
};

module.exports = {
  generatePickupCode,
  generateOrderNumber,
  generateSessionId
};
