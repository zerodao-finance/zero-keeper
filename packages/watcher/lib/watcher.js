"use strict";

// only run one of these

const { UnderwriterTransferRequest } = require("zero-protocol/dist/lib/zero");
const ethers = require('ethers');

const encodeControllerTransferRequestRepay = (transferRequest, queryResult) => {
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

const encodeVaultTransferRequestRepay = (transferRequest, queryResult) => {
  const contractInterface = new ethers.utils.Interface([
    "function repay(address, address, uint256, uint256, bytes, address, bytes32, bytes)",
  ]);
  return contractInterface.encodeFunctionData("repay", [
    transferRequest.module,
    transferRequest.destination(),
    transferRequest.amount,
    transferRequest.pNonce,
    transferRequest.data,
    transferRequest.underwriter,
    queryResult.nHash,
    queryResult.signature,
  ]);
};

const CONTROLLER_DEPLOYMENTS = {
  "0x9880fCd5d42e8F4c2148f2c1187Df050BE3Dbd17": 42161,
  "0x951E0dDe1fbe4AD1E9C027F46b653BAD2D99828d": 137,
  "0xa8BD3FfEbF92538b3b830DD5B2516A5111DB164D": 1,
  "0x1ec2Abe3F25F5d48567833Bf913f030Ec7a948Ba": 43114,
  "0x5556834773F7c01e11a47449D56042cDF6Df9128": 10
};

const VAULT_DEPLOYMENTS = {
  [ethers.constants.AddressZero]: 1337,
};

const getChainId = (request, deployments) => {
  return (
    deployments[ethers.utils.getAddress(request.contractAddress)] ||
    (() => {
      throw Error("no chain id found: " + request.contractAddress);
    })()
  );
};

const WatcherProcess = (exports.WatcherProcess = class WatcherProcess {
  Error = false;
  constructor({ logger, redis }) {
    Object.assign(this, {
      logger,
      redis,
    });
  }

  async run() {
    try {
      if (await this.redis.llen("/zero/watch")) {
        const request = await this.redis.lindex("/zero/watch", 0);
        const tr = JSON.parse(request);
        const transferRequest = new UnderwriterTransferRequest(tr.transferRequest);
        const { signature, amount, nHash, pHash } =
          await transferRequest.waitForSignature();

        const contractAddress = ethers.utils.getAddress(transferRequest.contractAddress)
        
        if (
          CONTROLLER_DEPLOYMENTS[contractAddress]
        ) {
          await this.redis.rpush("/zero/dispatch", JSON.stringify({
            to: transferRequest.contractAddress,
            data: encodeControllerTransferRequestRepay(transferRequest, {
              signature,
              amount,
              nHash,
              pHash,
            }),
            chainId: getChainId(transferRequest, CONTROLLER_DEPLOYMENTS),
          }, null, 2));
        } else if(VAULT_DEPLOYMENTS[contractAddress]) {
          await this.redis.rpush("/zero/dispatch", JSON.stringify({
            to: transferRequest.contractAddress,
            data: encodeVaultTransferRequestRepay(transferRequest, {
              signature,
              amount,
              nHash,
              pHash,
            }),
            chainId: getChainId(transferRequest, VAULT_DEPLOYMENTS),
          }, null, 2));
        }
        
        await this.redis.lpop("/zero/watch");
      }
    } catch (error) {
      this.logger.error(error);
      return;
    }
  }

  async runLoop() {
    while (true) {
      await this.run();
      await this.timeout(1000);
    }
  }
  async timeout(ms) {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  }
});
