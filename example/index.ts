import { type AxisOptions, FFTExecutor, Spectrogram } from '../src/index';
import RingBuffer from './RingBuffer';

const spectrogramDuration = 120; // seconds
const spectrogramFreqRange = [0, 25]; // Hz
const spectrogramMinDB = 110;
const spectrogramMaxDB = 160;

const spectrogramWidth = 768;
const spectrogramHeight = 256;

const sampleRate = 250;
const fftWindowSize = 768;

const fftExecutor = new FFTExecutor(1024); // optional: global FFT executor

const spectrogram = new Spectrogram({
    sampleRate: sampleRate,
    windowSize: fftWindowSize,
    overlap: Math.floor(fftWindowSize * 0.86),
    windowType: 'hann', // hann, hamming, blackman, rectangular
    minDb: spectrogramMinDB,
    maxDb: spectrogramMaxDB,
    fftExecutor
});
spectrogram.setColormap('jet'); // see src/render/ColorMap.ts for available colormaps

// Axis options are passed to render(), so changes take effect on the next frame.
const xAxis: AxisOptions = {
    visible: true,
    color: '#2563eb',
    lineWidth: 2,
    labelStyle: {
        color: '#1d4ed8',
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'AxisFont'
    }
};

const yAxis: AxisOptions = {
    visible: true,
    color: '#c2410c',
    lineWidth: 2,
    labelStyle: {
        color: '#9a3412',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'AxisFont'
    }
};

const createAxisControls = (name: string, options: AxisOptions) => {
    const fieldset = document.createElement('fieldset');
    fieldset.style.display = 'flex';
    fieldset.style.flexWrap = 'wrap';
    fieldset.style.gap = '8px';
    fieldset.style.maxWidth = '340px';

    const legend = document.createElement('legend');
    legend.textContent = name;
    fieldset.appendChild(legend);

    const addInput = (
        text: string,
        type: string,
        value: string | boolean,
        onChange: (input: HTMLInputElement) => void
    ) => {
        const label = document.createElement('label');
        label.textContent = text;
        label.style.display = 'flex';
        label.style.flexDirection = 'column';

        const input = document.createElement('input');
        input.type = type;
        if (typeof value === 'boolean') {
            input.checked = value;
        } else {
            input.value = value;
        }
        input.oninput = () => {
            if (input.checkValidity()) {
                onChange(input);
            }
        };
        label.appendChild(input);
        fieldset.appendChild(label);
        return input;
    };

    const labelStyle = options.labelStyle ?? (options.labelStyle = {});

    addInput('Visible', 'checkbox', options.visible !== false, (input) => {
        options.visible = input.checked;
    });
    addInput('Axis color', 'color', options.color ?? '#464646', (input) => {
        options.color = input.value;
    });
    const lineWidth = addInput(
        'Line width (px)',
        'number',
        String(options.lineWidth ?? 1),
        (input) => {
            options.lineWidth = input.valueAsNumber;
        }
    );
    lineWidth.min = '0.5';
    lineWidth.max = '8';
    lineWidth.step = '0.5';
    lineWidth.required = true;

    addInput('Label color', 'color', labelStyle.color ?? '#252525', (input) => {
        labelStyle.color = input.value;
    });
    const fontSize = addInput(
        'Font size (px)',
        'number',
        String(labelStyle.fontSize ?? 11),
        (input) => {
            labelStyle.fontSize = input.valueAsNumber;
        }
    );
    fontSize.min = '8';
    fontSize.max = '24';
    fontSize.required = true;

    const fontWeight = addInput(
        'Font weight',
        'number',
        String(labelStyle.fontWeight ?? 400),
        (input) => {
            labelStyle.fontWeight = input.valueAsNumber;
        }
    );
    fontWeight.min = '100';
    fontWeight.max = '900';
    fontWeight.step = '100';
    fontWeight.required = true;

    addInput('Font family', 'text', labelStyle.fontFamily ?? 'AxisFont', (input) => {
        labelStyle.fontFamily = input.value || 'AxisFont';
    });

    return fieldset;
};

const main = async () => {
    const root = document.getElementById('root') as HTMLDivElement;

    const loading = document.createElement('div');
    loading.textContent = 'Loading data...';
    loading.style.fontSize = '16px';
    loading.style.marginBottom = '8px';
    root.appendChild(loading);

    const res = await fetch(new URL('./testdata.txt', import.meta.url).toString());
    const text = await res.text();

    root.removeChild(loading);

    const lines = text.split('\n');
    const data: Array<[number, number]> = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const [timestampStr, valueStr] = line.split(' ');
        const timestamp = Number(timestampStr);
        const value = Number(valueStr);
        if (!isNaN(timestamp) && !isNaN(value)) {
            data.push([timestamp, value]);
        }
    }

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.flexWrap = 'wrap';
    controls.style.gap = '12px';
    controls.style.marginBottom = '12px';
    controls.appendChild(createAxisControls('X axis (time)', xAxis));
    controls.appendChild(createAxisControls('Y axis (frequency)', yAxis));
    root.appendChild(controls);

    const canvas = document.createElement('canvas');
    root.appendChild(canvas);

    const draw = () => {
        const duration = spectrogram.getDuration();
        const windowSize = spectrogramDuration;

        const end = Math.max(0.001, duration);
        const start = end - windowSize;

        spectrogram.render({
            canvas: canvas,
            width: spectrogramWidth,
            height: spectrogramHeight,
            timeRange: [start, end],
            freqRange: [spectrogramFreqRange[0], spectrogramFreqRange[1]],
            xAxis,
            yAxis
        });
        requestAnimationFrame(draw);
    };

    await spectrogram.init();
    draw();

    const ring = new RingBuffer<[number, number]>(spectrogramDuration * sampleRate);
    for (let i = 0; i < data.length; i += sampleRate) {
        ring.pushMany(data.slice(i, i + sampleRate));
        spectrogram.setData(ring.toArray());
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // create a button to destroy the spectrogram
    const destroyButton = document.createElement('button');
    destroyButton.textContent = 'Destroy Spectrogram';
    destroyButton.style.marginTop = '12px';
    destroyButton.onclick = () => {
        spectrogram.destroy();
    };
    root.appendChild(destroyButton);
};

main();
