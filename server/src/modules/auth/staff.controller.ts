import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { StaffService } from "./staff.service";

@Controller("staff")
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get("list")
  list(
    @Query("keyword") keyword?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.staffService.list(keyword, Number(page) || 1, Number(pageSize) || 10);
  }

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.staffService.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.staffService.update(Number(id), body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.staffService.remove(Number(id));
  }
}
