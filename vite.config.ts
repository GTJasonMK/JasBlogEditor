import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;
const devPort = Number(process.env.JAS_DEV_PORT) || 1422;
const hmrPort = Number(process.env.JAS_HMR_PORT) || devPort + 1;
const strictPort = process.env.JAS_STRICT_PORT === "1";

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        // 将重型库拆分为独立 chunk，配合懒加载减小首屏体积
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'zustand'],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-highlight', 'katex', 'rehype-katex'],
          'vendor-mermaid': ['mermaid'],
          'vendor-graph': ['@xyflow/react'],
        },
      },
    },
  },
  server: {
    port: devPort,
    // 默认允许自动切换端口（提升纯 Web 开发体验）。
    // 桌面端（Tauri）通过 `JAS_STRICT_PORT=1` 或 CLI `--strictPort` 保证端口与 devUrl 一致。
    strictPort,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: hmrPort,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
