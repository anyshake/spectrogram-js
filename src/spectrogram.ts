import {
    SpectrogramConfig,
    SpectrogramData,
    SpectrogramModel,
    TimestampedData
} from './core/SpectrogramModel';
import { NotoSansMonoRegular } from './fonts';
import { CanvasRenderer, RenderOptions } from './render/CanvasRenderer';
import { ColorMapName } from './render/ColorMap';

export type { SpectrogramConfig, SpectrogramData } from './core/SpectrogramModel';
export type { ColorMapName } from './render/ColorMap';

export class Spectrogram {
    private model: SpectrogramModel;
    private renderer: CanvasRenderer;

    constructor(config: SpectrogramConfig) {
        this.model = new SpectrogramModel(config);
        this.renderer = new CanvasRenderer(this.model);
    }

    async init() {
        const font = new FontFace('AxisFont', `url(data:font/woff2;base64,${NotoSansMonoRegular})`);
        await font.load();
        (document.fonts as unknown as { add: (font: FontFace) => void }).add(font);
    }

    setData(data: SpectrogramData | TimestampedData) {
        this.model.setData(data);
        this.renderer.clearCache();
    }

    destroy() {
        this.renderer.dispose();
    }

    render(options: Omit<RenderOptions, 'freqRange'> & { freqRange?: [number, number] }) {
        // Default freq range to [0, Nyquist] if not provided
        const nyquist = this.model.config.sampleRate / 2;
        const freqRange = options.freqRange || [0, nyquist];

        this.renderer.render({
            ...options,
            freqRange
        });
    }

    updateConfig(config: Partial<SpectrogramConfig>) {
        this.model.updateConfig(config);
        if (
            config.windowSize ||
            config.windowType ||
            config.minDb ||
            config.maxDb ||
            config.fftSize ||
            config.overlap
        ) {
            this.renderer.clearCache();
        }
    }

    setColormap(name: ColorMapName) {
        this.renderer.setColormap(name);
    }

    getDuration(): number {
        return this.model.getDuration();
    }
}
