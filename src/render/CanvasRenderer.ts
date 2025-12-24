import { ChunkProcessor, DataChunk } from '../core/DataChunk';
import { SpectrogramModel } from '../core/SpectrogramModel';
import { AxisRenderer } from './AxisRenderer';
import { ColorMap, ColorMapName } from './ColorMap';

export interface RenderOptions {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    timeRange: [number, number]; // [startTime, endTime]
    freqRange: [number, number]; // [minFreq, maxFreq]
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

    setupHiDPICanvas(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number) {
        const dpr = window.devicePixelRatio || 1;

        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);

        const ctx = canvas.getContext('2d', { alpha: true })!;
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;

        if (!this.offscreenCanvas) {
            this.offscreenCanvas = document.createElement('canvas');
        }
        this.offscreenCanvas.width = canvas.width;
        this.offscreenCanvas.height = canvas.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true })!;
        this.offscreenCtx.resetTransform();
        this.offscreenCtx.scale(dpr, dpr);
        this.offscreenCtx.imageSmoothingEnabled = false;

        return ctx;
    }

    private calibrateCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
        const dpr = window.devicePixelRatio || 1;

        if (this.ctx && this.lastW === cssW && this.lastH === cssH && this.lastDPR === dpr) {
            return this.ctx;
        }

        this.lastW = cssW;
        this.lastH = cssH;
        this.lastDPR = dpr;

        this.ctx = this.setupHiDPICanvas(canvas, cssW, cssH);
        return this.ctx;
    }

    render(options: RenderOptions) {
        const { canvas, timeRange, freqRange } = options;
        const ctx = this.calibrateCanvas(canvas, options.width, options.height);

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        const [tStart, tEnd] = timeRange;
        const [fMin, fMax] = freqRange;

        const MARGIN_LEFT = 50;
        const MARGIN_BOTTOM = 30;
        const MARGIN_TOP = 12;
        const MARGIN_RIGHT = 32;

        const plotX = MARGIN_LEFT;
        const plotY = MARGIN_TOP;
        const plotW = width - MARGIN_LEFT - MARGIN_RIGHT;
        const plotH = height - MARGIN_BOTTOM - MARGIN_TOP;

        ctx.clearRect(0, 0, width, height);

        if (!this.model.data) {
            return;
        }

        const sampleRate = this.model.config.sampleRate;
        const config = this.model.config;
        const hopSize = Math.max(1, config.windowSize - config.overlap);

        // Chunk size in time (~10s)
        const targetChunkTime = 10.0;
        const targetSamples = targetChunkTime * sampleRate;
        const hopsPerChunk = Math.ceil(targetSamples / hopSize);
        const chunkSamples = hopsPerChunk * hopSize;

        const viewStartIdx = Math.floor(Math.max(0, tStart * sampleRate));
        const viewEndIdx = Math.floor(Math.min(this.model.data.length, tEnd * sampleRate));
        if (viewEndIdx <= viewStartIdx) {
            return;
        }

        const startChunkId = Math.floor(viewStartIdx / chunkSamples);
        const endChunkId = Math.floor(viewEndIdx / chunkSamples);

        for (let i = startChunkId; i <= endChunkId; i++) {
            const chunkStart = i * chunkSamples;
            const chunkEnd = Math.min((i + 1) * chunkSamples, this.model.data.length);
            const chunkId = `chunk_${i}`;

            let chunk = this.chunks.get(chunkId);

            if (!chunk) {
                chunk = new DataChunk(chunkId, chunkStart, chunkEnd, sampleRate);
                this.chunks.set(chunkId, chunk);

                const imgData = this.processor.process(
                    this.model.data,
                    chunkStart,
                    chunkEnd,
                    config,
                    (val) => this.colormap.getRGB(val)
                );

                createImageBitmap(imgData).then((bmp) => {
                    if (chunk) {
                        chunk.image = bmp;
                        this.offscreenCtx!.save();
                        this.offscreenCtx!.beginPath();
                        this.offscreenCtx!.rect(plotX, plotY, plotW, plotH);
                        this.offscreenCtx!.clip();
                        this.drawChunk(
                            this.offscreenCtx!,
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
                        this.offscreenCtx!.restore();
                    }
                });
            }

            if (chunk.image) {
                this.offscreenCtx!.save();
                this.offscreenCtx!.beginPath();
                this.offscreenCtx!.rect(plotX, plotY, plotW, plotH);
                this.offscreenCtx!.clip();
                this.drawChunk(
                    this.offscreenCtx!,
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
                this.offscreenCtx!.restore();
            }
        }

        ctx.drawImage(this.offscreenCanvas!, 0, 0, width, height);

        this.axisRenderer.draw(ctx, width, height, timeRange, freqRange, {
            left: MARGIN_LEFT,
            bottom: MARGIN_BOTTOM,
            top: MARGIN_TOP,
            right: MARGIN_RIGHT
        });
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

        const dx = Math.max(plotX, x1);
        const dw = Math.min(plotX + plotW, x2) - dx;

        const texW = chunk.image.width;
        const sx = ((dx - x1) / (x2 - x1)) * texW;
        const sw = (dw / (x2 - x1)) * texW;

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
