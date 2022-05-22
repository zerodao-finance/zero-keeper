"use strict";
const Redis = require("ioredis");
const redis = new Redis({host: 'redis-server', port: 6379})

const {
    UnderwriterTransferRequest,
    UnderwriterBurnRequest
} = require('zero-protocol');

const requestTypes = {
    transfer: {
        underlyingClass: UnderwriterTransferRequest,
        funcs: ["loan", "repay"],
        handler: "handleTransferRequest"
    },
    burn: {
        underlyingClass: UnderwriterBurnRequest,
        funcs: ["burn"],
        handler: "handleBurnRequest"
    }
};



exports.WatcherClass = class WatcherClass {
    constructor(){
        this.runNext = true
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
                    return {}
                }
            });
        }
        return request
    }

    async wait() {
	    const [_request] = await redis.blmpop(0, 1, ['/zero/requests'])
        let request;
        try {
            request = JSON.parse(_request);
            console.log(request) // testing needs to be removed
        } catch (e) {
            console.error("error parsing request")            
        }
        return this.formatRequest(request)
    }

    async handleTransferRequest(request) {
        await redis.lpush('/zero/pending', request)
    }

    async handleBurnRequest(request) {
        await redis.lpush('/zero/dispatch', request)
    }

    async run() {
        const request = await this.wait();
        await this[request.handler](request);
        if (this.runNext) this.run();
    }
}

