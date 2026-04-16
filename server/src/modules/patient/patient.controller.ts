import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers } from "@nestjs/common";
import { PatientService } from "./patient.service";
import { PruneTagsDto } from "./dto/prune-tags.dto";

@Controller("patient")
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get("sidebar-counts")
  getSidebarCounts(@Headers("authorization") authorization?: string) {
    return this.patientService.getSidebarCounts(authorization);
  }

  @Get("list")
  getList(
    @Query("keyword") keyword?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("scope") scope?: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.patientService.getList(
      {
        keyword,
        startDate,
        endDate,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 10,
        scope,
      },
      authorization,
    );
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.patientService.getById(Number(id));
  }

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.patientService.create(body);
  }

  /** 按当前标签白名单裁剪所有患者已存标签（与设置页保存联动） */
  @Post("prune-tags")
  pruneTags(@Body() body: PruneTagsDto) {
    return this.patientService.pruneTagsToAllowed(body.allowedTags ?? []);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.patientService.update(Number(id), body);
  }

  @Delete("batch")
  batchRemove(@Body() body: { ids: number[] }) {
    return this.patientService.batchRemove(body.ids);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.patientService.remove(Number(id));
  }
}
