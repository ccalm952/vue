import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import basicSsl from "@vitejs/plugin-basic-ssl";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

const autoImportDts = fileURLToPath(new URL("./src/auto-imports.d.ts", import.meta.url));
const componentsDts = fileURLToPath(new URL("./src/components.d.ts", import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: autoImportDts,
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: componentsDts,
    }),
    command === "serve" && basicSsl(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5321",
        changeOrigin: true,
      },
    },
  },
}));
