const notificationService = require('../services/notification.service');
const config = require('../config');
const logger = require('../utils/logger');

let isRunning = false;
let timerId = null;

async function runWorkerCycle() {
  if (!isRunning) return;
  try {
    const processed = await notificationService.processPendingJobs(10);
    if (processed > 0) {
      logger.info(`Worker processed ${processed} background notification job(s)`);
    }
  } catch (err) {
    logger.error('Error occurred in background worker cycle', err);
  } finally {
    if (isRunning) {
      timerId = setTimeout(runWorkerCycle, config.jobPollIntervalMs);
    }
  }
}

function startWorker() {
  if (isRunning) return;
  isRunning = true;
  logger.info(`Starting background notification worker (poll interval: ${config.jobPollIntervalMs}ms)`);
  runWorkerCycle();
}

function stopWorker() {
  isRunning = false;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  logger.info('Background notification worker stopped');
}

module.exports = {
  startWorker,
  stopWorker,
  runWorkerCycle
};
