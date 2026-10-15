/**
 * Zod validation middleware factory
 * @param {import('zod').ZodSchema} schema 
 * @param {'body'|'query'|'params'} source 
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.safeParse(dataToValidate);

      if (!parsed.success) {
        const issues = parsed.error.issues || parsed.error.errors || [];
        const formattedErrors = issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors
        });
      }

      // Replace with sanitized & typed parsed data
      req[source] = parsed.data;
      next();
    } catch (err) {
      return res.status(400).json({
        error: 'Malformed request data',
        message: err.message
      });
    }
  };
}

module.exports = {
  validate
};
