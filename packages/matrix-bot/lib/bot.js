const { 
    MatrixClient, 
    SimpleFsStorageProvider,
    AutojoinRoomsMixin,
} = require("matrix-bot-sdk");
const hash = require('object-hash');


const MatrixBot = (exports.MatrixBot = class MatrixBot {
    constructor({ homeserverUrl, redis}) {
        const storage = new SimpleFsStorageProvider("mbot-storage.json")
        const client = new MatrixClient(homeserverUrl, process.env.MATRIX_BOT_KEY, storage, cryptoStorage)
        AutojoinRoomsMixin.setupOnClient(client);

        Object.assign(this, {
            homeserverUrl,
            client,
            redis
        })
    }

  
    async test_msgToRoom(){
        let rooms = await this.getMatrixInfo()
        
        await this.client.sendEvent(rooms[0], JSON.stringify({ eventType: "TransferEvent", content: "event"})).catch(err => console.log(err.message))
    }
    async getMatrixInfo() {
        return await this.client.getJoinedRooms()
    }

    async run() {
        // this.client.on("room.message", this.handleCommand)
        this.client.on("room.message", async (roomId, event) => {
            console.log(roomId, event)
        })
        // this.client.on("room.event", async (roomId, event) => {
        //     let d_event = await this.client.getEventContext(roomId, event['event_id'], 5)
        //     console.log(d_event)
        //     return d_event
        // })
        // this.client.on("room.event", (roomId, event) => console.log(roomId, event))
        // this.client.on("m.room.encrypted", (roomId, event) => {
        //     console.log(roomId, event)
        // })
        this.client.start().then(() => console.log('Bot Started'))
    }

    async handleCommand(roomId, event) {
        console.log(event)
        if (event['content']?.['msgtype'] !== 'm.text') return; //don't repond to non-text messages
        if (event['sender'] === await client.getUserId()) return; //dont respond to own messages

        const body  = event['content']['body'];
        if (!body?.startsWith("!hello")) return;
        
        await client.replyNotice(roomId, event, "Hello World")
    }


})


