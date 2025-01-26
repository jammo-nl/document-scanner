import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

enum ConnectorState {
    None = 0,
    Signalling,
    Connected,
    Closed,
    Error
}

const MAGIC_V1 = new Uint8Array([255, 255, 0, 1]);

// encode the number to 4 bytes Uint8Array
function numberToBytes(number: number) {
    const byteArray = new Uint8Array(4);

    for (let index = 0; index < byteArray.length; index++) {
        const byte = number & 0xff;
        byteArray[index] = byte;
        number = (number - byte) / 256;
    }

    return byteArray;
}

function bytesToNumber(byteArray: Uint8Array) {
    let result = 0;
    for (let i = byteArray.length - 1; i >= 0; i--) {
        result = (result * 256) + byteArray[i];
    }

    return result;
}

class Connector {
    _state: ConnectorState = ConnectorState.None;
    _last_error_reason: string | null = null;
    _receive_buffer: Uint8Array = new Uint8Array;
    _socket: Socket;
    _config: RTCConfiguration | null = null;
    _room_id: string | null = null;
    _receiving: boolean = false;
    _sending: boolean = false;

    _onErrorCb: (reason: string) => void = () => { };
    _onStateChangedCb: (new_state: ConnectorState) => void = () => { };
    _onDataReceived: (data: Uint8Array) => void = () => { };
    _onDataReceivingChanged: (receiving: boolean) => void = () => { };
    _onDataSendingChanged: (sending: boolean) => void = () => { };

    _peerConnection: RTCPeerConnection | null = null;
    _dataChannel: RTCDataChannel | null = null;

    constructor() {
        this._socket = io();
        this._socket.on('completed', () => {
            this._setState(ConnectorState.Signalling);
            this._socket.emit("config", {
                message: JSON.stringify(this._config),
                to: this._room_id
            });

            // create and send our offer
            this._peerConnection!.createOffer({
                iceRestart: true,
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            }).then((result) => {
                this._peerConnection!.setLocalDescription(result);
                this._socket.emit("offer", { message: JSON.stringify(result), to: this._room_id });
            }).catch(() => {
                this._setError("Failed to create an offer");
            })
        })
        this._socket.on('config', (config) => {
            const my_config = JSON.parse(config);
            this._peerConnection = new RTCPeerConnection(my_config);
            this._setup_peerconnection_listners();
            this._peerConnection.ondatachannel = (ev) => {
                this._dataChannel = ev.channel;
                this._setup_datachannel_listners();
            }
        })
        this._socket.on('ice', (ice) => {
            const my_ice = JSON.parse(ice);
            this._peerConnection!.addIceCandidate(my_ice);
        })
        this._socket.on('offer', (offer) => {
            const my_offer = JSON.parse(offer);
            this._peerConnection!.setRemoteDescription(my_offer);
            this._peerConnection!.createAnswer().then((answer) => {
                this._peerConnection!.setLocalDescription(answer);
                this._socket.emit("answer", { message: JSON.stringify(answer), to: this._room_id });
            }).catch(() => {
                this._setError("Failed to create answer");
            })
        })
        this._socket.on('answer', (offer) => {
            const my_offer = JSON.parse(offer);
            this._peerConnection!.setRemoteDescription(my_offer);
        })
    }

    _setState(new_state: ConnectorState) {
        if (new_state != this._state) {
            this._state = new_state
            this._onStateChangedCb(new_state);
        }
    }
    _setError(reason: string) {
        this._setState(ConnectorState.Error);
        this._last_error_reason = reason;
        this._onErrorCb(reason)
    }
    _setReceiving(receiving: boolean) {
        if (receiving != this._receiving) {
            this._receiving = receiving;
            this._onDataReceivingChanged(this._receiving)
        }
    }
    _setSending(sending: boolean) {
        if (sending != this._sending) {
            this._sending = sending;
            this._onDataSendingChanged(this._sending)
        }
    }

    _setup_peerconnection_listners() {
        this._peerConnection!.onicecandidate = async (e) => {
            this._socket.emit("ice", { message: JSON.stringify(e.candidate), to: this._room_id });
        }
    }

