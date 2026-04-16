import { Controller, Get, Post, Body, Query, Headers } from "@nestjs/common";
import { BillingService } from "./billing.service";

@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("fee-items")
  getFeeItems() {
    return this.billingService.getFeeItems();
  }

  /** 工作台：当前用户本月现金实收（按收费人姓名与员工姓名匹配） */
  @Get("my-month-income")
  getMyMonthIncome(@Headers("authorization") authorization?: string) {
    return this.billingService.getMyMonthIncome(authorization);
  }

  /** 营收分析：按收费员工、收费小类汇总实收 */
  @Get("revenue-analysis")
  getRevenueAnalysis(@Query("startDate") startDate: string, @Query("endDate") endDate: string) {
    return this.billingService.getRevenueAnalysis(startDate, endDate);
  }

  @Get("revenue-analysis/detail")
  getRevenueAnalysisDetail(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("dimension") dimension: string,
    @Query("sliceName") sliceName: string,
  ) {
    return this.billingService.getRevenueAnalysisDetail(startDate, endDate, dimension, sliceName);
  }

  @Post()
  createBilling(
    @Body()
    body: {
      patientId: number;
      payMethod: string;
      chargeTime: string;
      operatorName?: string;
      note?: string;
      actualPaid?: number;
      items: {
        feeItemId: number;
        itemName: string;
        category: string;
        price: number;
        quantity: number;
      }[];
    },
  ) {
    return this.billingService.createBilling(body);
  }

  @Get("list")
  getList(@Query("patientId") patientId: string) {
    return this.billingService.getBillingList(Number(patientId));
  }

  @Get("stats")
  getStats(@Query("patientId") patientId: string) {
    return this.billingService.getPatientBillingStats(Number(patientId));
  }
}
