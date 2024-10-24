'use strict';
import './main.css';
import Config from '@config';
import QRCode from 'qrcode';

// ui buttons
const document_new = document.querySelector('#document-new');
const document_new_confirm = document.querySelector('#confirm-delete-btn');
const document_new_cancel = document.querySelector('#confirm-cancel-btn');
const document_export = document.querySelector('#document-export');



let document_data: Array<string> = [];

// handle ui buttons
document_new!.addEventListener('click', () => {
    if (document_data.length > 0) {
        let elements = document.querySelectorAll<HTMLElement>('.confirm-dialog');
        elements.forEach((element) => { element!.style.display = "block"; });
    }
});
document_new_confirm!.addEventListener('click', () => {
    if (document_data.length > 0) {
        let elements = document.querySelectorAll<HTMLElement>('.confirm-dialog');
        elements.forEach((element) => { element!.style.display = "none"; });
    }
    document_data = [];
    updateDocuments();
});
document_new_cancel!.addEventListener('click', () => {
    if (document_data.length > 0) {
        let elements = document.querySelectorAll<HTMLElement>('.confirm-dialog');
        elements.forEach((element) => { element!.style.display = "none"; });
    }
});

document_export!.addEventListener('click', () => { alert("SAVE") });

// functions
function setErrorState(message: string) {
    const elements = document.querySelectorAll<HTMLElement>('.error-state');
    elements.forEach((element) => { element!.style.display = "block"; });
    const element = document.querySelector<HTMLElement>('.error-message');
    element!.innerHTML = "<center><h1>" + message + "</h1></center>";
}

function createQrFor(url: string) {
    QRCode.toCanvas(document.getElementById('qrcode'), url, { width: 300 }, function () {
    });
    const elements = document.querySelectorAll<HTMLElement>('.qr-state');
    elements.forEach((element) => { element!.style.display = "block"; });
}

function updateDocuments() {

}

// room setup
let ws = new WebSocket(Config.ws_server);
ws.addEventListener("error", (event: any) => {
    setErrorState("Websocket error: " + event.name);
});
ws.addEventListener("open", (event: any) => {
    // after connect, send the create room message to the server
    ws.send(JSON.stringify("CreateRoom"));
});
ws.addEventListener("close", (event: any) => {
    setErrorState("Connection closed");
});
ws.addEventListener("message", (event: any) => {
    const message = JSON.parse(event.message);
    if (message.RoomCreated) {
        createQrFor("https://web.docscanner.eu/client/" + message.RoomCreated);
    } else if (message.ClientAdded) {

    } else if (message.type = "image_message") {

    }
});


// 	conn.onmessage = function (evt) {
// 		var message = JSON.parse(evt.data);
// 		if (message.RoomCreated) {
// 			new QRCode(document.getElementById("qrcode"), {text: "https://web.docscanner.eu/client/" + message.RoomCreated, width: 256, height: 256});
// 			document.getElementById("qrlink").href = "https://web.docscanner.eu/client/" + message.RoomCreated;
// 		} else if (message.ClientAdded) {
// 			document.getElementById("qr_div").style.display = "none";
// 		} else if (message.type == "image_message") {
// 			var image_data = JSON.parse(message.message);
// 			var img = document.createElement("img");
// 			var aspect = image_data.height / image_data.width;
// 			img.src = image_data.image;
// 			img.width = 150;
// 			img.height = 150 * aspect;
// 			img.margin = 15;
// 			document.getElementById("images").appendChild(img);
//
// 			// notify that we received the image
// 			let data = {
// 				type: "image_recv"
// 			}
// 			conn.send(JSON.stringify(data))
// 		}
//
// 	}
// };