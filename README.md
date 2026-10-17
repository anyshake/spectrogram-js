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

const canvas = document.querySelector('canvas')!;
const windowSize = 768;

const spectrogram = new Spectrogram({
    windowType: 'hann', // hann, hamming, blackman, rectangular
    overlap: Math.floor(windowSize * 0.86),
    sampleRate: 250,
    minDb: 110,
    maxDb: 160,
    windowSize
});

const init = async () => {
    spectrogram.setColormap('jet');
    await spectrogram.init();
};
```

`init()` loads the necessary fonts, which is required for rendering the spectrogram.

## Rendering

```ts
spectrogram.render({
    canvas,
    width: 768,
    height: 256,
    timeRange: [0, 120], // seconds
    freqRange: [0, 25] // Hz
});
```

Call `render()` in a loop (`requestAnimationFrame`) for real-time updates.

## Appearance

You can customize appearance and visibility by setting `xAxis` and `yAxis` independently in `render()`:

```ts
spectrogram.render({
    canvas,
    width: 768,
    height: 256,
    timeRange: [0, 120],
    freqRange: [0, 25],
    xAxis: {
        visible: true,
        color: '#2563eb',
        lineWidth: 2,
        labelStyle: {
            color: '#1d4ed8',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'Arial, sans-serif'
        }
    },
    yAxis: {
        visible: false，
    }
});
```

All axis settings are optional. Defaults preserve the original appearance: visible axes,
`#464646` lines at 1 px, and `#252525` labels using normal-weight 11 px `AxisFont`.
`labelStyle` applies to tick labels and the frequency axis title. Sizes use CSS pixels;
`fontWeight` accepts a number or a CSS weight such as `'normal'` or `'bold'`.
Custom fonts must be available in the browser before rendering.

Setting `visible: false` hides that axis together with its ticks, labels, and title.
Margins adjust to label sizes and axis visibility. Omitted options use defaults on each
`render()` call. See `example/index.ts` for interactive controls for both axes.

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
    [1765945224256, 66871]
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
