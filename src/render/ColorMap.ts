export type ColorMapName =
    | 'viridis'
    | 'inferno'
    | 'grayscale'
    | 'jet'
    | 'hot'
    | 'cool'
    | 'spring'
    | 'summer'
    | 'autumn'
    | 'winter'
    | 'bone';

type RGB = [number, number, number];

// Simple interpolation helper
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function viridis(t: number): RGB {
    if (t < 0) {
        t = 0;
    }
    if (t > 1) {
        t = 1;
    }

    // 0% #440154 (68, 1, 84)
    // 25% #3b528b (59, 82, 139)
    // 50% #21918c (33, 145, 140)
    // 75% #5ec962 (94, 201, 98)
    // 100% #fde725 (253, 231, 37)

    const map = [
        [68, 1, 84],
        [59, 82, 139],
        [33, 145, 140],
        [94, 201, 98],
        [253, 231, 37]
    ];

    const step = 1.0 / (map.length - 1);
    const idx = Math.floor(t / step);
    if (idx >= map.length - 1) {
        return map[map.length - 1] as RGB;
    }

    const nextIdx = idx + 1;
    const localT = (t - idx * step) / step;

    const c1 = map[idx];
    const c2 = map[nextIdx];

    return [
        Math.floor(lerp(c1[0], c2[0], localT)),
        Math.floor(lerp(c1[1], c2[1], localT)),
        Math.floor(lerp(c1[2], c2[2], localT))
    ];
}

function inferno(t: number): RGB {
    // Black -> Red -> Orange -> Yellow
    // 0% #000004 (0, 0, 4)
    // 25% #57106e (87, 16, 110)
    // 50% #bb3754 (187, 55, 84)
    // 75% #f98e09 (249, 142, 9)
    // 100% #fcffa4 (252, 255, 164)

    if (t < 0) {
        t = 0;
    }
    if (t > 1) {
        t = 1;
    }

    const map = [
        [0, 0, 4],
        [87, 16, 110],
        [187, 55, 84],
        [249, 142, 9],
        [252, 255, 164]
    ];

    const step = 1.0 / (map.length - 1);
    const idx = Math.floor(t / step);
    if (idx >= map.length - 1) {
        return map[map.length - 1] as RGB;
    }

    const nextIdx = idx + 1;
    const localT = (t - idx * step) / step;

    const c1 = map[idx];
    const c2 = map[nextIdx];

    return [
        Math.floor(lerp(c1[0], c2[0], localT)),
        Math.floor(lerp(c1[1], c2[1], localT)),
        Math.floor(lerp(c1[2], c2[2], localT))
    ];
}

function grayscale(t: number): RGB {
    const v = Math.floor(t * 255);
    return [v, v, v];
}

function jet(t: number): RGB {
    // Jet: Blue -> Cyan -> Yellow -> Orange -> Red
    // t: 0..1
    const v = Math.max(0, Math.min(1, t));
    // R: 0 at 0.35, 1 at 0.66
    // G: 0 at 0.12, 1 at 0.37, 1 at 0.64, 0 at 0.89
    // B: 1 at 0.11, 0 at 0.34

    // Simple 4-segment interpolation
    const r = Math.min(4 * v - 1.5, -4 * v + 4.5);
    const g = Math.min(4 * v - 0.5, -4 * v + 3.5);
    const b = Math.min(4 * v + 0.5, -4 * v + 2.5);

    return [
        Math.floor(Math.max(0, Math.min(1, r)) * 255),
        Math.floor(Math.max(0, Math.min(1, g)) * 255),
        Math.floor(Math.max(0, Math.min(1, b)) * 255)
    ];
}

function hot(t: number): RGB {
    // Black -> Red -> Yellow -> White
    // R: 0->1 linear (0-0.33)
    // G: 0 (0-0.33) -> 1 (0.66-1)
    // B: 0 (0-0.66) -> 1 (1)

    // Easier with keypoints:
    // 0.0: 0,0,0
    // 0.33: 255,0,0
    // 0.66: 255,255,0
    // 1.0: 255,255,255

    let r = 0,
        g = 0,
        b = 0;

    if (t < 0.33) {
        r = t / 0.33;
    } else if (t < 0.66) {
        r = 1;
        g = (t - 0.33) / 0.33;
    } else {
        r = 1;
        g = 1;
        b = (t - 0.66) / 0.34;
    }

    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}

