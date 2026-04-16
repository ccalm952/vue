import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AttendanceEntity } from "./entities/attendance.entity";
import { GeofenceSettingsEntity } from "./entities/geofence-settings.entity";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { StaffEntity } from "../auth/entities/staff.entity";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceEntity, GeofenceSettingsEntity, StaffEntity]),
    AuthModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