    _setup_datachannel_listners() {
        this._dataChannel!.onopen = () => {
            // we are connected.
            this._setState(ConnectorState.Connected)
        }
        this._dataChannel!.onclose = () => {
            this._setState(ConnectorState.Closed)
        }
        this._dataChannel!.onmessage = (ev) => {
            this._setReceiving(true);
            // add data to the receive buffer and process the buffer
            const message_data = new Uint8Array(ev.data);

            const mergedData = new Uint8Array(this._receive_buffer.length + message_data.length);
            mergedData.set(this._receive_buffer);
            mergedData.set(message_data, this._receive_buffer.length);

            this._receive_buffer = mergedData;
            this._processData()
            if (this._receive_buffer.length == 0)
                this._setReceiving(false);
        }
    }

    _processData() {
        if (this._receive_buffer.length < 4) {
            return
        }

        while (this._receive_buffer.length > 4) {
            // read the magic bytes
            const mb = this._receive_buffer.slice(0, 4);

            if (bytesToNumber(mb) == bytesToNumber(MAGIC_V1)) {
                // check if we have enough bytes for the size
                if (this._receive_buffer.length < 8) {
                    break
                }

                // process v1
                const size = bytesToNumber(this._receive_buffer.slice(4, 8));

                if (this._receive_buffer.length < size + 8) {
                    break;
                }

                // read the file and remove it from the buffer
                const data = this._receive_buffer.slice(8, size + 8);
                this._receive_buffer = this._receive_buffer.slice(size + 8, this._receive_buffer.length);
                this._onDataReceived(data);
            } else {
                // ERROR!!! clean the buffer for now.. maybe handle this better in the future
                this._receive_buffer = new Uint8Array
            }
        }
    }

    onError(cb: (reason: string) => void) {
        this._onErrorCb = cb
    }
    onStateChanged(cb: (new_state: ConnectorState) => void) {
        this._onStateChangedCb = cb
    }
    onDataReceived(cb: (data: Uint8Array) => void) {
        this._onDataReceived = cb
    }
    onDataReceivingChanged(cb: (receiving: boolean) => void) {
        this._onDataReceivingChanged = cb
    }
    onDataSendingChanged(cb: (sending: boolean) => void) {
        this._onDataSendingChanged = cb
    }
    lastError(): string | null {
        return this._last_error_reason
    }

    sendData(object: Uint8Array) {
        this._setSending(true);
        const total_size = object.length;
        const size_encoded = numberToBytes(total_size);

        // create a new array with our magic 4 bytes, than the size and than the object.
        const mergedData = new Uint8Array(8 + total_size);
        mergedData.set(MAGIC_V1);
        mergedData.set(size_encoded, 4);
        mergedData.set(object, 8);

        const sliceSize = 16000; // 16KB
        let dataSent = 0;

        while (dataSent < total_size) {
            const slice = mergedData.slice(dataSent, sliceSize + dataSent);
            dataSent += sliceSize;
            this._dataChannel?.send(slice);
        }

        this._setSending(false);
    }

    static server(config: RTCConfiguration, on_room_cb: (arg0: string) => void): Connector {
        const client = new Connector();
        client._socket.on("room_id", (message) => {
            client._room_id = message;

            // create our host
            client._config = config;
            client._peerConnection = new RTCPeerConnection(config);
            client._dataChannel = client._peerConnection.createDataChannel("scanner_channel");
            client._dataChannel.binaryType = "arraybuffer";
            client._setup_peerconnection_listners();
            client._setup_datachannel_listners();

            on_room_cb(client._room_id!);
        });

        return client
    }
    static client(room_id: string): Connector {
        const client = new Connector();
        client._room_id = room_id;

        client._socket.emit("join", room_id, (result: { result: boolean, reason: string }) => {
            if (!result.result) {
                client._setError(result.reason)
            } else {
                client._setState(ConnectorState.Signalling);
            }
        });

        return client
    }
}

export default Connector;
