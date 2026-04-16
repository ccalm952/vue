import request from "@/utils/request";

export function loginApi(username: string, password: string) {
  // 移动网络首包/TLS 较慢，单独放宽超时，避免误报「网络错误」
  return request.post("/auth/login", { username, password }, { timeout: 30000 });
}

export function getUserInfoApi() {
  return request.get("/auth/info");
}

export function logoutApi() {
  return request.post("/auth/logout");
}
