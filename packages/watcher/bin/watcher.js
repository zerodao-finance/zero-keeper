const Redis = require("ioredis");
const redis = new Redis();
const { WatcherProcess } = require('../lib/watcher');
const { createLogger } = require('@zerodao/logger');
const packageJson = require('../package');
const logger = createLogger(packageJson.name);
(async () => {
        let watcher = new WatcherProcess({logger, redis})
        watcher.run()
    }
)()
