# spectrogram-js

🎶 **A lightweight TypeScript library for real-time spectrogram (waterfall) rendering.**

**Live Demo:** https://anyshake.github.io/spectrogram-js/

`spectrogram-js` provides a simple, dependency-light way to generate FFT-based spectrograms and render them onto a `<canvas>`, suitable for **signal processing**, **audio**, **sensor data**, and **scientific visualization** use cases.

<div align="center">
  <img
    src="https://github.com/anyshake/spectrogram-js/blob/master/images/preview.webp?raw=true"
    style="max-width: 800px; width: 100%;"
  />
</div>

## Features

- Real-time spectrogram / waterfall rendering
- Configurable FFT window, overlap, and window functions
- Built-in colormaps (`jet`, `viridis`, etc.)
- Optional shared FFT executor for performance
- Designed for streaming / incremental data
- Zero framework dependency (plain Canvas API)

## Installation

```bash
$ npm install spectrogram-js
```

or

```bash
$ pnpm add spectrogram-js
```

## Basic Usage

```ts
import { Spectrogram } from 'spectrogram-js';

const windowSize = 768;

const spectrogram = new Spectrogram({
    windowType: 'hann', // hann, hamming, blackman, rectangular
    overlap: Math.floor(windowSize * 0.86),
    sampleRate: 250,
    minDb: 110,
    maxDb: 160,
    windowSize
});

spectrogram.setColormap('jet');
```

## Rendering

```ts
const canvas = document.querySelector('canvas')!;

spectrogram.render({
    canvas,
    width: 768,
    height: 256,
    timeRange: [0, 120], // seconds
    freqRange: [0, 25] // Hz
});
```

Call `render()` in a loop (`requestAnimationFrame`) for real-time updates.

## Feeding Data

Input data format:

```ts
Array<[timestamp_in_ms, value]>;
```

For example:

```ts
spectrogram.setData([
    [1765945224240, 80001],
    [1765945224244, 27639],
    [1765945224248, 57144],
    [1765945224252, 29916],
    [1765945224256, 66871],
    // ...
]);
```

You’re expected to manage buffering yourself (e.g. ring buffer).

## Colormaps

Built-in colormaps include:

- viridis
- inferno
- grayscale
- jet
- hot
- cool
- spring
- summer
- autumn
- winter
- bone

See `src/render/ColorMap.ts` for the color definitions.

## License

MIT License © 2025 AnyShake Project
