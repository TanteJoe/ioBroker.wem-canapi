import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, writeFileSync, existsSync } from 'fs';

const postBuild = () => ({
    name: 'post-build',
    closeBundle() {
        // index.html in build/ kopieren
        copyFileSync(
            resolve(__dirname, 'index_m.html'),
            resolve(__dirname, 'build/index_m.html')
        );
        copyFileSync(
            resolve(__dirname, 'build/index.js'),
            resolve(__dirname, 'index.js')
        );
        // Leere CSS falls nicht vorhanden
        const css = resolve(__dirname, 'build/index.css');
        if (!existsSync(css)) writeFileSync(css, '');
        copyFileSync(
            resolve(__dirname, 'build/index.css'),
            resolve(__dirname, 'index.css')
        );
        console.log('✅ Build komplett');
    }
});

export default defineConfig({
    plugins: [react(), postBuild()],
    base: './',
    // ── process.env Fix ─────────────────────────────────────────
    define: {
        'process.env':              {},
        'process.env.NODE_ENV':     JSON.stringify('production'),
        'process.platform':         JSON.stringify('browser'),
        'process.version':          JSON.stringify(''),
        global:                     'globalThis',
    },
    build: {
        outDir:      'build',
        emptyOutDir: true,
        sourcemap:   false,
        lib: {
            entry:    resolve(__dirname, 'src/index.tsx'),
            name:     'WemCanApi',
            fileName: () => 'index.js',
            formats:  ['iife'],
        },
        rollupOptions: {
            output: {
                assetFileNames: (info) =>
                    info.name?.endsWith('.css') ? 'index.css' : (info.name ?? 'file'),
            },
        },
    },
});