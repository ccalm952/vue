import type { RouteRecordRaw } from "vue-router";
import { attendanceRoutes } from "./attendance";
import { managementRoutes } from "./management";
import { patientRoutes } from "./patient";
import { plantingRoutes } from "./planting";
import { workspaceRoutes } from "./workspace";

export const appLayoutRoute: RouteRecordRaw = {
  path: "/",
  component: () => import("@/layouts/AppLayout.vue"),
  children: [
    ...workspaceRoutes,
    ...patientRoutes,
    ...plantingRoutes,
    ...attendanceRoutes,
    ...managementRoutes,
  ],
};
