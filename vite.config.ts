import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

/**
 * Сборка headless-библиотеки в Vite library mode.
 *
 * esbuild-минификация отключена — в headless-библиотеках финальную
 * минификацию и tree-shaking выполняет бандлер конечного приложения.
 * Библиотека поставляется в читаемой форме, sourcemap включены.
 */
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Omnifont',
      fileName: 'omnifont',
      // ESM (.js) + UMD для require-совместимости.
      formats: ['es', 'umd'],
    },
    sourcemap: true,
    target: 'es2022',
    // Минимум трансформаций: финальный бандлер пользователя сделает
    // minification/tree-shaking сам.
    minify: false,
    rollupOptions: {
      // Zero-dependency: внешних зависимостей нет, ничего не выносим в external.
      output: {
        // Именованные экспорты + default сосуществуют без предупреждений UMD.
        exports: 'named',
      },
    },
  },
  plugins: [
    // Генерация single-file .d.ts (rollupTypes) без tsc в комплекте.
    dts({
      rollupTypes: true,
      insertTypesEntry: true,
    }),
  ],
});
