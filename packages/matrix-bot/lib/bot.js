const { 
    MatrixClient, 
    MatrixAuth,
    SimpleFsStorageProvider,
    AutojoinRoomsMixin,
    RustSdkCryptoStorageProvider
} = require("matrix-bot-sdk");
require("olm");

const _ = require("lodash")
const hash = require('object-hash');


const MatrixBot = (exports.MatrixBot = class MatrixBot {
    constructor({ homeserverUrl, redis}) {

        const storage = new SimpleFsStorageProvider("./storage/mbot-storage.json");
        const cryptoStorage = new RustSdkCryptoStorageProvider("./storage");
        // const client = new MatrixClient(homeserverUrl, 'syt_a2VlcGVyYm90_yVvrvGJiEUXnRfTDvaaD_1qYvzN', storage, (new RustSdkCryptoStorageProvider("./storage")))
        // AutojoinRoomsMixin.setupOnClient(client);
        
        Object.assign(this, {
            homeserverUrl,
            storage,
            cryptoStorage,
            redis
        })
        
    }
    
    
    // async test_msgToRoom(){
        //     let rooms = await this.getMatrixInfo()
        
        //     await this.client.sendEvent(rooms[0], JSON.stringify({ eventType: "TransferEvent", content: "event"})).catch(err => console.log(err.message))
        // }
        // async getMatrixInfo() {
            //     return await this.client.getJoinedRooms()
            // }
            
    async run() {
        const _client = await (new MatrixAuth(this.homeserverUrl)).passwordLogin("keeperbot", "dcZXwevW2ZNY82", "keeperbot")
        const accessToken = _client.accessToken
        let client = new MatrixClient(this.homeserverUrl, accessToken, this.storage, this.cryptoStorage)
        AutojoinRoomsMixin.setupOnClient(client)
        client.start().then(async () => {
            console.log(client.crypto.isReady)
            client.crypto.prepare(await client.getJoinedRooms())
            client.claimOneTimeKeys(await client.getUserId())
            // await client.on('room.event', async (roomId, event) => {
            //     console.log(event['content'])
            //     await client.crypto.decryptRoomEvent(, roomId)
            // })
        })


        
        // client.on("room.message", (roomId, event) => {console.log(event)})

        
        // await client.on("room.event", (roomId, event) => {
        //     console.log(event['sender'])
        // })
        
        // client.on("room.event", (roomId, event) => console.log(event) )
        
    }

    async handleCommand(roomId, event) {
        if (event['content']?.['msgtype'] !== 'm.text') return; //don't repond to non-text messages
        if (event['sender'] === await client.getUserId()) return; //dont respond to own messages

        const body  = event['content']['body'];
        if (!body?.startsWith("!hello")) return;
        
        await client.replyNotice(roomId, event, "Hello World")
    }


})


