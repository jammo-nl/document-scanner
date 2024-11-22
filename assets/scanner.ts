import "./styles/scanner.css";
import { NetworkManager, ConnectionState } from "./app";

enum PageState {
    Working,
    Loading,
    Error,
}

// all our variables
const netman = new NetworkManager();
const room: string = window.location.pathname.split("/").slice(-1)[0];
const video = document.querySelector('video');
let canvas: HTMLCanvasElement;
let sending = false;

// use the network manager state to update our status overlay
netman.onConnectionStateChanged(() => {
    switch (netman.state) {
        case ConnectionState.Idle: { setCurrentState(PageState.Loading, 'Waiting for connection setup'); break; }
        case ConnectionState.Connecting: { setCurrentState(PageState.Loading, 'Connecting...'); break; }
        case ConnectionState.Connected: { setCurrentState(PageState.Working); startCamera(); break; }
        case ConnectionState.Error: { setCurrentState(PageState.Error, netman.errorMessages[0]); break; }
        case ConnectionState.Disconnected: { setCurrentState(PageState.Error, 'Connection lost'); break; }
    }
})

function takeSnapshot() {
    if (sending) return;
    sending = true;
    let img = document.querySelector('img') || document.createElement('img');
    img.className = "preview";
    let context;
    let width = video!.offsetWidth, height = video!.offsetHeight;


    canvas = canvas || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    context = canvas.getContext('2d');
    context!.drawImage(video!, 0, 0, width, height);

    let data = canvas.toDataURL('image/png');;
    img.src = data;
    document.body.appendChild(img);

    setTimeout(() => {
        //sendSnapshot(data)
    }, 0);
}

function sendSnapshot(data: string) {
    var delay = 10;
    var charSlice = 10000;
    var dataSent = 0;
    var intervalID: NodeJS.Timeout;

    intervalID = setInterval(function () {
        var slideEndIndex = dataSent + charSlice;
        if (slideEndIndex > data.length) {
            slideEndIndex = data.length;
        }
        // dataChannel.send(data.slice(dataSent, slideEndIndex));
        // dataSent = slideEndIndex;
        // if (dataSent + 1 >= data.length) {
        //     dataChannel.send("\n");
        //     clearInterval(intervalID);
        //     sending = false;
        // }
    }, delay);
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
                setCurrentState(PageState.Error, 'Could not access the camera. Error: ' + error.name);
            });
    }
}

function setCurrentState(state: PageState, message?: string) {
    let elements = document.querySelectorAll<HTMLElement>('.error-state');

    if (state == PageState.Working)
        elements.forEach((element) => { element!.style.display = "none"; });
    else
        elements.forEach((element) => { element!.style.display = "block"; });

    let element = document.querySelector<HTMLElement>('.error-message');
    element!.innerHTML = "<center><h1>" + message + "</h1></center>";
}

// connect to the client
await netman.connectTo(room);
