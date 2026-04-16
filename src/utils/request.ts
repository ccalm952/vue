/**
 * 约定：经本实例发出的 HTTP 错误（业务 code≠0、网络/超时）由下方响应拦截器统一 ElMessage，
 * 业务侧 try/catch 中不要再弹错误 Toast，仅处理状态或打 log，避免重复提示。
 */
import axios from "axios";
import router from "@/router";

const request = axios.create({
  baseURL: "/api",
  timeout: 20000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code !== 0) {
      ElMessage.error(res.message || "请求失败");
      if (res.code === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      }
      return Promise.reject(new Error(res.message));
    }
    return res;
  },
  (error) => {
    const msgFromServer = error.response?.data?.message;
    let msg = msgFromServer;
    if (!msg) {
      if (error.code === "ECONNABORTED" || String(error.message || "").includes("timeout")) {
        msg = "请求超时，请检查网络或稍后再试（移动网络可能较慢）";
      } else if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        msg = "无法连接服务器，请检查网络、关闭代理后重试";
      } else {
        msg = "网络错误";
      }
    }
    ElMessage.error(msg);
    return Promise.reject(error);
  },
);

export default request;
