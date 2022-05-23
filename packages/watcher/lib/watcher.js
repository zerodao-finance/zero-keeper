'use strict';
import { UnderwriterTransferRequest } from "zero-protocol/dist/lib/zero";

// only run one of these
const WatcherProcess = exports.WatcherProcess = class WatcherProcess {
  constructor({
    logger,
    redis
  }) {
    Object.assign(this, {
      logger,
      redis
    });
  }
  async runLoop() {
    while (true) {
      try {
        if (!(await this.redis.llen())) {
          await this.timeout(1000);
          continue;
	}
  const {
    request
	} = await this.redis.lindex('/zero/watch', 0);
        const transferRequest = new UnderwriterTransferRequest(request);
        const { signature, amount, nHash, pHash } = await transferRequest.waitForSignature();
        await this.redis.rpush('/zero/dispatch', encodeTransferRequestRepay(transferRequest, { signature, amount, nHash, pHash })); // TODO: implement
        // BURN NEEDS TO GET PUT IN THE DISPATCH QUEUE IMMEDIATELY
        // TRANSFER GOES RIGHT TO PENDING QUEUE. AS LONG AS TRY-CATCHED PROPERLY IT CAN GO IN KEEPER PROCESS
        await this.redis.ldel('/zero/watch', 0);
      } catch (e) {
        this.logger.error(e);
      }
    }
  }
  async timeout(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}


