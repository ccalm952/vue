import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ImplantService } from "./implant.service";

@Controller("implant")
export class ImplantController {
  constructor(private readonly implantService: ImplantService) {}

  @Get("records")
  searchRecords(
    @Query("name") name?: string,
    @Query("phone") phone?: string,
    @Query("chart") chart?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("limit") limit?: string,
  ) {
    return this.implantService.searchFlatRows({
      name,
      phone,
      chart,
      dateFrom,
      dateTo,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post("visits")
  createVisit(
    @Body()
    body: {
      phone: string;
      patientName: string;
      chartNo?: string | null;
      birthday?: string | null;
      age?: number | null;
      visitDate: string;
      remark?: string | null;
      staff?: string | null;
      followUp?: string | null;
      teeth: Array<Record<string, unknown>>;
    },
  ) {
    return this.implantService.createVisit(body as any);
  }

  @Put("visits/:visitId")
  updateVisit(
    @Param("visitId") visitId: string,
    @Body()
    body: Record<string, unknown>,
  ) {
    return this.implantService.updateVisitRow({
      ...body,
      visitId: Number(visitId),
    } as any);
  }

  @Delete("visits/:visitId")
  deleteVisitRow(@Param("visitId") visitId: string, @Query("toothId") toothId?: string) {
    return this.implantService.deleteVisitRow(
      Number(visitId),
      toothId != null && toothId !== "" ? Number(toothId) : undefined,
    );
  }

  @Get("inventory")
  listInventory() {
    return this.implantService.listInventory();
  }

  @Post("inventory")
  addInventory(
    @Body()
    body: { brand: string; modelCode: string; supplement: number; sortOrder?: number },
  ) {
    return this.implantService.addInventorySupplement(body);
  }

  @Put("inventory/:id")
  updateInventory(
    @Param("id") id: string,
    @Body() body: { brand: string; modelCode: string; supplement: number },
  ) {
    return this.implantService.updateInventory(Number(id), body);
  }

  @Delete("inventory/:id")
  deleteInventory(@Param("id") id: string) {
    return this.implantService.deleteInventory(Number(id));
  }

  @Delete("inventory")
  deleteAllInventory() {
    return this.implantService.deleteAllInventory();
  }

  @Get("inventory/left")
  queryLeft(@Query("brand") brand: string, @Query("model") model: string) {
    return this.implantService.queryLeftStock(brand || "", model || "");
  }

  @Get("stats/staff")
  statsStaff() {
    return this.implantService.statsStaff();
  }

  @Get("stats/months")
  statsMonths() {
    return this.implantService.statsMonths();
  }

  @Get("stats/month-total")
  statsMonthTotal(@Query("month") month: string) {
    return this.implantService.statsMonthTotal(month);
  }

  @Get("patient")
  listImplantPatients(@Query("name") name?: string) {
    return this.implantService.listImplantPatients(name);
  }

  @Post("patient/merge-names")
  mergeNames(@Body() body: { keyword?: string }) {
    return this.implantService.mergePatientsByName(body?.keyword);
  }
}
