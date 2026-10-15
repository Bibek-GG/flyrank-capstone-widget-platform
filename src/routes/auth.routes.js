const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validation.middleware');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const { authRateLimiter } = require('../middleware/rateLimiter.middleware');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/register', authRateLimiter, validate(registerSchema, 'body'), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema, 'body'), authController.login);
router.get('/me', requireAuth, authController.me);

module.exports = router;
