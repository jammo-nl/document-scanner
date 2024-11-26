import { DetectEdges, Point } from "./document-edges";
import { crop } from "./image_crop";

interface Page {
    orig: HTMLImageElement,
    points: Point[],
    width: number,
    heigth: number,
    color: boolean,
    result?: HTMLImageElement,
}
export class Document {
    pages: Page[] = [];
    dflt_width: number = 210;
    dflt_height: number = 297;
    dflt_color: boolean = false;
    dpi: number = 72 / 25.4;  // 72, 96, 150, 300

    reset() {
        this.pages = [];
    }

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
    }

    #updatePageResult(page: Page) {
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