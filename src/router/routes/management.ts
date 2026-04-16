import type { RouteRecordRaw } from "vue-router";

/** 管理、系统设置等后台类页面。 */
export const managementRoutes: RouteRecordRaw[] = [
  {
    path: "management/staff",
    name: "staff-management",
    component: () => import("@/views/management/staff-management.vue"),
  },
  {
    path: "settings/patient-tags",
    name: "settings-patient-tags",
    component: () => import("@/views/management/settings-patient-tags.vue"),
  },
];
