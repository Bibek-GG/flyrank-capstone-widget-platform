/**
 * IP extraction utility
 * Sanitizes and normalizes client IP, handling proxies, IPv6 loopbacks, and private ranges safely
 */

const PRIVATE_OR_LOOPBACK_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i
];

/**
 * Extract the best client IP safely
 * @param {import('express').Request} req 
 * @returns {string}
 */
function extractClientIp(req) {
  // If behind a trusted reverse proxy, express sets req.ip
  let ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';

  // Normalize IPv4-mapped IPv6 address (e.g., "::ffff:127.0.0.1" -> "127.0.0.1")
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // Handle localhost IPv6
  if (ip === '::1') {
    ip = '127.0.0.1';
  }

  return ip;
}

/**
 * Determine if an IP address is a private, loopback, or reserved address
 * @param {string} ip 
 * @returns {boolean}
 */
function isPrivateOrLoopbackIp(ip) {
  if (!ip) return true;
  const cleanIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
  return PRIVATE_OR_LOOPBACK_RANGES.some(regex => regex.test(cleanIp));
}

module.exports = {
  extractClientIp,
  isPrivateOrLoopbackIp
};
