import { Controller, Get, Post, Put, Delete, Body, Param, Query } from "@nestjs/common";
import { MedicalRecordService } from "./medical-record.service";

@Controller("medical-record")
export class MedicalRecordController {
  constructor(private readonly service: MedicalRecordService) {}

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.service.create(body);
  }

  @Get("list")
  getByPatient(@Query("patientId") patientId: string) {
    return this.service.getByPatient(Number(patientId));
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.service.getById(Number(id));
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.service.update(Number(id), body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(Number(id));
  }
}
