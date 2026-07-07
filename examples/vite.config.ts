import { defineConfig } from "vite";
import { resolve } from "node:path";

const root = resolve(__dirname);

export default defineConfig({
  root,
  base: process.env.DEMO_BASE ?? "/omnifont/",
  server: { port: 5173, open: true },
  build: {
    outDir: resolve(__dirname, "../demo-dist"),
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        google: resolve(root, "google/index.html"),
        custom: resolve(root, "custom/index.html"),
      },
    },
  },
});
