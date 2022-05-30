'use strict';
const { UnderwriterTransferRequest, UnderwriterBurnRequest } = require("zero-protocol/dist/lib/zero");
const BadgerBridgeZeroController = require("zero-protocol/dist/deployments/mainnet/BadgerBridgeZeroController.json");
const { requestTypes } = require('./requestTypes');
const { ethers } = require('ethers');

// only run one of these
const WatcherProcess = exports.WatcherProcess = class WatcherProcess {
  error = false
  constructor({
    logger,
    redis
  }) {
    Object.assign(this, {
      logger,
      redis
    });
  };

  async encodeRequest(type, _r){
    switch( type ) {
      case 'transfer':
        try {
          let _request = new ((requestTypes[type]).underlyingClass)(_r)
          console.log(_request)

          // const iface = new ethers.utils.Interface(BadgerBridgeZeroController.abi)
          // const { signature, amount, nHash, pHash } = await _request.waitForSignature()
          // console.log(signature, amount, nHash, pHash)
          // let encoded = iface.encodeFunctionData("repay", [
          //   _r["underwriter"],
          //   _r["to"],
          //   _r["asset"],
          //   _r["amount"],
          //   amount,
          //   _r["pNonce"],
          //   _r["module"],
          //   nHash,
          //   _r["data"],
          //   _r["signature"]
          // ])
          // return ["/zero/pending", encoded]
        } catch (error) {
          console.log("ERROR")
          console.log("ERROR", _r)
          console.log("Error", error)
        }
        break;
      case 'burn':
        return ['/zero/dispatch', _r]
        break;
    }
  }
  async wait() {
    try {
      const [type, _r] = await this.redis.blpop('/zero/request', 0)
      const _request = JSON.parse(_r)
      await this.encodeRequest(_request.requestType, _request)
      // this.redis.lpush(...(await this.encodeRequest(_request.requestType, _request)))
    } catch ( error ) {
      console.log(error, "error processing watcher request")
    }
  }

  async run() {
    const request = await this.wait()
    if (!this.error) {
      await this.run()
    }
  }
  async runLoop() {

      // try { 
      //   if (!(await this.redis.llen())) {
      //     await this.timeout(1000);
      //     continue;
      //   }

      //   const {
      //     request
      //   } = await this.redis.lindex('/zero/watch', 0);
      //   const transferRequest = new UnderwriterTransferRequest(request);
      //   const { signature, amount, nHash, pHash } = await transferRequest.waitForSignature();
      //   await this.redis.rpush('/zero/dispatch', encodeTransferRequestRepay(transferRequest, { signature, amount, nHash, pHash })); // TODO: implement
      //   // TODO: BURN NEEDS TO GET PUT IN THE DISPATCH QUEUE IMMEDIATELY
      //   // TODO: TRANSFER GOES RIGHT TO PENDING QUEUE. AS LONG AS TRY-CATCHED PROPERLY IT CAN GO IN KEEPER PROCESS
      //   await this.redis.ldel('/zero/watch', 0);
      // } catch (e) {
      //   this.logger.error(e);
      // }
  
  };
  async timeout(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}


