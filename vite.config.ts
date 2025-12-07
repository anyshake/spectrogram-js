import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ command }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    if (command === 'serve') {
        return { root: path.resolve(__dirname, 'example') };
    }

    return {
        plugins: [dts()],
        build: {
            lib: {
                entry: path.resolve(__dirname, 'src/index.ts'),
                name: 'SpectrogramJs',
                formats: ['es', 'umd', 'cjs'],
                fileName: (format) => `spectrogram-js.${format}.js`
            },
            rollupOptions: {
                treeshake: true
            },
            sourcemap: true
        }
    };
});
