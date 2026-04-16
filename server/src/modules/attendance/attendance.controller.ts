import { Controller, Get, Post, Put, Delete, Body, Query, Headers, Param } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";

@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post("punch")
  punch(
    @Body()
    body: { userId: number; type: string; latitude: number; longitude: number; address: string },
  ) {
    return this.attendanceService.punch(body);
  }

  @Get("today")
  getToday(@Query("userId") userId: string) {
    return this.attendanceService.getTodayRecords(Number(userId));
  }

  @Get("records")
  getRecords(
    @Query("userId") userId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.attendanceService.getRecords({
      userId: Number(userId),
      startDate,
      endDate,
    });
  }

  @Delete("admin/record/:id")
  deleteRecord(@Headers("authorization") auth: string | undefined, @Param("id") id: string) {
    return this.attendanceService.deleteRecordById(auth, Number(id));
  }

  @Get("admin/monthly-summary")
  getAdminMonthlySummary(
    @Headers("authorization") auth: string | undefined,
    @Query("month") month: string,
    @Query("overtimeMorningEnd") overtimeMorningEnd?: string,
    @Query("overtimeAfternoonEnd") overtimeAfternoonEnd?: string,
  ) {
    return this.attendanceService.getAdminMonthlySummary(auth, month, {
      overtimeMorningEnd,
      overtimeAfternoonEnd,
    });
  }

  @Get("geofence")
  getGeofence() {
    return this.attendanceService.getGeofenceConfig();
  }

  @Put("geofence/settings")
  saveGeofenceSettings(
    @Body()
    body: { centerLat: number; centerLng: number; radiusM: number; label?: string },
  ) {
    return this.attendanceService.saveGeofenceSettings(body);
  }

  @Delete("geofence/settings")
  clearGeofenceSettings() {
    return this.attendanceService.clearGeofenceSettings();
  }
}
