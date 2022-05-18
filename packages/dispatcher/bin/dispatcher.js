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

class Dispatcher {
  /*
   * not sure whether to build out signer like this or to use hardhat
   */
  constructor({ rpcUrl, pvtKey, preset, target }) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(pvtKey, provider);
    this.preset = preset;
    this.runNext = true;
  }
  /*
   * formats and returns requests based on their class and decorates them as needed
   */
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
  /*
   * fetches the next request in queue, formats it and returns it
   */
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

  /*
   * executes the request after prerequisites are met
   */
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

  /*
   * needs to be rewritten a bit
   * as of now, executes it similar to the older keeper, but needs to work with the inflight queue
   */
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
  async handleBurnRequest(request) {
    const { execute } = this;
    await execute(request);
  }
  /*
   * runs in a loop by recursing itself if this.runNext is true
   */
  async run() {
    const request = await this.wait();
    await this[request.handler](request);
    if (this.runNext) this.run();
  }
}

module.exports = Dispatcher;
