import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ command, mode }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    if (mode === 'example') {
        return {
            root: path.resolve(__dirname, 'example'),
            build: {
                outDir: path.resolve(__dirname, 'dist-example'),
                emptyOutDir: true,
                sourcemap: true
            },
            base: './'
        };
    }

    return {
        root: command === 'serve' ? path.resolve(__dirname, 'example') : path.resolve(__dirname),
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
            sourcemap: true,
            outDir: 'dist',
            emptyOutDir: true
        }
    };
});
