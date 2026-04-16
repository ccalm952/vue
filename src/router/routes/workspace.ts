import type { RouteRecordRaw } from "vue-router";

export const workspaceRoutes: RouteRecordRaw[] = [
  {
    path: "dashboard",
    name: "dashboard",
    component: () => import("@/views/workspace/dashboard.vue"),
  },
  {
    path: "appointments",
    name: "appointments",
    component: () => import("@/views/workspace/appointments.vue"),
  },
  {
    path: "reports/revenue",
    name: "revenue-analysis",
    component: () => import("@/views/workspace/revenue-analysis.vue"),
  },
];
