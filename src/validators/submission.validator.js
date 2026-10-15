const { z } = require('zod');

const HONEYPOT_FIELDS = ['website', 'company_website', '_honeypot'];

const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Validates untrusted submission payload against widget configuration
 * @param {object} payload - Incoming body
 * @param {Array} configuredFields - Widget fields list from database
 * @returns {{ isValid: boolean, isSpam: boolean, cleanData: object, errors: Array }}
 */
function validateSubmission(payload, configuredFields = []) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      isValid: false,
      isSpam: false,
      cleanData: {},
      errors: ['Invalid payload format, JSON object expected']
    };
  }

  // 1. Check for spam / honeypot
  for (const honeypot of HONEYPOT_FIELDS) {
    if (payload[honeypot] && String(payload[honeypot]).trim() !== '') {
      return {
        isValid: false,
        isSpam: true,
        cleanData: {},
        errors: ['Spam detected via honeypot trap']
      };
    }
  }

  const errors = [];
  const cleanData = {};

  // 2. Validate against configured fields
  for (const field of configuredFields) {
    const rawVal = payload[field.name];
    const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';

    // Check required
    if (field.required && !strVal) {
      errors.push(`Field '${field.label || field.name}' is required`);
      continue;
    }

    if (!strVal) {
      // Optional field omitted
      continue;
    }

    // Length check: max 1000 characters per field to prevent buffer/DOS abuse
    if (strVal.length > 1000) {
      errors.push(`Field '${field.label || field.name}' exceeds maximum allowed length of 1000 characters`);
      continue;
    }

    // Type checks
    if (field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(strVal)) {
        errors.push(`Field '${field.label || field.name}' must be a valid email address`);
        continue;
      }
    } else if (field.type === 'tel') {
      const telRegex = /^[0-9+\-()\s]{6,25}$/;
      if (!telRegex.test(strVal)) {
        errors.push(`Field '${field.label || field.name}' must be a valid phone number`);
        continue;
      }
    } else if (field.type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
      if (!field.options.includes(strVal)) {
        errors.push(`Field '${field.label || field.name}' contains an invalid selection`);
        continue;
      }
    }

    cleanData[field.name] = strVal;
  }

  return {
    isValid: errors.length === 0,
    isSpam: false,
    cleanData,
    errors
  };
}

module.exports = {
  uuidSchema,
  validateSubmission,
  HONEYPOT_FIELDS
};
