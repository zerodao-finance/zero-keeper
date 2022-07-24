"use strict";

const {
  UnderwriterTransferRequest,
} = require("zero-protocol/dist/lib/UnderwriterRequest");
const ethers = require("ethers");
const { Networks, Opcode, Script } = require("bitcore-lib");
const util = require("util");
const { getUTXOs } =
  require("send-crypto/build/main/handlers/BTC/BTCHandler").BTCHandler;


const encodeVaultTransferRequestLoan = (transferRequest) => {
  const contractInterface = new ethers.utils.Interface([
    "function loan(address, address, uint256, uint256, bytes)",
  ]);
  return contractInterface.encodeFunctionData("loan", [
    transferRequest.module,
    new UnderwriterTransferRequest(transferRequest).destination(),
    transferRequest.amount,
    transferRequest.pNonce,
    transferRequest.data,
  ]);
};

const cache = {};
const getGateway = async (request) => {
  const { nonce } = request;
  if (cache[nonce]) return cache[nonce];
  else {
    cache[nonce] = await new UnderwriterTransferRequest(
      request
    ).submitToRenVM();
    return cache[nonce];
  }
};

const computePHash = (transferRequest) => {
  return ethers.utils.solidityKeccak256(
    ["bytes"],
    [
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "address", "bytes"],
        [
          new UnderwriterTransferRequest(transferRequest).destination(),
          transferRequest.pNonce,
          transferRequest.module,
          transferRequest.data,
        ]
      ),
    ]
  );
};


const toSelector = (address) => {
  return "BTC0Btc2Eth"; // TODO: implement switch over all networks
};

const toSourceAsset = (transferRequest) => {
  return "0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D"; // TODO: implement other assets and different chains
};

const ln = (v) => (console.log(v), v);
const computeGHash = (transferRequest) => {
  return ln(
    ethers.utils.solidityKeccak256(
      ["bytes"],
      [
        ethers.utils.defaultAbiCoder.encode(
          ["bytes32", "address", "address", "bytes32"],
          ln([
            computePHash(transferRequest),
            toSourceAsset(transferRequest),
            transferRequest.contractAddress,
            transferRequest.nonce,
          ])
        ),
      ]
    )
  );
};

const addHexPrefix = (s) => (s.substr(0, 2) === "0x" ? s : "0x" + s);

const stripHexPrefix = (s) => (s.substr(0, 2) === "0x" ? s.substr(2) : s);


const getBTCBlockNumber = async () => 0; // unused anyway

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

const lodash = require("lodash");

const seen = {};
const logGatewayAddress = (logger, v) => {
  if (!seen[v]) logger.info("gateway: " + v);
  seen[v] = true;
};

const MS_IN_DAY = 86400000

const PendingProcess = (exports.PendingProcess = class PendingProcess {
  constructor({ redis, logger }) {
    this.redis = redis;
    this.logger = logger;
  }
  async runLoop() {
    while (true) {
      await this.run();
      await this.timeout(1000);
    }
  }

  async run() {
    // process first item in list
    for (let i = 0; i < await this.redis.llen('/zero/pending'); i++) {
      try {
        const item = await this.redis.lindex("/zero/pending", i);
        const transferRequest = JSON.parse(item);

        const daysElapsed = Math.floor((new Date().getTime() - transferRequest.timestamp) / MS_IN_DAY)
        if(daysElapsed >= 2){
          const removed = await this.redis.lrem("/zero/pending", 1, item);
          if (removed) i--;
          continue;
        }

        const gateway = await getGateway(transferRequest);
        logGatewayAddress(this.logger, gateway.gatewayAddress);
        const blockNumber = await getBTCBlockNumber();
        const utxos = await getUTXOs(false, {
          address: gateway.gatewayAddress,
          confirmations: 1,
        });

        if (utxos && utxos.length) {
          this.logger.info("got UTXO");
          this.logger.info(util.inspect(utxos, { colors: true, depth: 15 }));
          
          const contractAddress = ethers.utils.getAddress(transferRequest.contractAddress)

          if(VAULT_DEPLOYMENTS[contractAddress]) {
            await this.redis.lpush("/zero/dispatch", JSON.stringify({
              to: transferRequest.contractAddress,
              data: encodeVaultTransferRequestLoan(transferRequest),
              chainId: getChainId(transferRequest, VAULT_DEPLOYMENTS),
            }));
          }

          await this.redis.rpush(
            "/zero/watch",
            JSON.stringify({
              blockNumber,
              transferRequest,
            })
          );
          const removed = await this.redis.lrem("/zero/pending", 1, item);
          if (removed) i--;
        }
      } catch (error) {
        return this.logger.error(error);
      }
      await this.timeout(1000);
    }
  }

  async timeout(ms) {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  }
});
