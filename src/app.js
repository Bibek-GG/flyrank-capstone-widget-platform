const express = require('express');
const path = require('path');
const { helmetMiddleware, corsMiddleware } = require('./middleware/security.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler.middleware');

const authRoutes = require('./routes/auth.routes');
const widgetRoutes = require('./routes/widget.routes');
const publicRoutes = require('./routes/public.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// Security headers and CORS
app.use(helmetMiddleware);
app.use(corsMiddleware);

// Payload size limit (Strict 10KB restriction to mitigate DOS/buffer overflow)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Versioned Widget Static Assets with Immutable Caching
app.get('/widget.v1.js', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, '../public/widget/widget.v1.js'));
});

app.get('/widget.v1.css', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, '../public/widget/widget.v1.css'));
});

// Static files for dashboard and test site
app.use('/dashboard', express.static(path.join(__dirname, '../public/dashboard')));
app.use('/test-site', express.static(path.join(__dirname, '../public/test-site')));

// Root route redirects to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/widgets', widgetRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 and Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
