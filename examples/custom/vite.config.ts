import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Dev-конфиг для примера с кастомным JSON.
export default defineConfig({
  root: resolve(__dirname),
  server: { port: 5175, open: true },
});
