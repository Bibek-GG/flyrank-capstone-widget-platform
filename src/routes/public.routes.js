const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');
const { submissionRateLimiter } = require('../middleware/rateLimiter.middleware');

// Public widget configuration endpoint
router.get('/widgets/:widgetId/config', publicController.getConfig);

// Public lead submission endpoint with rate limiting
router.post('/widgets/:widgetId/submissions', submissionRateLimiter, publicController.submitLead);

module.exports = router;
