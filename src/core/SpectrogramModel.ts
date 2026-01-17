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
            const buffer = new Float32Array(data.length);
            for (let i = 0; i < data.length; i++) {
                buffer[i] = data[i][1];
            }
            this.data = buffer;
        } else {
            this.data = data;
            this.startTime = 0;
        }
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
