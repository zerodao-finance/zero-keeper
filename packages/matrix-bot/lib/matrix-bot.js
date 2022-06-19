"use strict";
const { MatrixClient, SimpleFsStorageProvider, AutoJoinRoomsMixin, RichReply } = require("matrix-bot-sdk");
const homeserverUrl = "https://matrix.zerodao.gg";
const accessToken = "...accessToken";
const storage = new SimpleFsStorageProvider("m-bot.json");


const MatrixBot = (exports.MatrixBot = class MatrixBot {
    constructor({ logger, redis }) {
        Object.assign(this, {
            logger,
            redis,
        })
    }

    async run() {
        try {
            if (await this.redis.llen("/zero/requests/")) {
                const list = await this.redis.lrange("/zero/requests/", 0, -1)
            }
        } catch (error) {
            this.logger.error(error);
            return;
        }
    }
})