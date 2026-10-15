const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate a JWT token for an authenticated user
 * @param {object} payload 
 * @returns {string}
 */
function generateToken(payload) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

/**
 * Verify and decode a JWT token
 * @param {string} token 
 * @returns {object|null}
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken
};