function cool(t: number): RGB {
    // Cyan -> Magenta
    // R: 0 -> 1
    // G: 1 -> 0
    // B: 1
    const r = t;
    const g = 1 - t;
    const b = 1;
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}

function spring(t: number): RGB {
    // Magenta -> Yellow
    // R: 1
    // G: t
    // B: 1 - t
    return [255, Math.floor(t * 255), Math.floor((1 - t) * 255)];
}

function summer(t: number): RGB {
    // Green -> Yellow
    // R: t
    // G: 0.5 + 0.5*t
    // B: 0.4
    // Standard matplotlib 'summer' is simpler
    // 0.0: (0.0, 0.5, 0.4)
    // 1.0: (1.0, 1.0, 0.4)
    return [Math.floor(t * 255), Math.floor((0.5 + 0.5 * t) * 255), Math.floor(0.4 * 255)];
}

function autumn(t: number): RGB {
    // Red -> Orange -> Yellow
    // R: 1
    // G: t
    // B: 0
    return [255, Math.floor(t * 255), 0];
}

function winter(t: number): RGB {
    // Blue -> Green
    // 0.0: (0, 0, 1)
    // 1.0: (0, 1, 0.5)
    // R: 0
    // G: t
    // B: 1.0 - 0.5*t
    return [0, Math.floor(t * 255), Math.floor((1.0 - 0.5 * t) * 255)];
}

function bone(t: number): RGB {
    // Dark Blue -> White (Grayish)
    // Complex, usually approximate
    // 0: 0,0,0
    // 1: 1,1,1
    // With blue tint in middle
    // R: t (+ small bump)
    // G: t (+ med bump)
    // B: t (+ large bump)

    const r = t;
    let g = t;
    let b = t;

    if (t < 0.75) {
        b = t + 0.1 * Math.sin(t * Math.PI * 2);
    }
    if (t < 0.5) {
        g = t + 0.1 * Math.sin(t * Math.PI * 2);
    }

    return [
        Math.floor(Math.min(1, r) * 255),
        Math.floor(Math.min(1, g) * 255),
        Math.floor(Math.min(1, b) * 255)
    ];
}

export class ColorMap {
    private type: ColorMapName;
    private lut: Uint8Array; // [R, G, B, R, G, B...] for 0..255

    constructor(type: ColorMapName = 'viridis') {
        this.type = type;
        this.lut = new Uint8Array(256 * 3);
        this.generateLut();
    }

    private generateLut() {
        let fn = viridis;
        if (this.type === 'inferno') {
            fn = inferno;
        }
        if (this.type === 'grayscale') {
            fn = grayscale;
        }
        if (this.type === 'jet') {
            fn = jet;
        }
        if (this.type === 'hot') {
            fn = hot;
        }
        if (this.type === 'cool') {
            fn = cool;
        }
        if (this.type === 'spring') {
            fn = spring;
        }
        if (this.type === 'summer') {
            fn = summer;
        }
        if (this.type === 'autumn') {
            fn = autumn;
        }
        if (this.type === 'winter') {
            fn = winter;
        }
        if (this.type === 'bone') {
            fn = bone;
        }

        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            const rgb = fn(t);
            this.lut[i * 3] = rgb[0];
            this.lut[i * 3 + 1] = rgb[1];
            this.lut[i * 3 + 2] = rgb[2];
        }
    }

    getRGB(t: number): RGB {
        if (t <= 0) {
            t = 0;
        }
        if (t >= 1) {
            t = 1;
        }
        const idx = Math.floor(t * 255);
        return [this.lut[idx * 3], this.lut[idx * 3 + 1], this.lut[idx * 3 + 2]];
    }

    setMap(type: ColorMapName) {
        this.type = type;
        this.generateLut();
    }
}
