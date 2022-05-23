const { ZeroP2P } = require('../lib/zerop2p');
const { advertiseAsKeeper, handleRequests } = require('../lib/keeper');
const Redis = require('ioredis');
const redis = new Redis()
// const redis = require('ioredis')(process.env.REDIS_URI);
const ethers = require('ethers');

const CONTROLLER_DEPLOYMENTS = {
  "0x53f38bEA30fE6919e0475Fe57C2629f3D3754d1E": "ARBITRUM",
  "0x85dAC4da6eB28393088CF65b73bA1eA30e7e3cab": "MATIC",
  "0xa8bd3ffebf92538b3b830dd5b2516a5111db164d": "ETHEREUM"
}
const RPC_ENDPOINTS = {
  ARBITRUM: 'https://arb1.arbitrum.io/rpc',
  MATIC: 'https://polygon-mainnet.infura.io/v3/816df2901a454b18b7df259e61f92cd2',
  ETHEREUM: 'https://mainnet.infura.io/v3/816df2901a454b18b7df259e61f92cd2',
};

const packageJson = require('../package');
const { createLogger } = require('@zerodao/logger');

const logger = createLogger(packageJson.name);

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
    await redis.lpush('/zero/request', data);
  });
  peer.on('error', logger.error.bind(logger));
  advertiseAsKeeper(peer);
})().catch(logger.error.bind(logger));
	
