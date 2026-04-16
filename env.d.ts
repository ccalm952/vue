/// <reference types="vite/client" />

export {};

declare module "vue-router" {
  interface RouteMeta {
    requiresAdmin?: boolean;
  }
}

interface ImportMetaEnv {
  readonly VITE_AMAP_JS_API_KEY?: string;
  readonly VITE_AMAP_SECURITY_JS_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  const ElMessage: typeof import("element-plus/es").ElMessage;
  const ElMessageBox: typeof import("element-plus/es").ElMessageBox;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<{}, {}, any>;
  export default component;
}
