import { Spectrogram } from '../src/index.ts';

const root = document.getElementById('root') as HTMLDivElement;

const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 256;
root.appendChild(canvas);
const sp = new Spectrogram(canvas);

const data = new Float32Array(512).map(() => Math.random());
sp.drawSpectrum(data);
