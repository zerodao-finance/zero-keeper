const { WatcherClass } = require('../lib/core');
(async () => {
    //watcher process
    watcher = new WatcherClass()
    console.log("watcher proc started...")

})().catch(console.error)