import "./fontawesome/css/fontawesome.css";
import "./fontawesome/css/solid.css";
import "./styles/main.css";

import QRCode from 'qrcode';
import { ConnectionState, NetworkManager } from "./app";
import rtcConfig from "./config";
import { Document } from "./document";

const netman = new NetworkManager();
const doc = new Document();

const connect_phone = document.querySelector('#connect-phone');
const connect_phone_state = document.querySelector('#connect-phone-state');
const document_new = document.querySelector('#document-new');
const document_new_confirm = document.querySelector('#confirm-delete-btn');
const document_new_cancel = document.querySelector('#confirm-cancel-btn');
const document_export = document.querySelector('#document-export');
const document_container = document.querySelector("#doccontainer");
const confirm_reset = document.querySelector("#confirm_reset") as HTMLDivElement;

// avoid leaving the page if we have a document
window.addEventListener('beforeunload', function (event) {
    if (doc.previewPages().length > 0) {
        event.preventDefault();
        return (event.returnValue = "");
    }
});

document_export!.addEventListener('click', () => {
    alert("No export yet");
});
document_new!.addEventListener('click', () => {
    confirm_reset!.style.display = "block";
});
document_new_confirm!.addEventListener('click', () => {
    confirm_reset!.style.display = "none";
    doc.reset();
    updateView();
});
document_new_cancel!.addEventListener('click', () => {
    confirm_reset!.style.display = "none";
});


function resetDocumentContainer() {
    document_container!.innerHTML = "";
}
function renderDocument(image: HTMLImageElement) {
    let holder = document.createElement("div");
    holder.appendChild(image);
    holder.classList.add("overflow-hidden");
    holder.classList.add("shadow-lg");
    holder.classList.add("flex-none");
    holder.classList.add("w-64");
    holder.classList.add("h-80");
    holder.classList.add("m-5");

    document_container!.appendChild(holder);
}


netman.onConnectionStateChanged(() => {
    connect_phone_state?.classList.remove("text-green-500");
    connect_phone_state?.classList.remove("text-orange-500");

    const elements = document.querySelectorAll<HTMLElement>('.qr-state');
    if (netman.state == ConnectionState.Wait4Connection)
        elements.forEach((element) => { element!.style.display = "block"; });
    else
        elements.forEach((element) => { element!.style.display = "none"; });

    if (netman.state == ConnectionState.Connected)
        connect_phone_state?.classList.add("text-green-500");
    else if (netman.state == ConnectionState.Connecting)
        connect_phone_state?.classList.add("text-orange-500");
})
netman.onDataReceived((data: any) => {
    const blob = new Blob([data.buffer], { type: 'image/png' });
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);

    img.onload = () => {
        doc.addImagePage(img);
        updateView();
    }
})

function updateView() {
    resetDocumentContainer();
    doc.previewPages().forEach((image) => {
        renderDocument(image);
    });
}

connect_phone!.addEventListener('click', async () => {
    let room = await netman.createRoom(rtcConfig);
    const url = (document.location.href + "/scanner/" + room).replace("//scanner", "/scanner");

    alert(url)

    // set the qrcode / link
    QRCode.toCanvas(document.getElementById('qrcode'), url, { width: 300 }, function () {
    });
    const qr = document.querySelector<HTMLLinkElement>('#qr');
    qr!.href = url;

    netman.connect();
});
