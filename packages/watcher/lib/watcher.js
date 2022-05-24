'use strict';
import { UnderwriterTransferRequest, UnderwriterBurnRequest } from "zero-protocol/dist/lib/zero";
import { requestTypes } from './requestTypes'
import { ethers } from 'ethers'

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
  };
  async encodeRequest(type, _r){
    switch( type ) {
      case 'transfer':
        const { signature, amount, nHash, pHash } = _r.waitForSignature()
        let encoded = '' //TODO: implement
        return ['/zero/pending', encoded]
        break
      case 'burn':
        return ['/zero/dispatch', _r]
    }
    return [ queue, encoded ]
  }

  async runLoop() {
    while (true) {
      try {
        const [_request] = await this.redis.blpop(['/zero/request'])
        const {request} = JSON.parse(_request)
        this.logger(`request recieved, processing new ${request.requestType} request`)
        this.redis.lpush(...(await this.encodeRequest(request.requestType, (requestTypes[request.requestType]).underlyingClass(request))))
      } catch ( error ) {
        console.log("error processing request")
      }

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
    }
  };
  async timeout(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}


