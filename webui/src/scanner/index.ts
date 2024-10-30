'use strict';
import './scanner.css';
import Config from '@config';

const video = document.querySelector('video');
let canvas: HTMLCanvasElement;

let loading_state = false;

// get the room id
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const room_id = urlParams.get('rid');

function takeSnapshot() {
    let img = document.querySelector('img') || document.createElement('img');
    img.className = "preview";
    let context;
    let width = video!.offsetWidth, height = video!.offsetHeight;


    canvas = canvas || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    context = canvas.getContext('2d');
    context!.drawImage(video!, 0, 0, width, height);

    img.src = canvas.toDataURL('image/png');
    document.body.appendChild(img);
}

function setErrorState(message: string) {
    let elements = document.querySelectorAll<HTMLElement>('.error-state');
    elements.forEach((element) => { element!.style.display = "block"; });
    let element = document.querySelector<HTMLElement>('.error-message');
    element!.innerHTML = "<center><h1>" + message + "</h1></center>";
}

// use MediaDevices API
// docs: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
function startCamera() {
    if (navigator.mediaDevices) {
        // access the web cam
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            // permission granted:
            .then(function (stream) {
                video!.srcObject = stream;

                let photo_button = document.querySelector<HTMLElement>('#photo-button');
                photo_button!.addEventListener('click', takeSnapshot);
            })
            // permission denied:
            .catch(function (error) {
                setErrorState('Could not access the camera. Error: ' + error.name);
            });
    }
}

// room setup
let ws = new WebSocket(Config.ws_server + "?rid=" + room_id);
ws.addEventListener("error", (event: any) => {
    setErrorState("Websocket error: " + event.name);
});
ws.addEventListener("open", (event: any) => { });
ws.addEventListener("close", (event: any) => { });
ws.addEventListener("message", (event: any) => {
    const message = JSON.parse(event.data);
    if (message.message_type == "offer") {
        let offer = JSON.parse(message.data);
        WebRtConnect(offer);
    } else if (message.message_type == "ice") {
        peerConnection.addIceCandidate(JSON.parse(message.data))
    }
});

let peerConnection: RTCPeerConnection;
let dataChannel: RTCDataChannel;
function WebRtConnect(offer: RTCSessionDescriptionInit) {
    const rtcConfig = {
        iceServers: [
            {
                urls: 'stun:web.docscanner.eu:3478'
            },
        ],
    };
    peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.onicecandidate = (e) => {
        ws.send(JSON.stringify({
            message_type: "ice",
            data: JSON.stringify(e.candidate)
        }))
    }

    peerConnection.ondatachannel = (e) => {
        dataChannel = e.channel;
        dataChannel.onopen = (e) => {
            startCamera();
        }
    }

    peerConnection.setRemoteDescription(offer).then(() => {
        peerConnection.createAnswer().then((answer) => {
            peerConnection.setLocalDescription(answer).then(() => {
                ws.send(JSON.stringify({
                    message_type: "answer",
                    data: JSON.stringify(peerConnection.localDescription)
                }));
            })
        })
    })
}