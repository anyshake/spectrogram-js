import { Spectrogram } from '../src/index';
import RingBuffer from './RingBuffer';

const spectrogramDuration = 120; // seconds
const spectrogramFreqRange = [0, 25]; // Hz
const spectrogramMinDB = 110;
const spectrogramMaxDB = 160;

const spectrogramWidth = 768;
const spectrogramHeight = 256;

const sampleRate = 250;
const fftWindowSize = 768;

const spectrogram = new Spectrogram({
    sampleRate: sampleRate,
    windowSize: fftWindowSize,
    overlap: Math.floor(fftWindowSize * 0.86),
    windowType: 'hann', // hann, hamming, blackman, rectangular
    minDb: spectrogramMinDB,
    maxDb: spectrogramMaxDB
});
spectrogram.setColormap('jet'); // see src/ColorMap.ts for available colormaps

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
            freqRange: [spectrogramFreqRange[0], spectrogramFreqRange[1]]
        });
        requestAnimationFrame(draw);
    };

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
