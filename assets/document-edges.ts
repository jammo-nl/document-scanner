import cv from "@techstark/opencv-js";

export interface Point {
    x: number;
    y: number;
}

export class DetectEdges {
    static detect(source: HTMLImageElement): Point[] {
        let img = cv.imread(source);

        // get a scaling factor and resize the image to a workable size
        let limit_dim = 800.0;
        let max_dim = Math.max(img.size().width, img.size().height);
        let scale = 1;
        if (limit_dim < max_dim) {
            scale = limit_dim / max_dim;
            cv.resize(img, img, new cv.Size(0, 0), scale, scale);
        }

        // repeated closing operation to remove text from the document
        // https://docs.opencv.org/4.x/d4/d76/tutorial_js_morphological_ops.html
        const M = cv.Mat.ones(5, 5, cv.CV_8U);
        cv.morphologyEx(img, img, cv.MORPH_CLOSE, M, new cv.Point(1, 1), 3);

        // use grabcut to remove the background
        // let mask = new cv.Mat();
        // let bgdModel = new cv.Mat();
        // let fgdModel = new cv.Mat();
        // let rect = new cv.Rect(0, 0, 20, 20);
        // cv.grabCut(img, mask, rect, bgdModel, fgdModel, 1, cv.GC_INIT_WITH_RECT);


        // make a grayscale / blurred version of the image
        cv.cvtColor(img, img, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(img, img, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

        // use canny for edge detectoin
        cv.Canny(img, img, 10, 90, 3, false);


        // find contours
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(img, contours, hierarchy, cv.RETR_CCOMP,
            cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        let maxContourIndex = -1;
        for (let i = 0; i < Number(contours.size()); ++i) {
            //console.log("countour.. " + i + " area " + cv.contourArea(contours.get(i)));
            let contourArea = cv.contourArea(contours.get(i));
            if (contourArea > maxArea) {
                maxArea = contourArea;
                maxContourIndex = i;
            }
        }

        const maxContour = contours.get(maxContourIndex);
        const points = this.getCornerPoints(maxContour, scale);
        img.delete();
        contours.delete();
        hierarchy.delete();

        return points;
    }

    static distance(p1: Point, p2: Point) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }

    static getCornerPoints(contour: any, scale: number): Point[] {
        let points: Point[] = [];
        let rect = cv.minAreaRect(contour);
        const center = rect.center;

        let topLeftPoint;
        let topLeftDistance = 0;

        let topRightPoint;
        let topRightDistance = 0;

        let bottomLeftPoint;
        let bottomLeftDistance = 0;

        let bottomRightPoint;
        let bottomRightDistance = 0;

        for (let i = 0; i < contour.data32S.length; i += 2) {
            const point = { x: contour.data32S[i], y: contour.data32S[i + 1] };
            const distance = this.distance(point, center);
            if (point.x < center.x && point.y < center.y) {
                if (distance > topLeftDistance) {
                    topLeftPoint = point;
                    topLeftDistance = distance;
                }
            } else if (point.x > center.x && point.y < center.y) {
                if (distance > topRightDistance) {
                    topRightPoint = point;
                    topRightDistance = distance;
                }
            } else if (point.x < center.x && point.y > center.y) {
                if (distance > bottomLeftDistance) {
                    bottomLeftPoint = point;
                    bottomLeftDistance = distance;
                }
            } else if (point.x > center.x && point.y > center.y) {
                if (distance > bottomRightDistance) {
                    bottomRightPoint = point;
                    bottomRightDistance = distance;
                }
            }
        }
        points.push({ x: topLeftPoint!.x / scale, y: topLeftPoint!.y / scale });
        points.push({ x: topRightPoint!.x / scale, y: topRightPoint!.y / scale });
        points.push({ x: bottomRightPoint!.x / scale, y: bottomRightPoint!.y / scale });
        points.push({ x: bottomLeftPoint!.x / scale, y: bottomLeftPoint!.y / scale });

        return points;
    }
}