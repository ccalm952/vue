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
  build: {
    // 按依赖分组拆包，尽量减小入口 chunk 体积。
    // https://rolldown.rs/in-depth/manual-code-splitting
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 20_000,
          groups: [
            {
              name: "echarts",
              test: /node_modules[\\/](echarts|zrender)[\\/]/,
              priority: 3,
              // 体积过大时继续拆分，避免单个图表包过大。
              maxSize: 450_000,
            },
            {
              name: "element-plus",
              test: /node_modules[\\/]element-plus[\\/]/,
              priority: 2,
              maxSize: 450_000,
            },
            {
              name: "vue-vendor",
              // 正则保持简单，避免 Rolldown 解析 bundled 配置时出问题。
              test: /node_modules[\\/](vue|vue-router|pinia)[\\/]/,
              priority: 2,
            },
            {
              name: "vendor",
              test: /node_modules[\\/]/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
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
