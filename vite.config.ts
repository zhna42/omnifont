import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// Конфигурация сборки библиотеки в режиме "library mode".
// Собираем ESM + UMD бандлы и генерируем .d.ts декларации.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Omnifont',
      fileName: 'omnifont',
      formats: ['es', 'umd'],
    },
    sourcemap: true,
    target: 'es2022',
    minify: 'esbuild',
    rollupOptions: {
      // Zero-dependency: внешних зависимостей нет, ничего не выносим в external.
      output: {
        exports: 'named',
      },
    },
  },
  plugins: [
    dts({
      rollupTypes: true,
      insertTypesEntry: true,
    }),
  ],
});
