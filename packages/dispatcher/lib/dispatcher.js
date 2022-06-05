'use strict';

const polygongastracker = require('ethers-polygongastracker');
const gasnow = require('ethers-gasnow');
const packageJson = require('../package');
const { createLogger } = require('@zerodao/logger');
const ethers = require('ethers');
const { makePrivateSigner } = require('ethers-flashbots');

const RPC_ENDPOINTS = {
  // [42161]: 'https://arb1.arbitrum.io/rpc', original
  // [137]: 'https://polygon-mainnet.infura.io/v3/816df2901a454b18b7df259e61f92cd2', infura
  // [1]: 'https://mainnet.infura.io/v3/816df2901a454b18b7df259e61f92cd2', infura
  [42161]: 'https://arb-mainnet.g.alchemy.com/v2/gMO3S4SBWM72d94XKR4Hy2pbviLjmLqk',
  [137]: 'https://polygon-mainnet.g.alchemyapi.io/v2/gMO3S4SBWM72d94XKR4Hy2pbviLjmLqk',
  [1]: 'https://eth-mainnet.alchemyapi.io/v2/gMO3S4SBWM72d94XKR4Hy2pbviLjmLqk'
};

const ERROR_TIMEOUT = 1000;

const util = require('util');

const Dispatcher = exports.Dispatcher = class Dispatcher {
  static RPC_ENDPOINTS = RPC_ENDPOINTS;
  static ERROR_TIMEOUT = ERROR_TIMEOUT;
  constructor({
    redis,
    gasLimit,
    logger,
    signer
  }) {
    Object.assign(this, {
      redis,
      gasLimit,
      logger,
      signer
    });
    if (!this.logger) this.logger = createLogger(packageJson.name);
    this.providers = Object.entries(this.constructor.RPC_ENDPOINTS).reduce((r, [ key, value ]) => {
      const provider = r[key] = new ethers.providers.JsonRpcProvider(value);
      if (key == 1) provider.getGasPrice = gasnow.createGetGasPrice('rapid');
      else if (key == 137) provider.getGasPrice = polygongastracker.createGetGasPrice('rapid');
      return r;
    }, {});
    this.signers = Object.entries(this.constructor.RPC_ENDPOINTS).reduce((r, [ key, value ]) => {
      _priv_signer = makePrivateSigner({
        signer: signer.connect(this.makeProvider(key)),
        getMaxBlockNumber: async ( signer, tx ) => {
          return ethers.utils.hexlify(Number(await signer.provider.getBlockNumber()) + 100);
        },
        getPreferences: async () => ({ fast: true }) //default behavior
      })
      r[key] = signer.connect(_priv_signer)
      // r[key] = signer.connect(this.makeProvider(key));
      return r;
    }, {});
  }
  makeProvider(chainId) {
    return this.providers[chainId];
  }
  getSigner(chainId) {
    return this.signers[chainId];
  }
  async runLoop() {
    this.logger.info('starting dispatch loop');
    while (true) {
      try {
        const txSerialized = await this.redis.lpop('/zero/dispatch');
        if (!txSerialized) {
          await this.errorTimeout();
          continue;
	}
	const tx = JSON.parse(txSerialized);
        this.logger.info('dispatching tx');
	      console.log('signer', this.getSigner(tx.chainId));
        this.logger.info(util.inspect(tx, { colors: true, depth: 15 }));
        try {
          const dispatched = await (this.getSigner(tx.chainId)).sendTransaction({
            ...tx,
            chainId: undefined,
            gasLimit: tx.chainId == 42161 ? undefined : this.gasLimit
	  });
          this.logger.info('dispatched tx: ' + dispatched.hash);
        } catch (e) {
          this.logger.error(e);
          await this.redis.lpush('/zero/dispatch', tx);
          await this.errorTimeout();
	}
      } catch (e) {
        this.logger.error(e);
      }
      await this.timeout(1000);
    }
  }
  async timeout(ms) {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  }
  async errorTimeout() {
    await new Promise((resolve) => setTimeout(resolve, Dispatcher.ERROR_TIMEOUT));
  }
};
