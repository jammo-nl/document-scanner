import cv from "@techstark/opencv-js";
import { Point } from "./document-edges";

export function crop(source: HTMLImageElement, points: Point[], width: number, height: number, color: boolean): HTMLImageElement {
    const canvas = document.createElement("canvas");
    let img = cv.imread(source);
    if (!color) {
        cv.cvtColor(img, img, cv.COLOR_RGBA2GRAY);
    }

    let warpedDst = new cv.Mat();
    let dsize = new cv.Size(width, height);
    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        points[0].x,
        points[0].y,
        points[1].x,
        points[1].y,
        points[3].x,
        points[3].y,
        points[2].x,
        points[2].y,
    ]);

    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0,
        0,
        width,
        0,
        0,
        height,
        width,
        height,
    ]);

    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    cv.warpPerspective(img, warpedDst, M, dsize, cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar()
    );

    cv.imshow(canvas, warpedDst);
    img.delete()
    warpedDst.delete()

    const result_img = document.createElement('img');

    let data = canvas.toDataURL("image/jpeg");
    result_img.src = data;
    return result_img;
}