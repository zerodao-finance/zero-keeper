const Redis = require("ioredis")
const redis = new Redis()
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



class Watcher {

    constructor({}){
        this.runNext = true

    }


    async wait() {
	    const [_request] = await redis.blmpop(0, 1, ['/zero/requests'])
        let request;
        try {
            request = JSON.parse(_request);
        } catch (e) {
            console.error("error parsing request")            
        }
        return this.formatRequest(request)
    }

    async run() {
        const request = await this.wait();
        await this[request.handler](request);
        if (this.runNext) this.run();
    }
}
