export class Spectrogram {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.width = canvas.width;
        this.height = canvas.height;
    }

    public drawSpectrum(data: Float32Array) {
        // 將 data 映射成顏色
        const imageData = this.ctx.createImageData(this.width, 1);
        for (let x = 0; x < this.width; x++) {
            const value = Math.min(255, Math.max(0, data[x] * 255));
            imageData.data[x * 4 + 0] = value; // R
            imageData.data[x * 4 + 1] = value; // G
            imageData.data[x * 4 + 2] = value; // B
            imageData.data[x * 4 + 3] = 255; // A
        }
        this.ctx.drawImage(
            this.canvas,
            0,
            1,
            this.width,
            this.height - 1,
            0,
            0,
            this.width,
            this.height - 1
        );
        this.ctx.putImageData(imageData, 0, this.height - 1);
    }
}
