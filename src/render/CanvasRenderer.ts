import { ChunkProcessor, DataChunk } from '../core/DataChunk';
import { SpectrogramModel } from '../core/SpectrogramModel';
import { AxisOptions, AxisRenderer } from './AxisRenderer';
import { ColorMap, ColorMapName } from './ColorMap';

export interface RenderOptions {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    timeRange: [number, number]; // [startTime, endTime]
    freqRange: [number, number]; // [minFreq, maxFreq]
    xAxis?: AxisOptions;
    yAxis?: AxisOptions;
}

export class CanvasRenderer {
    private model: SpectrogramModel;
    private processor: ChunkProcessor;
    private colormap: ColorMap;
    private axisRenderer: AxisRenderer;

    private chunks: Map<string, DataChunk> = new Map();
    private offscreenCanvas: HTMLCanvasElement | null = null;
    private offscreenCtx: CanvasRenderingContext2D | null = null;
    private offscreenHelpers: Map<string, ImageBitmap> = new Map();

    private ctx: CanvasRenderingContext2D | null = null;
    private lastW = 0;
    private lastH = 0;
    private lastDPR = 0;

    constructor(model: SpectrogramModel) {
        this.model = model;
        this.processor = new ChunkProcessor(model.config);
        this.colormap = new ColorMap();
        this.axisRenderer = new AxisRenderer(model);
    }

    setColormap(name: ColorMapName) {
        this.colormap.setMap(name);
        this.clearCache();
    }

    clearCache() {
        this.chunks.clear();
        this.offscreenHelpers.clear();
    }

    dispose() {
        this.clearCache();

        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.ctx = null;

        this.processor.dispose();
    }

    private setupHiDPICanvas(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number) {
        const dpr = window.devicePixelRatio || 1;

        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        const pixelWidth = Math.round(cssWidth * dpr);
        const pixelHeight = Math.round(cssHeight * dpr);

        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }

        const ctx = canvas.getContext('2d', { alpha: true })!;
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;

