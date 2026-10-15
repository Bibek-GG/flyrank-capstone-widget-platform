const { z } = require('zod');

const fieldSchema = z.object({
  name: z.string().trim().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Field name must be alphanumeric with underscores'),
  label: z.string().trim().min(1).max(100),
  type: z.enum(['text', 'email', 'tel', 'textarea', 'select', 'checkbox']),
  required: z.boolean().default(false),
  placeholder: z.string().max(100).optional(),
  options: z.array(z.string().max(100)).optional()
});

const displaySettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('dark'),
  primaryColor: z.string().max(30).optional(),
  borderRadius: z.string().max(20).optional(),
  position: z.enum(['embed', 'popup']).default('embed')
}).passthrough();

const createWidgetSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
  type: z.enum(['signup', 'contact', 'cta'], {
    errorMap: () => ({ message: "Type must be 'signup', 'contact', or 'cta'" })
  }),
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional().default(''),
  button_text: z.string().trim().min(1).max(100).optional().default('Submit'),
  fields: z.array(fieldSchema).default([]),
  display_settings: displaySettingsSchema.optional().default({}),
  status: z.enum(['enabled', 'disabled']).optional().default('enabled')
});

const updateWidgetSchema = createWidgetSchema.partial();

module.exports = {
  createWidgetSchema,
  updateWidgetSchema,
  fieldSchema
};
