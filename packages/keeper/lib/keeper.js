const ethers = require('ethers')
function fromJSONtoBuffer(o) {
  return ethers.utils.arrayify(Buffer.from(JSON.stringify(o), 'utf8'));
}

exports.advertiseAsKeeper = async (p2p) => {
  const interval = setInterval(async () => {
    try {
      await p2p.pubsub.publish('zero.keepers', fromJSONtoBuffer({ address: (await p2p.addressPromise) }));
      // console.log(`advertising self as keeper: ${await p2p.addressPromise}`)
      // console.log(`Made presence known ${p2p.peerId.toB58String()}`)
    } catch (e) { console.error(e); }
  });
  return function unsubscribe() { clearInterval(interval) };
};
const lp = require('it-length-prefixed');
const pipe = require('it-pipe');

const pipeToString = async (stream) => {
  return await new Promise((resolve, reject) => {
    pipe(stream.source, lp.decode(), async (rawData) => {
      const string = [];
      try {
        for await (const msg of rawData) {
          string.push(msg.toString());
        }
      } catch (e) { return reject(e); }
      console.log(string.join())
      resolve(string.join());
    });
  });
};

exports.handleRequests = (p2p) => {
   p2p.handle('/zero/user/dispatch', async (duplex) => {
    try { 
      p2p.emit('zero:request', (await pipeToString(duplex.stream)));
    } catch (e) { p2p.emit('error', e); }
   });
};

