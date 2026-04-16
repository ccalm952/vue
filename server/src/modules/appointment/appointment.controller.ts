import { Controller, Get, Post, Patch, Body, Query, Param } from "@nestjs/common";
import { AppointmentService } from "./appointment.service";

@Controller("appointment")
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.service.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.service.update(Number(id), body);
  }

  @Get("list")
  getByPatient(@Query("patientId") patientId: string) {
    return this.service.getByPatient(Number(patientId));
  }

  @Get("week")
  getByWeek(@Query("start") start: string, @Query("end") end: string) {
    return this.service.getByDateRange(start, end);
  }
}
