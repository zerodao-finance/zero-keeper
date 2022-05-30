const { PendingProcess } = require('../lib/pending');
const redis = new (require('ioredis'))();

(async () => {
  const pendingProcess = new PendingProcess({
    redis
  });
  await pendingProcess.runLoop();
})().catch(console.error);
