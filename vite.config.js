import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  test: {
    setupFiles: ["./vitest.setup.js"],
    exclude: ["node_modules/**", "dist/**", "e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@sections": path.resolve(__dirname, "./src/components/sections"),
      "@common": path.resolve(__dirname, "./src/components/common"),
      "@forms": path.resolve(__dirname, "./src/components/forms"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@styles": path.resolve(__dirname, "./src/styles"),
      "@assets": path.resolve(__dirname, "./src/assets"),
      "@data": path.resolve(__dirname, "./src/data"),
    },
  },
  build: {
    // Оптимизация сборки для production
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Один общий vendor снижает риск циклических импортов между чанками.
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
    // Оптимизация размера бандла
    chunkSizeWarningLimit: 1000,
    // Минификация включена по умолчанию в Vite
    minify: "esbuild", // Использует esbuild для быстрой минификации
    // Source maps для production (опционально)
    // Включить sourcemap: true для отладки production-сборки
    sourcemap: false,
    // Оптимизация ассетов
    assetsInlineLimit: 4096, // Инлайн ресурсы меньше 4kb
  },
});
