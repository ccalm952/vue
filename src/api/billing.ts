import request from "@/utils/request";

export function getFeeItemsApi() {
  return request.get("/billing/fee-items");
}

/** 工作台个人业绩：本月实收（当前登录员工作为收费人） */
export function getMyMonthIncomeApi() {
  return request.get<{ monthIncome: number }>("/billing/my-month-income");
}

export function createBillingApi(data: {
  patientId: number;
  payMethod: string;
  chargeTime: string;
  operatorName?: string;
  /** 接诊/开单医生（员工姓名） */
  doctorName?: string;
  note?: string;
  /** 实付金额；不传则按收费合计全额实付 */
  actualPaid?: number;
  items: {
    feeItemId: number;
    itemName: string;
    category: string;
    price: number;
    quantity: number;
  }[];
}) {
  return request.post("/billing", data);
}

export function getBillingListApi(patientId: number) {
  return request.get("/billing/list", { params: { patientId } });
}

export function getBillingStatsApi(patientId: number) {
  return request.get("/billing/stats", { params: { patientId } });
}

export interface RevenuePieSlice {
  name: string;
  value: number;
}

export interface RevenueAnalysisData {
  totalActual: number;
  byStaff: RevenuePieSlice[];
  byFeeSubcategory: RevenuePieSlice[];
}

export function getRevenueAnalysisApi(params: { startDate: string; endDate: string }) {
  return request.get<RevenueAnalysisData>("/billing/revenue-analysis", { params });
}

export interface RevenueDetailRow {
  chargeTime: string;
  patientId?: number;
  /** 无对应 patient 行（如直删库、历史脏数据）；正常走系统删患者会级联删收费 */
  patientMissing?: boolean;
  patientSource: string;
  patientName: string;
  appointmentTime: string;
  appointmentDoctor: string;
  totalAmount: number;
  actualPaid: number;
  arrears: number;
}

export function getRevenueAnalysisDetailApi(params: {
  startDate: string;
  endDate: string;
  dimension: "staff" | "feeSub";
  sliceName: string;
}) {
  return request.get<{ list: RevenueDetailRow[] }>("/billing/revenue-analysis/detail", {
    params,
  });
}
