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

        // setup default area
        let points: Point[] = [
            { x: 0, y: 0 }, { x: img.size().width, y: 0 }, { x: img.size().width, y: img.size().height }, { x: 0, y: img.size().height }
        ]

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

        // we need to occupy at least 20% of the picture..
        // this can use some finetuning..
        let min_area = (img.size().width * img.size().height) / 20;
        let maxArea = 0;
        let maxContourIndex = -1;
        for (let i = 0; i < Number(contours.size()); ++i) {
            //console.log("countour.. " + i + " area " + cv.contourArea(contours.get(i)));
            let contourArea = cv.contourArea(contours.get(i));
            if (contourArea > maxArea && contourArea > min_area) {
                maxArea = contourArea;
                maxContourIndex = i;
            }
        }

        try {
            const maxContour = contours.get(maxContourIndex);
            points = this.getCornerPoints(maxContour, scale);
        } catch (e) {
            points = DetectEdges.detect2(source);
        }
        img.delete();
        contours.delete();
        hierarchy.delete();

        return points;
    }

    static detect2(source: HTMLImageElement): Point[] {
        let img = cv.imread(source);

        // get a scaling factor and resize the image to a workable size
        let limit_dim = 800.0;
        let max_dim = Math.max(img.size().width, img.size().height);
        let scale = 1;
        if (limit_dim < max_dim) {
            scale = limit_dim / max_dim;
            cv.resize(img, img, new cv.Size(0, 0), scale, scale);
        }

        // setup default area
        let points: Point[] = [
            { x: 0, y: 0 }, { x: img.size().width, y: 0 }, { x: img.size().width, y: img.size().height }, { x: 0, y: img.size().height }
        ]

        // repeated closing operation to remove text from the document
        // https://docs.opencv.org/4.x/d4/d76/tutorial_js_morphological_ops.html
        const M = cv.Mat.ones(5, 5, cv.CV_8U);
        cv.morphologyEx(img, img, cv.MORPH_CLOSE, M, new cv.Point(1, 1), 3);

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

        // we need to occupy at least 20% of the picture..
        // this can use some finetuning..
        let min_area = (img.size().width * img.size().height) / 20;
        let maxArea = 0;
        let maxContourIndex = -1;
        for (let i = 0; i < Number(contours.size()); ++i) {
            //console.log("countour.. " + i + " area " + cv.contourArea(contours.get(i)));
            let contourArea = cv.contourArea(contours.get(i));
            if (contourArea > maxArea && contourArea > min_area) {
                maxArea = contourArea;
                maxContourIndex = i;
            }
        }

        try {
            const maxContour = contours.get(maxContourIndex);
            points = this.getCornerPoints(maxContour, scale);
        } catch (e) {
            console.log("No area detected");
        }
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