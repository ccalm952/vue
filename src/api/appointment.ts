import request from "@/utils/request";

type AppointmentPayload = Record<string, unknown>;

export function createAppointmentApi(data: AppointmentPayload) {
  return request.post("/appointment", data);
}

export function updateAppointmentApi(id: number, data: AppointmentPayload) {
  return request.patch(`/appointment/${id}`, data);
}

export function getAppointmentListApi(patientId: number) {
  return request.get("/appointment/list", { params: { patientId } });
}

export function getWeekAppointmentsApi(start: string, end: string) {
  return request.get("/appointment/week", { params: { start, end } });
}

export function getDoctorListApi() {
  return request.get("/auth/doctors");
}
