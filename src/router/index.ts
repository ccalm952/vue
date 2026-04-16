import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth-store";
import { appLayoutRoute } from "./routes/app-layout";
import { publicRoutes } from "./routes/public";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...publicRoutes, appLayoutRoute],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const token = localStorage.getItem("token");
  if (!token && to.name !== "login") {
    return { name: "login" };
  }
  if (token && to.name === "login") {
    return { name: "dashboard" };
  }

  if (to.meta.requiresAdmin && token) {
    if (!authStore.userInfo) {
      try {
        await authStore.fetchUserInfo();
      } catch {
        return { name: "login" };
      }
    }
    if (authStore.userInfo?.role !== "管理员") {
      ElMessage.warning("仅管理员可访问该页面");
      return { path: "/attendance" };
    }
  }
});

export default router;
