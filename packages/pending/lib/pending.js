"use strict";

const {
  UnderwriterTransferRequest,
} = require("zero-protocol/dist/lib/UnderwriterRequest");
const ethers = require("ethers");
const { Networks, Opcode, Script } = require("bitcore-lib");
const util = require("util");
const { RenJS } = require("@renproject/ren");
const { getUTXOs } =
  require("send-crypto/build/main/handlers/BTC/BTCHandler").BTCHandler;

const ren = new RenJS("mainnet");

const encodeTransferRequestLoan = (transferRequest) => {
  const contractInterface = new ethers.utils.Interface([
    "function loan(address, address, uint256, uint256, address, bytes, bytes)",
  ]);
  return contractInterface.encodeFunctionData("loan", [
    new UnderwriterTransferRequest(transferRequest).destination(),
    transferRequest.asset,
    transferRequest.amount,
    transferRequest.pNonce,
    transferRequest.module,
    transferRequest.data,
    transferRequest.signature,
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

const {
  generateSHash,
  generateGHash,
} = require("@renproject/utils/build/main/renVMHashes");

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

/*
const computeGatewayAddress = (transferRequest, mpkh) =>
  new Script()
    .add(Buffer.from(stripHexPrefix(computeGHash(transferRequest)), "hex"))
    .add(Opcode.OP_DROP)
    .add(Opcode.OP_DUP)
    .add(Opcode.OP_HASH160)
    .add(Buffer.from(stripHexPrefix(mpkh), "hex"))
    .add(Opcode.OP_EQUALVERIFY)
    .add(Opcode.OP_CHECKSIG)
    .toScriptHashOut()
    .toAddress(false)
    .toString();

*/

const {
  BitcoinClass,
} = require("@renproject/chains-bitcoin/build/main/bitcoin");
const computeGatewayAddress = (transferRequest, mpkh) =>
  new BitcoinClass("mainnet").getGatewayAddress(
    "BTC",
    Buffer.from(mpkh.substr(2), "hex"),
    Buffer.from(computeGHash(transferRequest), "hex")
  );

const getBTCBlockNumber = async () => 0; // unused anyway
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

const lodash = require("lodash");

const seen = {};
const logGatewayAddress = (logger, v) => {
  if (!seen[v]) logger.info("gateway: " + v);
  seen[v] = true;
};

const PendingProcess = (exports.PendingProcess = class PendingProcess {
  constructor({ redis, logger, mpkh }) {
    this.redis = redis;
    this.logger = logger;
    this.mpkh =
      (mpkh && Promise.resolve(mpkh)) || ren.renVM.selectPublicKey("BTC"); // TODO: figure out the right RenJS function to call to get mpkh
  }
  async runLoop() {
    while (true) {
      await this.run();
      await this.timeout(1000);
    }
  }
  async run() {
    const mpkh = ethers.utils.hexlify(await this.mpkh);
    // process first item in list
    const len = await this.redis.llen("/zero/pending");
    for (let i = 0; i < len; i++) {
      try {
        const item = await this.redis.lindex("/zero/pending", i);
        const transferRequest = JSON.parse(item);
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
          if (
            !CONTROLLER_DEPLOYMENTS[ethers.utils.getAddress(transferRequest.contractAddress)]
          )
            await this.redis.lpush("/zero/dispatch", JSON.stringify({
              to: transferRequest.contractAddress,
              data: encodeTransferRequestLoan(transferRequest),
              chainId: getChainId(transferRequest),
            }));
          await this.redis.rpush(
            "/zero/watch",
            JSON.stringify({
              blockNumber,
              transferRequest,
            })
          );
          await this.redis.lpop("/zero/pending");
        }
      } catch (error) {
        return this.logger.error(error);
      }
      await this.timeout(1000);
    }
  }
  // rotate the list

  async timeout(ms) {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  }
  // async runLoop() {
  //   const mpkh = await this.mpkh;
  //   const length = await this.redis.llen("/zero/pending");
  //   while (true) {
  //     try {
  //       for (let i = 0; i < length; i++) {
  //         const item = await this.redis.lindex("/zero/pending", i);
  //         try {
  //           const transferRequest = JSON.parse(item);
  //           const gatewayAddress = computeGatewayAddress(transferRequest, mpkh);
  //           const blockNumber = await getBTCBlockNumber(); // TODO: implement getBTCBlockNumber using blockdaemon shared node
  //           const utxos = await getUTXOs({
  //             address: gatewayAddress,
  //             confirmations: 1,
  //           });
  //           if (utxos && utxos.length) {
  //             await this.redis.ldel("/zero/pending", i);
  //             if (
  //               transferRequest.contractAddress !==
  //               BadgerBridgeZeroController.address
  //             )
  //               await this.redis.lpush("/zero/dispatch", {
  //                 to: transferRequest.contractAddress,
  //                 data: encodeTransferRequestLoan(transferRequest),
  //                 chainId: getChainId(transferRequest),
  //               }); // TODO: implement encodeTransferRequestLoan
  //             await this.redis.rpush(
  //               "/zero/watch",
  //               JSON.stringify({
  //                 blockNumber,
  //                 transferRequest,
  //               })
  //             );
  //           }
  //         } catch (e) {
  //           this.logger.error(e);
  //         }
  //         await this.timeout(500); // Probably won't get rate limited
  //       }
  //       await this.timeout(500);
  //     } catch (e) {
  //       this.logger.error(e);
  //     }
  //   }
  // }
});
