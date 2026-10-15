const express = require('express');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');

const app = express();

// Serve customer test website on origin http://localhost:5500
app.use(express.static(path.join(__dirname, '../public/test-site')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/test-site/index.html'));
});

const server = app.listen(config.testSitePort, () => {
  logger.info(`Customer Test Website running on separate origin: http://localhost:${config.testSitePort}`);
  logger.info(`This demonstrates cross-origin widget execution connecting to API on port ${config.port}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());

module.exports = server;
