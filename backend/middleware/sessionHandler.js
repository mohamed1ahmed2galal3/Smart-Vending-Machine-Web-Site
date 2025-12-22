const { generateSessionId } = require('../utils/generateCode');

/**
 * Middleware to handle session management
 * Creates or retrieves session ID from headers/cookies
 */
const sessionHandler = (req, res, next) => {
  // Get session ID from header or generate new one
  let sessionId = req.headers['x-session-id'] || req.query.sessionId;
  
  if (!sessionId) {
    sessionId = generateSessionId();
    // Set session ID in response header for client to store
    res.setHeader('X-Session-ID', sessionId);
  }
  
  req.sessionId = sessionId;
  next();
};

module.exports = sessionHandler;