        // Offscreen canvas
        if (!this.offscreenCanvas) {
            this.offscreenCanvas = document.createElement('canvas');
        }
        if (
            this.offscreenCanvas.width !== pixelWidth ||
            this.offscreenCanvas.height !== pixelHeight
        ) {
            this.offscreenCanvas.width = pixelWidth;
            this.offscreenCanvas.height = pixelHeight;
            this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true })!;
            this.offscreenCtx.resetTransform();
            this.offscreenCtx.scale(dpr, dpr);
            this.offscreenCtx.imageSmoothingEnabled = false;
            this.offscreenCtx.clearRect(0, 0, cssWidth, cssHeight);
        }

        return ctx;
    }

    private calibrateCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
        return this.setupHiDPICanvas(canvas, cssW, cssH);
    }

    render(options: RenderOptions) {
        const { canvas, timeRange, freqRange, xAxis, yAxis } = options;
        const ctx = this.calibrateCanvas(canvas, options.width, options.height);
        if (!ctx || !this.offscreenCtx || !this.offscreenCanvas) {
            return;
        }

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        const [tStart, tEnd] = timeRange;
        const [fMin, fMax] = freqRange;

        const margins = this.axisRenderer.getMargins(
            ctx,
            height,
            timeRange,
            freqRange,
            xAxis,
            yAxis
        );

        const plotX = margins.left;
        const plotY = margins.top;
        const plotW = width - margins.left - margins.right;
        const plotH = height - margins.bottom - margins.top;

        if (!this.model.data || plotW <= 0 || plotH <= 0) {
            ctx.clearRect(0, 0, width, height);
            return;
        }

        const sampleRate = this.model.config.sampleRate;
        const config = this.model.config;
        const hopSize = Math.max(1, config.windowSize - config.overlap);

        // Chunk size (~10s)
        const targetChunkTime = 10.0;
        const targetSamples = targetChunkTime * sampleRate;
        const hopsPerChunk = Math.ceil(targetSamples / hopSize);
        const chunkSamples = hopsPerChunk * hopSize;

        const viewStartIdx = Math.floor(Math.max(0, tStart * sampleRate));
        const viewEndIdx = Math.floor(Math.min(this.model.data.length, tEnd * sampleRate));
        if (viewEndIdx <= viewStartIdx) {
            ctx.clearRect(0, 0, width, height);
            return;
        }

        const startChunkId = Math.floor(viewStartIdx / chunkSamples);
        const endChunkId = Math.floor(viewEndIdx / chunkSamples);
        const visibleChunks: DataChunk[] = [];

        for (let i = startChunkId; i <= endChunkId; i++) {
            const chunkStart = i * chunkSamples;
            const chunkEnd = Math.min((i + 1) * chunkSamples, this.model.data.length);
            const chunkId = `chunk_${i}`;

            let chunk = this.chunks.get(chunkId);

            if (!chunk) {
                const newChunk = new DataChunk(chunkId, chunkStart, chunkEnd, sampleRate);
                this.chunks.set(chunkId, newChunk);

                const imgData = this.processor.process(
                    this.model.data,
                    chunkStart,
                    chunkEnd,
                    config,
                    (val) => this.colormap.getRGB(val)
                );

                createImageBitmap(imgData).then((bmp) => {
                    // A newer setData() call may have replaced this chunk while processing.
                    if (this.chunks.get(chunkId) !== newChunk) {
                        bmp.close();
                        return;
                    }
                    newChunk.image = bmp;
                });

                chunk = newChunk;
            }

            visibleChunks.push(chunk);
        }

        // Keep the last complete frame until every visible bitmap is ready.
        if (visibleChunks.some((chunk) => !chunk.image)) {
            return;
        }

        // Rebuild with the current plot bounds, including any axis style changes.
        this.offscreenCtx.clearRect(0, 0, width, height);
        this.offscreenCtx.save();
        this.offscreenCtx.beginPath();
        this.offscreenCtx.rect(plotX, plotY, plotW, plotH);
        this.offscreenCtx.clip();

        for (const chunk of visibleChunks) {
            this.drawChunk(
                this.offscreenCtx,
                chunk,
                tStart,
                tEnd,
                fMin,
                fMax,
                plotX,
                plotY,
                plotW,
                plotH
            );
        }

        this.offscreenCtx.restore();

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(this.offscreenCanvas, 0, 0, width, height);

        this.axisRenderer.draw(ctx, width, height, timeRange, freqRange, margins, xAxis, yAxis);
    }

    private drawChunk(
        ctx: CanvasRenderingContext2D,
        chunk: DataChunk,
        viewTStart: number,
        viewTEnd: number,
        fMin: number, // Hz
        fMax: number, // Hz
        plotX: number,
        plotY: number,
        plotW: number,
        plotH: number
    ) {
        if (!chunk.image) {
            return;
        }

        const viewDuration = viewTEnd - viewTStart;
        const sampleRate = this.model.config.sampleRate;
        const nyquist = sampleRate / 2;

        const chunkStartTime = chunk.startIndex / sampleRate;
        const chunkEndTime = chunk.endIndex / sampleRate;

        const x1 = plotX + ((chunkStartTime - viewTStart) / viewDuration) * plotW;
        const x2 = plotX + ((chunkEndTime - viewTStart) / viewDuration) * plotW;

        if (x2 <= plotX || x1 >= plotX + plotW) {
            return;
        }

        const sourceX = Math.max(plotX, x1);
        const sourceEndX = Math.min(plotX + plotW, x2);
        const dpr = window.devicePixelRatio || 1;

        // Align shared chunk edges to device pixels to avoid transparent seams.
        const dx = sourceX === plotX ? sourceX : Math.round(sourceX * dpr) / dpr;
        const endX =
            sourceEndX === plotX + plotW ? sourceEndX : Math.round(sourceEndX * dpr) / dpr;
        const dw = endX - dx;
        if (dw <= 0) {
            return;
        }

        const texW = chunk.image.width;
        // Crop in the original time coordinates, independently of pixel snapping.
        const sx = ((sourceX - x1) / (x2 - x1)) * texW;
        const sw = ((sourceEndX - sourceX) / (x2 - x1)) * texW;

        const safeFMax = Math.min(fMax, nyquist);
        const safeFMin = Math.max(fMin, 0);

        const texH = chunk.image.height;
        const sy_top = (1 - safeFMax / nyquist) * texH;
        const sy_bottom = (1 - safeFMin / nyquist) * texH;
        const sy_h = sy_bottom - sy_top;

        if (sy_h > 0) {
            const dy = plotY;
            const dh = plotH;

            ctx.drawImage(chunk.image, sx, sy_top, sw, sy_h, dx, dy, dw, dh);
        }
    }
}
