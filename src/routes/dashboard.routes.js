const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/overview', dashboardController.getOverview);
router.get('/submissions', dashboardController.getSubmissions);
router.get('/widgets/:widgetId/stats', dashboardController.getWidgetStats);

module.exports = router;
