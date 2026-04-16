import request from "@/utils/request";

type PatientPayload = Record<string, unknown>;

export function getPatientListApi(params: {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  /** all | mine | notVisitedYear */
  scope?: string;
}) {
  return request.get("/patient/list", { params });
}

/** 侧栏分组人数；`auto` 与「自动分组」说明一致：保存患者查询条件，人数随条件与数据变化 */
export interface PatientSidebarCounts {
  total: number;
  myPatients: number;
  auto: {
    notVisitedOverYear: number;
  };
}

export function getPatientSidebarCountsApi() {
  return request.get<PatientSidebarCounts>("/patient/sidebar-counts");
}

export function getPatientDetailApi(id: number) {
  return request.get(`/patient/${id}`);
}

export function createPatientApi(data: PatientPayload) {
  return request.post("/patient", data);
}

export function updatePatientApi(id: number, data: PatientPayload) {
  return request.put(`/patient/${id}`, data);
}

/** 将服务端所有患者的 tags 裁剪为仅保留 allowedTags（与「设置 → 患者标签」保存一致） */
export function prunePatientTagsApi(allowedTags: string[]) {
  return request.post<{ updated: number }>("/patient/prune-tags", { allowedTags });
}

export function removePatientApi(id: number) {
  return request.delete(`/patient/${id}`);
}

export function batchRemovePatientApi(ids: number[]) {
  return request.delete("/patient/batch", { data: { ids } });
}
