import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PatientEntity } from "./entities/patient.entity";
import { StaffEntity } from "../auth/entities/staff.entity";
import { AppointmentEntity } from "../appointment/entities/appointment.entity";
import { PatientController } from "./patient.controller";
import { PatientService } from "./patient.service";

@Module({
  imports: [TypeOrmModule.forFeature([PatientEntity, StaffEntity, AppointmentEntity])],
  controllers: [PatientController],
  providers: [PatientService],
  exports: [PatientService],
})
export class PatientModule {}
