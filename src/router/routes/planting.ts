import type { RouteRecordRaw } from "vue-router";

export const plantingRoutes: RouteRecordRaw[] = [
  {
    path: "planting",
    redirect: "/planting/query",
  },
  {
    path: "planting/query",
    name: "planting-query",
    component: () => import("@/views/planting/planting-query.vue"),
  },
  {
    path: "planting/add",
    name: "planting-add",
    component: () => import("@/views/planting/planting-add.vue"),
  },
  {
    path: "planting/inventory",
    name: "planting-inventory",
    component: () => import("@/views/planting/planting-inventory.vue"),
  },
  {
    path: "planting/patients",
    redirect: "/planting/patient",
  },
  {
    path: "planting/patient",
    name: "planting-patient",
    component: () => import("@/views/planting/planting-patient.vue"),
  },
  {
    path: "planting/stats",
    name: "planting-stats",
    component: () => import("@/views/planting/planting-stats.vue"),
  },
];
