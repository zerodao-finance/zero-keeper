const { ZeroP2P } = require('../lib/zerop2p');
const { advertiseAsKeeper, handleRequests } = require('../lib/keeper');
const Redis = require('ioredis');
const redis = new Redis()
// const redis = require('ioredis')(process.env.REDIS_URI);
const ethers = require('ethers');

const RPC_ENDPOINTS = {
  ARBITRUM: 'https://arb1.arbitrum.io/rpc',
  MATIC: 'https://polygon-mainnet.infura.io/v3/816df2901a454b18b7df259e61f92cd2',
  ETHEREUM: 'https://mainnet.infura.io/v3/816df2901a454b18b7df259e61f92cd2',
};

const packageJson = require('../package');
const { createLogger } = require('@zerodao/logger');

const logger = createLogger(packageJson.name);

const CONTROLLER_DEPLOYMENTS = {
  "0x53f38bEA30fE6919e0475Fe57C2629f3D3754d1E": 42161,
  "0x85dAC4da6eB28393088CF65b73bA1eA30e7e3cab": 137,
  "0xa8BD3FfEbF92538b3b830DD5B2516A5111DB164D": 1
};

const getChainId = (request) => {
  return CONTROLLER_DEPLOYMENTS[ethers.utils.getAddress(request.contractAddress)] || (() => { throw Error('no controller found: ' + request.contractAddress); })();
};


const encodeBurnRequest = (request) => {
  const contractInterface = new ethers.utils.Interface(['function burn(address, address, uint256, uint256, bytes, bytes, bytes)']);
  return contractInterface.encodeFunctionData('burn', [request.to, request.asset, request.amount, request.deadline, request.data, request.destination, request.signature ]);
};

(async () => {
  logger.info("keeper process started")
  const signer = new ethers.Wallet(process.env.WALLET).connect(new ethers.providers.InfuraProvider('ropsten', RPC_ENDPOINTS.ETHEREUM));
  const peer = await ZeroP2P.fromPassword({
    signer,
    password: await signer.getAddress()
  })
  
  await peer.start()
  handleRequests(peer);
  peer.on('zero:request', async (data) => {
    try {
      const request = JSON.parse(data);
      if (typeof request.destination === 'string') {
        await redis.lpush('/zero/dispatch', JSON.stringify({
          to: ethers.utils.getAddress(request.contractAddress),
          chainId: getChainId(request),
          data: encodeBurnRequest(request),
        }, null, 2));
      } else {
        await redis.lpush('/zero/pending', JSON.stringify(request, null, 2));
      }
      await redis.lpush('/zero/request', data);
    } catch (e) {
      console.error(e);
    }
  });
  peer.on('error', logger.error.bind(logger));
  await peer.pubsub.start();
  advertiseAsKeeper(peer);
})().catch(logger.error.bind(logger));
	
