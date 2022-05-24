/**
 * spec
 * 
 * watcher should 'zero/request' redis queue for transactions
 * pushes to dispatch queue when signatures received
 */

const Redis = require("ioredis");
const redis = new Redis({ host: 'redis' })

const { WatcherProcess } = require('../lib/watcher');
import { createLogger } from '../../logger/lib/logger'
//watch TransferRequests until ready for dispatch
//send BurnRequests directly to dispatch queue

let watcher = new WatcherProcess(createLogger(), redis)
watcher.runLoop()
