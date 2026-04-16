import type { RouteRecordRaw } from "vue-router";

export const attendanceRoutes: RouteRecordRaw[] = [
  {
    path: "attendance",
    name: "attendance",
    component: () => import("@/views/attendance/attendance.vue"),
  },
  {
    path: "attendance/settings",
    name: "attendance-settings",
    component: () => import("@/views/attendance/attendance-settings.vue"),
  },
  {
    path: "attendance/shift-settings",
    name: "attendance-shift-settings",
    component: () => import("@/views/attendance/attendance-shift-settings.vue"),
  },
  {
    path: "attendance/stats",
    name: "attendance-stats",
    meta: { requiresAdmin: true },
    component: () => import("@/views/attendance/attendance-stats.vue"),
  },
];
