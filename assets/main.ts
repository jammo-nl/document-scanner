import { NetworkManager } from "./app";
import rtcConfig from "./config";
import { DocumentScanner, Point } from "./document-scanner";

let netman = new NetworkManager();

let connect_button = document.getElementById("connect");
let result = document.getElementById('result');
let state = document.getElementById("state");
const open_link: HTMLLinkElement | null = document.querySelector("#link");

interface Image {
    orig: HTMLImageElement,
    points: Point[],
    result: HTMLImageElement,
}
let image_store: Image[] = [];

netman.onConnectionStateChanged(() => {
    state!.innerText = state?.innerText + "\n" + netman.state + " : " + JSON.stringify(netman.errorMessages);
})
netman.onDataReceived((data: any) => {
    const blob = new Blob([data.buffer], { type: 'image/png' });
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);

    img.onload = () => {
        const documentScanner = new DocumentScanner();
        const points = documentScanner.detect(img); //detect from an img or canvas element
        // process the image

        let result = processImage(img, points);

        image_store.push({
            orig: img,
            points: points,
            result: result,
        });

        updateView();
    }
})

function processImage(image: HTMLImageElement, points: Point[]): HTMLImageElement {
    const documentScanner = new DocumentScanner();
    const result_img = document.createElement('img');

    let tgt = documentScanner.crop(image, points);
    let data = tgt.toDataURL("image/jpeg");
    result_img.src = data;

    return result_img;
}

function updateView() {
    result!.innerHTML = "";
    image_store.forEach((image) => {
        result!.appendChild(image.result);
    });
}

connect_button!.addEventListener('click', async () => {
    let room = await netman.createRoom(rtcConfig);
    open_link!.href = "/scanner/" + room
    netman.connect();
});
