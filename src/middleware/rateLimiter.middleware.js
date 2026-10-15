const rateLimit = require('express-rate-limit');
const config = require('../config');
const { extractClientIp } = require('../utils/ip');

// Rate limiter for authentication endpoints (prevent brute-force login/register)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimitMaxAuth, // e.g. 15 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => extractClientIp(req),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts. Please try again after 15 minutes.'
    });
  }
});

// Rate limiter for public lead submissions (prevent spam flood)
const submissionRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // e.g. 1 minute
  max: config.rateLimitMaxSubmissions, // e.g. 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => extractClientIp(req),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many submissions received from this IP address. Please slow down.'
    });
  }
});

module.exports = {
  authRateLimiter,
  submissionRateLimiter
};
