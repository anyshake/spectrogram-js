import { FFTExecutor } from '../dsp/fft';
import { WindowFunctionType } from '../dsp/window';

export interface SpectrogramConfig {
    // Sample rate of the input data in Hz
    sampleRate: number;
    // Size of the analysis window in samples
    windowSize: number;
    // Number of samples to overlap (e.g., 512).
    overlap: number;
    // Optional, defaults to next power of 2 >= windowSize
    fftSize?: number;
    // Type of window function to apply
    windowType: WindowFunctionType;

    minDb: number;
    maxDb: number;

    // Optional, speccify a FFT executor instance for reuse
    fftExecutor?: FFTExecutor;

    // Optional, timestamped samples further apart than this many milliseconds
    // are drawn as a blank gap. Gaps are ignored when omitted.
    gapThreshold?: number;
}

export type SpectrogramData = Float32Array | Float64Array;
export type TimestampedData = Array<[number, number]>; // [timestamp, value]

export class SpectrogramModel {
    config: SpectrogramConfig;
    data: SpectrogramData | null = null;

    showRealTimeScale: boolean = false;
    startTime: number = 0;

    constructor(config: SpectrogramConfig) {
        this.config = config;
    }

    setData(data: SpectrogramData | TimestampedData) {
        const isTimestamped = this.isTimestamped(data);
        this.showRealTimeScale = isTimestamped;

        if (isTimestamped) {
            if (data.length === 0) {
                this.data = new Float32Array(0);
                return;
            }
            this.startTime = data[0][0];
            this.data = this.toBuffer(data);
        } else {
            this.data = data;
            this.startTime = 0;
        }
    }

    private getGapSize(data: TimestampedData, index: number) {
        const { gapThreshold, sampleRate } = this.config;
        if (gapThreshold === undefined || index === 0 || sampleRate <= 0) {
            return 0;
        }
        const delta = data[index][0] - data[index - 1][0];
        return delta > gapThreshold ? Math.max(0, Math.round((delta * sampleRate) / 1000) - 1) : 0;
    }

    private toBuffer(data: TimestampedData) {
        let length = data.length;
        for (let i = 1; i < data.length; i++) {
            length += this.getGapSize(data, i);
        }

        const buffer = new Float32Array(length);
        let offset = 0;
        for (let i = 0; i < data.length; i++) {
            const gap = this.getGapSize(data, i);
            if (gap > 0) {
                buffer.fill(NaN, offset, offset + gap);
                offset += gap;
            }
            buffer[offset++] = data[i][1];
        }
        return buffer;
    }

    private isTimestamped(data: unknown): data is TimestampedData {
        return Array.isArray(data) && data.length > 0 && Array.isArray(data[0]);
    }

    updateConfig(newConfig: Partial<SpectrogramConfig>) {
        this.config = { ...this.config, ...newConfig };
    }

    getDuration(): number {
        return this.data ? this.data.length / this.config.sampleRate : 0;
    }
}
