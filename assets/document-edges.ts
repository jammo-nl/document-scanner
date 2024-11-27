import cv from "@techstark/opencv-js";

export interface Point {
    x: number;
    y: number;
}

//let dbg_canvas = document.getElementById("dbg");

export class DetectEdges {
    static detect(source: HTMLImageElement): Point[] {
        const img = cv.imread(source);
        const gray = new cv.Mat();
        cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY);
        const blur = new cv.Mat();
        cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

        let canny = new cv.Mat();
        cv.Canny(blur, canny, 10, 80, 3, false);

        const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
        cv.dilate(canny, canny, kernel);
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();

        //cv.imshow(dbg_canvas!, canny);

        cv.findContours(canny, contours, hierarchy, cv.RETR_CCOMP,
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

        //console.log("contour found: " + maxContourIndex);

        const maxContour = contours.get(maxContourIndex);
        const points = this.getCornerPoints(maxContour)
        img.delete();
        gray.delete();
        blur.delete();
        canny.delete();
        contours.delete();
        hierarchy.delete();

        console.log(points);
        return points;
    }

    static distance(p1: Point, p2: Point) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }

    static getCornerPoints(contour: any): Point[] {
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
        points.push(topLeftPoint as Point);
        points.push(topRightPoint as Point);
        points.push(bottomRightPoint as Point);
        points.push(bottomLeftPoint as Point);
        return points;
    }
}