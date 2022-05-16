const redis = require('ioredis')(process.env.REDIS_URI)
import _ from 'lodash'

/**
 * @static wait { Promise }
 * @returns TransferRequest | BurnRequest | MetaRequest 
 */
class Dispatcher {
    static create(){ 
        return new Dispatcher()
    }

    static wait(){ 
        Promise((resolve, reject) => {
            while (true) {
                if (redis.llen('/zero/request') !== 0) break;
            }
            console.log(`received message from keeper`)
            resolve(redis.lpop('/zero/request'))
        })
    }
    
    constructor(){
        
    }
}