import request from "@/utils/request";

export function getPlantingRecordsApi(params: {
  name?: string;
  phone?: string;
  chart?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  return request.get("/implant/records", { params });
}

export function createPlantingVisitApi(data: {
  phone: string;
  patientName: string;
  chartNo?: string | null;
  birthday?: string | null;
  age?: number | null;
  visitDate: string;
  remark?: string | null;
  staff?: string | null;
  followUp?: string | null;
  teeth: Array<{
    toothNo?: string;
    implantBrand?: string;
    implantModel?: string;
    toothRemark?: string;
  }>;
}) {
  return request.post("/implant/visits", data);
}

export function updatePlantingVisitApi(visitId: number, data: Record<string, unknown>) {
  return request.put(`/implant/visits/${visitId}`, data);
}

export function deletePlantingVisitRowApi(visitId: number, toothId?: number | null) {
  const params: Record<string, number> = {};
  if (toothId != null && toothId !== undefined) params.toothId = toothId;
  return request.delete(`/implant/visits/${visitId}`, { params });
}

export function getPlantingInventoryApi() {
  return request.get("/implant/inventory");
}

export function addPlantingInventoryApi(data: {
  brand: string;
  modelCode: string;
  supplement: number;
  sortOrder?: number;
}) {
  return request.post("/implant/inventory", data);
}

export function updatePlantingInventoryApi(
  id: number,
  data: { brand: string; modelCode: string; supplement: number },
) {
  return request.put(`/implant/inventory/${id}`, data);
}

export function deletePlantingInventoryApi(id: number) {
  return request.delete(`/implant/inventory/${id}`);
}

export function deleteAllPlantingInventoryApi() {
  return request.delete("/implant/inventory");
}

export function queryPlantingLeftStockApi(brand: string, model: string) {
  return request.get("/implant/inventory/left", { params: { brand, model } });
}

export function getPlantingStatsStaffApi() {
  return request.get("/implant/stats/staff");
}

export function getPlantingStatsMonthsApi() {
  return request.get("/implant/stats/months");
}

export function getPlantingStatsMonthTotalApi(month: string) {
  return request.get("/implant/stats/month-total", { params: { month } });
}

/** 种植患者：仅返回有种植就诊记录的患者。 */
export function getPlantingPatientListApi(name?: string) {
  return request.get("/implant/patient", { params: name ? { name } : {} });
}

export function mergePlantingPatientNamesApi(keyword?: string) {
  return request.post("/implant/patient/merge-names", { keyword });
}
