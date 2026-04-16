import request from "@/utils/request";

type StaffPayload = Record<string, unknown>;

export function getStaffListApi(params: { keyword?: string; page?: number; pageSize?: number }) {
  return request.get("/staff/list", { params });
}

export function createStaffApi(data: StaffPayload) {
  return request.post("/staff", data);
}

export function updateStaffApi(id: number, data: StaffPayload) {
  return request.patch(`/staff/${id}`, data);
}

export function deleteStaffApi(id: number) {
  return request.delete(`/staff/${id}`);
}
