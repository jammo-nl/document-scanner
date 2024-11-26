import { NetworkManager } from "./app";
import rtcConfig from "./config";
import { DetectEdges, Point } from "./document-edges";
import { crop } from "./image_crop";

let netman = new NetworkManager();

let connect_button = document.getElementById("connect");
let result = document.getElementById('result');
let state = document.getElementById("state");
const open_link: HTMLLinkElement | null = document.querySelector("#link");

interface Page {
    orig: HTMLImageElement,
    points: Point[],
    width: number,
    heigth: number,
    color: boolean,
    result?: HTMLImageElement,
}
class Document {
    pages: Page[] = [];
    dflt_width: number = 210;
    dflt_height: number = 297;
    dflt_color: boolean = false;
    dpi: number = 72 / 25.4;  // 72, 96, 150, 300

    addImagePage(image: HTMLImageElement) {
        // try to autodetect the corners for the image object
        const points = DetectEdges.detect(image);

        let page: Page = {
            orig: image,
            points: points,
            width: this.dflt_width,
            heigth: this.dflt_height,
            color: this.dflt_color,
        }
        this.#updatePageResult(page);
        this.pages.push(page);

        console.log(" ->" + page.result);
    }

    #updatePageResult(page: Page) {
        console.log(page.points);
        let tgt = crop(page.orig, page.points, page.width * this.dpi, page.heigth * this.dpi, page.color);
        page.result = tgt;
    }

    previewPages(): HTMLImageElement[] {
        let images: HTMLImageElement[] = [];
        this.pages.forEach((page) => {
            if (page.result != undefined)
                images.push(page.result)
        });
        return images;
    }
}

const doc = new Document();

netman.onConnectionStateChanged(() => {
    state!.innerText = state?.innerText + "\n" + netman.state + " : " + JSON.stringify(netman.errorMessages);
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
    result!.innerHTML = "";
    doc.previewPages().forEach((image) => {
        result!.appendChild(image);
    });
}

connect_button!.addEventListener('click', async () => {
    let room = await netman.createRoom(rtcConfig);
    open_link!.href = "/scanner/" + room
    netman.connect();
});
