import { bool } from "@techstark/opencv-js";
import "./styles/app.css";

export enum ConnectionState {
    Idle,
    Wait4Connection,
    Connecting,
    Connected,
    Disconnected,
    Error
}
enum MessageType {
    Ok = "Ok", // message received by server
    CreateRoom = "CreateRoom", // Create a room with the RtcConfig
    RoomOffer = "RtcOffer", // send the room offer to the channel
    JoinRoom = "JoinRoom", // send the answer as message to the room
    Ice = "Ice", // ice message from the other side
    Error = "Error", // Error response
    Disconnect = "Disconnect" // Disconnect the room channel
}
interface Message {
    type: MessageType,
    payload: string,
}

const offerOptions = {
    iceRestart: true,
    offerToReceiveAudio: false,
    offerToReceiveVideo: false
};

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class NetworkManager {
    state: ConnectionState = ConnectionState.Idle;
    state_cb?: Function;
    is_host?: boolean;
    room: string = "";
    peerConnection?: RTCPeerConnection;
    dataChannel?: RTCDataChannel;
    errorMessages: string[];

    constructor() {
        this.errorMessages = [];
    }

    async #setErrorState(message: string): Promise<null> {
        await this.#removeChannel();
        this.errorMessages.push(message);
        console.info(this.errorMessages);
        this.#setState(ConnectionState.Error);
        return null;
    }

    async #removeChannel() {
        await this.#request({
            type: MessageType.Disconnect,
            payload: ""
        });
    }

    async createRoom(rtcConfig: RTCConfiguration): Promise<string | null> {
        this.#setState(ConnectionState.Idle);
        this.errorMessages = []; // reset errors
        this.is_host = true

        // create a room with our configuration.
        const create_room = await this.#request({
            type: MessageType.CreateRoom,
            payload: JSON.stringify(rtcConfig)
        });
        if (create_room != undefined)
            this.room = create_room[0].payload;
        else
            return this.#setErrorState("Failed to create a room!");

        // create the peerconnection and datachannel
        this.peerConnection = new RTCPeerConnection(rtcConfig);
        this.peerConnection.onicecandidate = async (e) => {
            await this.#request({
                type: MessageType.Ice,
                payload: JSON.stringify(e.candidate)
            });
        }
        this.dataChannel = this.peerConnection.createDataChannel('imageChannel');

        this.dataChannel.onopen = (e) => {
            // we are connected.
            this.#setState(ConnectionState.Connected)
        }
        this.dataChannel.onclose = (e) => {
            this.#setState(ConnectionState.Disconnected)
        }

        try {
            // create our webrtc offer and send it to the other side
            const rtc_offer = await this.peerConnection.createOffer(offerOptions);
            await this.peerConnection.setLocalDescription(rtc_offer);

            await this.#request({
                type: MessageType.RoomOffer,
                payload: JSON.stringify(rtc_offer)
            });
        } catch (e) {
            return await this.#setErrorState("Peerconnectionsetup failed");
        }

        return this.room;
    }

    onConnectionStateChanged(cb: Function) {
        this.state_cb = cb;
    }

    #setState(state: ConnectionState) {
        if (this.state == state)
            return;

        this.state = state;
        if (this.state_cb != undefined)
            this.state_cb(this.state);
    }

    // start listening for connections...
    async connect() {
        this.#setState(ConnectionState.Wait4Connection);

        if (!this.is_host) {
            throw "Connect can only be used for hosts"
        }

        // wait for our connection
        const messages = await this.#request(undefined, 300);
        if (messages == undefined) {
            return await this.#setErrorState("Failed to connect, no client");
        }
        for (let message of messages) {
            this.#handleMessage(message);
        }

        // if we are not connected by now, we wait in a loop for other messages
        while (this.state == ConnectionState.Connecting) {
            // Try to read the ice message
            const messages = await this.#request(undefined, 10);
            if (messages == undefined) {
                // message is undefined if the request is cancelled because we
                // have an error or connection
                break;
            } else if (messages == null) {
                return await this.#setErrorState("Connection timeout");
            }
            for (let message of messages) {
                this.#handleMessage(message);
            }
        }

        // clear the room
        await this.#removeChannel();
    }

    async #handleMessage(message: Message) {
        switch (message.type) {
            case MessageType.JoinRoom: {
                this.peerConnection?.setRemoteDescription(JSON.parse(message.payload));
                break;
            }
            case MessageType.Ice: {
                this.peerConnection?.addIceCandidate(JSON.parse(message.payload));
                break;
            }
        }
    }

    // connectTo sets up the room and start the listener for the client,
    // the max iterations here is 1 because we assume the room exists
    async connectTo(room: string) {
        this.#setState(ConnectionState.Connecting);
        this.is_host = false;
        this.room = room;

        // try to get the room info
        const messages = await this.#request(undefined, 1);
        if (messages == undefined) {
            await this.#setErrorState("Failed to connect to remote, room does not exist");
            return;
        }
        // first message should contain our configuration
        let config = messages.shift();
        if (config == undefined) {
            return await this.#setErrorState("Failed to connect to remote, no configuration");
        }
        // Next message should contain the offer
        let offer = messages.shift();
        if (offer == undefined) {
            return await this.#setErrorState("Failed to connect to remote, no offer");
        }

        // setup our channel
        this.peerConnection = new RTCPeerConnection(JSON.parse(config.payload));
        this.peerConnection.onicecandidate = async (e) => {
            await this.#request({
                type: MessageType.Ice,
                payload: JSON.stringify(e.candidate)
            });
        }
        // setup datachannel
        this.peerConnection.ondatachannel = (e) => {
            this.dataChannel = e.channel;
            this.dataChannel.onopen = (e) => {
                // we are connected.
                this.#setState(ConnectionState.Connected)
            }
            this.dataChannel.onclose = (e) => {
                this.#setState(ConnectionState.Disconnected)
            }
        }

        try {
            // create our webrtc offer and send it to the other side
            await this.peerConnection.setRemoteDescription(JSON.parse(offer.payload));
            let rtc_answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(rtc_answer);

            await this.#request({
                type: MessageType.JoinRoom,
                payload: JSON.stringify(rtc_answer)
            });
        } catch (e) {
            return await this.#setErrorState("Peerconnectionsetup failed");
        }

        // if we are not connected by now, we wait in a loop for other messages
        while (this.state == ConnectionState.Connecting) {
            // Try to read the ice message
            const messages = await this.#request(undefined, 10);
            if (messages == undefined) {
                // message is undefined if the request is cancelled because we
                // have an error or connection
                break;
            } else if (messages == null) {
                return await this.#setErrorState("Connection timeout");
            }
            for (let message of messages) {
                this.#handleMessage(message);
            }
        }

        await this.#removeChannel();
    }

    // after a request we want to repeat the request until we receive an answer
    async #request(sendData?: Message, max_retry?: number): Promise<Message[] | undefined | null> {
        let my_max_retry = max_retry == undefined ? 1 : max_retry;
        let return_data: Message[];
        let tries = 0;
        while (true) {
            const response = await fetch('/signalling', {
                method: "POST",
                body: JSON.stringify({
                    is_host: this.is_host,
                    room: this.room,
                    data: sendData
                })
            });

            const result = await response.json();
            if (result) {
                return_data = result;
                break;
            }

            // clear the data, we only want to send the request data once
            sendData = undefined;

            // if we are connected or in an error state, we want to stop here..
            if (this.state == ConnectionState.Connected || this.state == ConnectionState.Error) {
                return undefined;
            }

            tries++;
            if (tries >= my_max_retry) {
                return null;
            }

            // small delay before we do the next request
            await delay(250);
        }

        return return_data;
    }
}