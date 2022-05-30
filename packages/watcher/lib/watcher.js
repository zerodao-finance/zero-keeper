"use strict";

// only run one of these

const encodeTransferRequestRepay = (transferRequest, queryResult) => {
  const contractInterface = new ethers.utils.Interface([
    "function repay(address, address, address, uint256, uint256, uint256, address, bytes32, bytes, bytes)",
  ]);
  return contractInterface.encodeFunctionData("repay", [
    transferRequest.underwriter,
    transferRequest.destination(),
    transferRequest.asset,
    transferRequest.amount,
    queryResult.amount,
    transferRequest.pNonce,
    transferRequest.module,
    queryResult.nHash,
    transferRequest.data,
    queryResult.signature,
  ]);
};
const CONTROLLER_DEPLOYMENTS = {
  "0x53f38bEA30fE6919e0475Fe57C2629f3D3754d1E": 42161,
  "0x85dAC4da6eB28393088CF65b73bA1eA30e7e3cab": 137,
  "0xa8BD3FfEbF92538b3b830DD5B2516A5111DB164D": 1,
};

const getChainId = (request) => {
  return (
    CONTROLLER_DEPLOYMENTS[ethers.utils.getAddress(request.contractAddress)] ||
    (() => {
      throw Error("no controller found: " + request.contractAddress);
    })()
  );
};

const WatcherProcess = (exports.WatcherProcess = class WatcherProcess {
  constructor({ logger, redis }) {
    Object.assign(this, {
      logger,
      redis,
    });
  }
  async runLoop() {
    while (true) {
      try {
        if (!(await this.redis.llen())) {
          await this.timeout(1000);
          continue;
        }
        const { request } = await this.redis.lindex("/zero/watch", 0);
        const transferRequest = new UnderwriterTransferRequest(request);
        const { signature, amount, nHash, pHash } =
          await transferRequest.waitForSignature();
        await this.redis.rpush("/zero/dispatch", {
          to: transferRequest.contractAddress,
          data: encodeTransferRequestRepay(transferRequest, {
            signature,
            amount,
            nHash,
            pHash,
          }),
          chainId: getChainId(transferRequest),
        });
        await this.redis.ldel("/zero/watch", 0);
      } catch (e) {
        this.logger.error(e);
      }
    }
  }
  async timeout(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
});
