const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  testSitePort: parseInt(process.env.TEST_SITE_PORT || '5500', 10),
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
  
  // Database configuration
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/flyrank_widget_platform',
  testDatabaseUrl: process.env.TEST_DATABASE_URL || null,
  
  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_do_not_use_in_production_xyz123',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // CORS Configuration
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:4000')
    .split(',')
    .map(origin => origin.trim()),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 min
  rateLimitMaxSubmissions: parseInt(process.env.RATE_LIMIT_MAX_SUBMISSIONS || '30', 10),
  rateLimitMaxAuth: parseInt(process.env.RATE_LIMIT_MAX_AUTH || '15', 10),

  // Geolocation enrichment providers
  geoProviderAUrl: process.env.GEO_PROVIDER_A_URL || 'http://ip-api.com/json',
  geoProviderBUrl: process.env.GEO_PROVIDER_B_URL || 'https://ipapi.co',
  geoTimeoutMs: parseInt(process.env.GEO_TIMEOUT_MS || '2500', 10),
  geoProviderASimulateFail: process.env.GEO_PROVIDER_A_SIMULATE_FAIL === 'true',
  geoProviderBSimulateFail: process.env.GEO_PROVIDER_B_SIMULATE_FAIL === 'true',

  // Background Notification Job Worker
  notificationMode: process.env.NOTIFICATION_MODE || 'console', // 'console', 'email', 'simulate_fail'
  jobPollIntervalMs: parseInt(process.env.JOB_POLL_INTERVAL_MS || '2000', 10),
  jobMaxAttempts: parseInt(process.env.JOB_MAX_ATTEMPTS || '3', 10),
  notificationSimulateFail: process.env.NOTIFICATION_SIMULATE_FAIL === 'true',

  // Idempotency settings
  idempotencyTtlSeconds: parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '86400', 10)
};

module.exports = config;
