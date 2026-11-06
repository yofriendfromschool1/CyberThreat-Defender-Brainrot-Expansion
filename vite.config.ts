import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.CTD_HOST ?? "127.0.0.1:8787";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    sourcemap: true,
    target: "es2022",
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: `http://${host}`,
        changeOrigin: true,
      },
      "/ws": {
        target: `ws://${host}`,
        ws: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
  },
});
