import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Dev-конфиг для примера с Google Fonts.
export default defineConfig({
  root: resolve(__dirname),
  server: { port: 5174, open: true },
});
