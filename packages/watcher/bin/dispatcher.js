const redis = require("ioredis")(process.env.REDIS_URI);
const ethers = require("ethers");
const {
  UnderwriterTransferRequest,
  UnderwriterBurnRequest,
} = require("zero-protocol");

const requestTypes = {
  transfer: {
    underlyingClass: UnderwriterTransferRequest,
    funcs: ["loan", "repay"],
    handler: "handleTransferRequest",
  },
  burn: {
    underlyingClass: UnderwriterBurnRequest,
    funcs: ["burn"],
    handler: "handleBurnRequest",
  },
};

/**
 * @static wait { Promise }
 * @returns TransferRequest | BurnRequest | MetaRequest
 * fetches request from dispatch queue
 *
 */
class Dispatcher {
  constructor({ rpcUrl, pvtKey, preset, target }) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(pvtKey, provider);
    this.preset = preset;
  }
  formatRequest(_r) {
    const requestType = requestTypes[_r.requestType];
    const request = new requestType.underlyingClass(_r);
    request.funcs = requestType.funcs;
    request.handler = requestType.handler;
    if (this.preset == "badger") {
      request.dry = async () => [];
      request.loan = async () => ({
        async wait() {
          return {};
        },
      });
    }
    return request;
  }
  async wait() {
    const [_request] = await redis.brpop("/zero/dispatch");
    let request;
    try {
      request = JSON.parse(_request);
    } catch (e) {
      console.error("Error parsing request");
    }
    return this.formatRequest(request);
  }
  async execute(request) {
    await request.funcs.reduce(async (_r, func) => {
      await _r;
      try {
        console.log("Executing:", func);
        const tx = await request[func](this.signer);
        const receipt = await tx.wait();
        console.log(func, "receipt: ", receipt);
      } catch (e) {
        console.error("Error on tx:", e);
      }
    }, Promise.resolve());
  }
  async handleTransferRequest(request) {
    const { execute } = this;
    console.log("Received Transfer Request", request);
    request.setProvider(this.provider);
    console.log("Submitting to renVM...");
    const mint = await request.submitToRenVM();
    console.log("Sucessfully submitted to renVM.");
    console.log("Gateway address is", await request.toGatewayAddress());
    await new Promise((resolve, reject) =>
      mint.on("deposit", async (deposit) => {
        console.log("Deposit received.");
        await resolve();
        const hash = deposit.txHash();
        const depositLog = (msg) =>
          console.log(`RenVM Hash: ${hash}\nStatus: ${deposit.status}\n${msg}`);

        await deposit
          .confirmed()
          .on("target", (target) => {
            depositLog(`0/${target} confirmations`);
          })
          .on("confirmation", async (confs, target) => {
            depositLog(`${confs}/${target} confirmations`);
            if (confs == LOAN_CONFIRMATION) {
              deposit.removeAllListeners("confirmation");
              await execute(request);
            }
          });

        await deposit.signed().on("status", (status) => {
          depositLog(`Status: ${status}`);
        });
      })
    );
  }
  async handleBurnRequest(request) {}
}
