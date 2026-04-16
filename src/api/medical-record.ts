import request from "@/utils/request";

type MedicalRecordPayload = Record<string, unknown>;

export function createMedicalRecordApi(data: MedicalRecordPayload) {
  return request.post("/medical-record", data);
}

export function getMedicalRecordListApi(patientId: number) {
  return request.get("/medical-record/list", { params: { patientId } });
}

export function getMedicalRecordDetailApi(id: number) {
  return request.get(`/medical-record/${id}`);
}

export function updateMedicalRecordApi(id: number, data: MedicalRecordPayload) {
  return request.put(`/medical-record/${id}`, data);
}

export function deleteMedicalRecordApi(id: number) {
  return request.delete(`/medical-record/${id}`);
}
