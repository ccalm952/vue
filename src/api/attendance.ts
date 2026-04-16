import request from "@/utils/request";

export function punchApi(data: {
  userId: number;
  type: string;
  latitude: number;
  longitude: number;
  address: string;
}) {
  return request.post("/attendance/punch", data);
}

export function getTodayRecordsApi(userId: number) {
  return request.get("/attendance/today", { params: { userId } });
}

export function getAttendanceRecordsApi(params: {
  userId: number;
  startDate?: string;
  endDate?: string;
}) {
  return request.get("/attendance/records", { params });
}

export function getAttendanceAdminMonthlySummaryApi(params: {
  month: string;
  overtimeMorningEnd?: string;
  overtimeAfternoonEnd?: string;
}) {
  return request.get("/attendance/admin/monthly-summary", { params });
}

export function deleteAttendanceRecordAdminApi(id: number) {
  return request.delete(`/attendance/admin/record/${id}`);
}

export function getGeofenceConfigApi() {
  return request.get("/attendance/geofence");
}

export function saveGeofenceSettingsApi(data: {
  centerLat: number;
  centerLng: number;
  radiusM: number;
  label?: string;
}) {
  return request.put("/attendance/geofence/settings", data);
}

export function clearGeofenceSettingsApi() {
  return request.delete("/attendance/geofence/settings");
}
