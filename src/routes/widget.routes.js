const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widget.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createWidgetSchema, updateWidgetSchema } = require('../validators/widget.validator');

// All widget management routes require authentication
router.use(requireAuth);

router.post('/', validate(createWidgetSchema, 'body'), widgetController.create);
router.get('/', widgetController.list);
router.get('/:id', widgetController.getById);
router.patch('/:id', validate(updateWidgetSchema, 'body'), widgetController.update);
router.delete('/:id', widgetController.delete);
router.get('/:id/embed', widgetController.getEmbedSnippet);

module.exports = router;
