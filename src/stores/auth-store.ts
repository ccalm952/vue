import { defineStore } from "pinia";
import { ref } from "vue";
import { loginApi, getUserInfoApi, logoutApi } from "@/api/auth";
import router from "@/router";

interface UserInfo {
  userId: number;
  username: string;
  realName: string;
  role: string;
  phone?: string;
}

interface LoginResponseData extends UserInfo {
  accessToken: string;
}

interface ApiResponse<T> {
  data: T;
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref(localStorage.getItem("token") || "");
  const userInfo = ref<UserInfo | null>(null);

  async function login(username: string, password: string) {
    const res = (await loginApi(username, password)) as ApiResponse<LoginResponseData>;
    token.value = res.data.accessToken;
    localStorage.setItem("token", token.value);
    userInfo.value = res.data;
    return res;
  }

  async function fetchUserInfo() {
    const res = (await getUserInfoApi()) as ApiResponse<UserInfo>;
    userInfo.value = res.data;
    return res.data;
  }

  async function logout() {
    try {
      await logoutApi();
    } finally {
      token.value = "";
      userInfo.value = null;
      localStorage.removeItem("token");
      router.push("/login");
    }
  }

  function isLoggedIn() {
    return !!token.value;
  }

  return { token, userInfo, login, fetchUserInfo, logout, isLoggedIn };
});
