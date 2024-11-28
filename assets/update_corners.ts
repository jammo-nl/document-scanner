import { Point } from "./document-edges";

export class CornersEdit {
    mousePos: Point = { x: 0, y: 0 };
    dragPoint: number | null = null;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    image: HTMLImageElement;
    corners: Point[];
    scale: number;
    centerShift_x: number;
    centerShift_y: number;

    constructor(target: string, image: HTMLImageElement, corners: Point[]) {
        let my_target = document.querySelector(target);
        my_target!.innerHTML = "";

        let dot_canvas = document.createElement("canvas");
        my_target!.appendChild(dot_canvas);
        dot_canvas.style.position = "absolute";
        dot_canvas.style.top = "0px";
        dot_canvas.style.left = "0px";
        dot_canvas.style.right = "0px";
        dot_canvas.style.bottom = "0px";
        dot_canvas.style.width = '100%';
        dot_canvas.style.height = '100%';
        dot_canvas.style.zIndex = '2';
        dot_canvas.width = dot_canvas.offsetWidth;
        dot_canvas.height = dot_canvas.offsetHeight;

        this.canvas = dot_canvas;
        this.ctx = dot_canvas.getContext("2d")!;
        this.image = image;
        this.corners = corners;

        var hRatio = dot_canvas.width / image.width;
        var vRatio = dot_canvas.height / image.height;
        this.scale = Math.min(hRatio, vRatio);

        let target_image = image.cloneNode() as HTMLImageElement;
        my_target!.appendChild(target_image);
        target_image.width = (image.width * this.scale) - 10;
        target_image.height = (image.height * this.scale) - 10;
        target_image.style.zIndex = '1';

        // shift the dots to the right / bottom
        this.centerShift_x = ((dot_canvas.width - image.width * this.scale) / 2) + 5;
        this.centerShift_y = ((dot_canvas.height - image.height * this.scale) / 2) + 5;

        this.canvas.addEventListener('mousemove', e => {
            this.#updateMouseCoords(e)

            if (this.dragPoint != null) {
                let coordinate = this.#translatePointCoordinate(this.mousePos);
                this.corners[this.dragPoint] = coordinate;
            }
        });
        this.canvas.addEventListener('mousedown', e => {
            for (var idx in this.corners) {
                let point = this.#getUpdatedPoint(parseInt(idx, 10));
                if (this.#isActiveCorner(point)) {
                    this.dragPoint = parseInt(idx, 10);
                }
            }
        });
        this.canvas.addEventListener('mouseup', e => {
            this.dragPoint = null;
        });

        // setup draw loop
        setInterval(() => {
            this.#draw();
        }, 16);
    }

    #getUpdatedPoint(index: number) {
        let point = JSON.parse(JSON.stringify(this.corners[index]));
        point.x = (point.x * this.scale) + this.centerShift_x;
        point.y = (point.y * this.scale) + this.centerShift_y;
        return point;
    }
    #translatePointCoordinate(point: Point) {
        let new_point = { x: 0, y: 0 };
        new_point.x = (point.x / this.scale) - this.centerShift_x / this.scale;
        new_point.y = (point.y / this.scale) - this.centerShift_y / this.scale;

        return new_point;
    }

    #updateMouseCoords(event: any) {
        let canvasCoords = this.canvas.getBoundingClientRect();
        this.mousePos = {
            x: event.x - canvasCoords.left,
            y: event.y - canvasCoords.top
        }
    }

    #isActiveCorner(point: Point) {
        let xLine = this.mousePos.x > point.x - 5 && this.mousePos.x < point.x - 5 + 10
        let yLine = this.mousePos.y > point.y - 5 && this.mousePos.y < point.y - 5 + 10

        return xLine && yLine
    }

    #draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // draw lines between corners
        for (var idx in this.corners) {
            let idx_next = (parseInt(idx, 10) + 1) % this.corners.length;
            let point = this.#getUpdatedPoint(parseInt(idx, 10));
            let next = this.#getUpdatedPoint(idx_next);

            this.ctx.moveTo(point.x, point.y);
            this.ctx.lineTo(next.x, next.y);
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = "black";
            this.ctx.stroke();
        }

        // draw the corners
        for (var idx in this.corners) {
            let point = this.#getUpdatedPoint(parseInt(idx, 10));
            this.ctx.beginPath(); // Start a new path
            this.ctx.rect(point.x - 5, point.y - 5, 10, 10); // Add a rectangle to the current path
            this.ctx.fillStyle = this.#isActiveCorner(point) ? "red" : "blue";
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = "black";
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
}
