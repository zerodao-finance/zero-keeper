/**
 * spec
 * 
 * watcher should 'zero/request' redis queue for transactions
 * pushes to dispatch queue when signatures received
 */

const redis = require("ioredis")(process.env.REDIS_URI);

//watch TransferRequests until ready for dispatch
//send BurnRequests directly to dispatch queue

class Watcher {

    constructor() {

    }

    async stream() {
        //TODO: injest redis list
        //TODO: process requests accordingly
    }

    async sinkDispatch(data) {
        await redis.lpush('/zero/dispatch', data)
    }

    async sinkUTXO() {
        await redis.lpush('/zero/in-flight')
    }
}