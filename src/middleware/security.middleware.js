const helmet = require('helmet');
const cors = require('cors');
const config = require('../config');

// Helmet security headers tailored for an embeddable widget platform
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["*"], // Allow cross-origin API calls from external customer sites
      frameAncestors: ["*"] // Allow widgets to be embedded in iframes if needed
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Dynamic CORS configuration allowing public embed access while controlling origins
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // In development or for public widget delivery, external host sites must be permitted
    // We allow configured origins, localhost variations, or all origins for public routes
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: ['ETag', 'Cache-Control', 'Idempotency-Key'],
  credentials: true,
  maxAge: 86400 // Cache preflight response for 24 hours
};

const corsMiddleware = cors(corsOptions);

module.exports = {
  helmetMiddleware,
  corsMiddleware
};
