export type WindowFunctionType = 'hann' | 'hamming' | 'blackman' | 'rectangular';

export const createWindow = (size: number, type: WindowFunctionType): Float32Array => {
    const window = new Float32Array(size);

    switch (type) {
        case 'rectangular':
            return window.fill(1);
        case 'hann':
            for (let i = 0; i < size; i++) {
                window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
            }
            break;
        case 'hamming':
            for (let i = 0; i < size; i++) {
                window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
            }
            break;
        case 'blackman':
            for (let i = 0; i < size; i++) {
                const a0 = 0.42;
                const a1 = 0.5;
                const a2 = 0.08;
                window[i] =
                    a0 -
                    a1 * Math.cos((2 * Math.PI * i) / (size - 1)) +
                    a2 * Math.cos((4 * Math.PI * i) / (size - 1));
            }
            break;
    }

    return window;
};

export const applyWindow = (
    input: Float32Array,
    window: Float32Array,
    output?: Float32Array
): Float32Array => {
    const len = Math.min(input.length, window.length);
    const out = output || new Float32Array(len);

    for (let i = 0; i < len; i++) {
        out[i] = input[i] * window[i];
    }

    return out;
};
