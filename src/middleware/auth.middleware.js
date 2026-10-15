const { verifyToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Missing or malformed Bearer token.'
    });
  }

  const token = authHeader.substring(7).trim();
  const decoded = verifyToken(token);

  if (!decoded || !decoded.userId) {
    return res.status(401).json({
      error: 'Invalid or expired authentication token.'
    });
  }

  // Verify user still exists
  const user = await userRepository.findById(decoded.userId);
  if (!user) {
    return res.status(401).json({
      error: 'User account not found or has been removed.'
    });
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name
  };

  next();
}

module.exports = {
  requireAuth
};
