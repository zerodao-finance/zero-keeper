'use strict';

const redis = new (require("ioredis"))();

const { createLogger } = require('@zerodao/logger');
const packageJson = require('../package');
const logger = createLogger(packageJson.name);
const { WatcherProcess } = require('../lib/watcher');


(async () => {
  const watcherProcess = new WatcherProcess({
    redis,
    logger
  });
  await watcherProcess.runLoop();
})().catch(console.error);
