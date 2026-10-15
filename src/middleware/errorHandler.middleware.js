const logger = require('../utils/logger');

function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
}

function errorHandler(err, req, res, next) {
  // Handle payload too large (e.g. from express.json limit)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body exceeds the maximum permissible limit of 10KB.'
    });
  }

  // Handle JSON parsing syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Malformed JSON',
      message: 'The request body contains invalid JSON syntax.'
    });
  }

  // Handle known bad request errors
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      error: err.message || 'Bad Request',
      message: err.message || 'Bad Request',
      details: err.details || undefined
    });
  }

  // Log server internal error with details safely
  logger.error('Unhandled internal server error', err);

  // Return clean, safe 500 response without internal database/stack leak
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected internal error occurred. Please contact support.'
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
