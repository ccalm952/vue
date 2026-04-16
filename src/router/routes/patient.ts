import type { RouteRecordRaw } from "vue-router";

export const patientRoutes: RouteRecordRaw[] = [
  {
    path: "patients",
    redirect: "/patient",
  },
  {
    path: "patients/:id",
    redirect: (to) => ({ path: `/patient/${to.params.id as string}` }),
  },
  {
    path: "patient",
    name: "patient",
    component: () => import("@/views/patient/patient.vue"),
  },
  {
    path: "patient/:id",
    name: "patient-detail",
    component: () => import("@/views/patient/patient-detail.vue"),
  },
];
