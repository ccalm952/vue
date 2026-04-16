export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

export function ok<T>(data: T, message = "ok"): ApiResponse<T> {
  return { code: 0, data, message };
}

export function fail(message = "操作失败", code = -1): ApiResponse<null> {
  return { code, data: null, message };
}

export function pageOk<T>(list: T[], total: number) {
  return ok({ list, total });
}
