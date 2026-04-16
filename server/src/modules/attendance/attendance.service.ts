import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AttendanceEntity } from "./entities/attendance.entity";
import { GeofenceSettingsEntity } from "./entities/geofence-settings.entity";
import { StaffEntity } from "../auth/entities/staff.entity";
import { AuthService } from "../auth/auth.service";
import { ok, fail } from "../../common/api-response";
import { haversineDistanceMeters } from "./geofence.util";

function localDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const VALID_TYPES = ["morning_in", "morning_out", "afternoon_in", "afternoon_out"];
const ALL_PUNCH_TYPES = ["morning_in", "morning_out", "afternoon_in", "afternoon_out"] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseHHMM(s: string): number | null {
  const t = s.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function minutesFromMidnightSafe(s: string, fallback: string): number {
  return parseHHMM(s) ?? parseHHMM(fallback) ?? 12 * 60;
}

/** 区间内每个周一至周五的 date 字符串 YYYY-MM-DD */
function weekdaysInMonth(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const cur = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) {
      const y = cur.getFullYear();
      const mo = pad2(cur.getMonth() + 1);
      const d = pad2(cur.getDate());
      out.push(`${y}-${mo}-${d}`);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function timeHHMMFromRecord(r: AttendanceEntity): string {
  const d = new Date(r.punchTime);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function calcOvertimeMinutesForDayRecords(
  dayRecords: AttendanceEntity[],
  morningEndMin: number,
  afternoonEndMin: number,
): number {
  let total = 0;
  const byType: Partial<Record<string, AttendanceEntity[]>> = {};
  for (const r of dayRecords) {
    if (!byType[r.type]) byType[r.type] = [];
    byType[r.type]!.push(r);
  }
  const morningOut = byType.morning_out;
  if (morningOut?.length) {
    morningOut.sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());
    const last = morningOut[morningOut.length - 1]!;
    const parts = timeHHMMFromRecord(last).split(":").map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const mins = h * 60 + m;
    if (mins > morningEndMin) total += mins - morningEndMin;
  }
  const afternoonOut = byType.afternoon_out;
  if (afternoonOut?.length) {
    afternoonOut.sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());
    const last = afternoonOut[afternoonOut.length - 1]!;
    const parts = timeHHMMFromRecord(last).split(":").map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const mins = h * 60 + m;
    if (mins > afternoonEndMin) total += mins - afternoonEndMin;
  }
  return total;
}

function formatOvertimeStr(minutes: number): string {
  if (minutes <= 0) return "无";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}小时${m}分钟`;
  if (h > 0) return `${h}小时`;
  return `${m}分钟`;
}

function isWorkdayComplete(dayRecords: AttendanceEntity[]): boolean {
  const types = new Set(dayRecords.map((r) => r.type));
  return ALL_PUNCH_TYPES.every((t) => types.has(t));
}

export type GeofenceSource = "database" | "env" | "none";

export interface GeofenceConfig {
  enabled: boolean;
  centerLat: number;
  centerLng: number;
  radiusM: number;
  label: string;
  source: GeofenceSource;
}

const SETTINGS_ROW_ID = 1;

@Injectable()
export class AttendanceService {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
    @InjectRepository(AttendanceEntity)
    private readonly repo: Repository<AttendanceEntity>,
    @InjectRepository(GeofenceSettingsEntity)
    private readonly geofenceRepo: Repository<GeofenceSettingsEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
  ) {}

  /** 仅从环境变量读取（无库记录时使用） */
  private getGeofenceFromEnv(): GeofenceConfig {
    const rawLat = this.config.get<string>("ATTENDANCE_GEOFENCE_LAT", "");
    const rawLng = this.config.get<string>("ATTENDANCE_GEOFENCE_LNG", "");
    const rawRadius = this.config.get<string>("ATTENDANCE_GEOFENCE_RADIUS_M", "");
    const label = this.config.get<string>("ATTENDANCE_GEOFENCE_LABEL", "") || "";

    const lat = parseFloat(String(rawLat).trim());
    const lng = parseFloat(String(rawLng).trim());
    let radiusM = parseFloat(String(rawRadius).trim());

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return {
        enabled: false,
        centerLat: 0,
        centerLng: 0,
        radiusM: 0,
        label: "",
        source: "none",
      };
    }

    if (!Number.isFinite(radiusM) || radiusM <= 0) {
      radiusM = 200;
    }

    return {
      enabled: true,
      centerLat: lat,
      centerLng: lng,
      radiusM,
      label,
      source: "env",
    };
  }

  /** 数据库优先，否则环境变量 */
  async resolveGeofence(): Promise<GeofenceConfig> {
    const row = await this.geofenceRepo.findOne({
      where: { id: SETTINGS_ROW_ID },
    });
    if (row) {
      const lat = row.centerLat;
      const lng = row.centerLng;
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        let r = row.radiusM;
        if (!Number.isFinite(r) || r <= 0) {
          r = 200;
        }
        return {
          enabled: true,
          centerLat: lat,
          centerLng: lng,
          radiusM: Math.round(r),
          label: row.label || "",
          source: "database",
        };
      }
    }
    return this.getGeofenceFromEnv();
  }

  async getGeofenceConfig() {
    const cfg = await this.resolveGeofence();
    return ok(cfg);
  }

  async saveGeofenceSettings(dto: {
    centerLat: number;
    centerLng: number;
    radiusM: number;
    label?: string;
  }) {
    const lat = Number(dto.centerLat);
    const lng = Number(dto.centerLng);
    let radiusM = Number(dto.radiusM);
    const label = dto.label != null ? String(dto.label) : "";

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return fail("纬度无效（-90 ~ 90）");
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return fail("经度无效（-180 ~ 180）");
    }
    if (!Number.isFinite(radiusM) || radiusM <= 0 || radiusM > 50000) {
      return fail("半径无效（建议 1 ~ 50000 米）");
    }

    radiusM = Math.round(radiusM);

    let row = await this.geofenceRepo.findOne({
      where: { id: SETTINGS_ROW_ID },
    });
    if (!row) {
      row = this.geofenceRepo.create({
        id: SETTINGS_ROW_ID,
        centerLat: lat,
        centerLng: lng,
        radiusM,
        label,
      });
    } else {
      row.centerLat = lat;
      row.centerLng = lng;
      row.radiusM = radiusM;
      row.label = label;
    }
    await this.geofenceRepo.save(row);
    return ok(await this.resolveGeofence(), "打卡范围已保存");
  }

  async clearGeofenceSettings() {
    await this.geofenceRepo.delete({ id: SETTINGS_ROW_ID });
    return ok(await this.resolveGeofence(), "已清除页面配置，当前使用环境变量或未启用围栏");
  }

  private async assertWithinGeofence(latitude: number, longitude: number) {
    const fence = await this.resolveGeofence();
    if (!fence.enabled) return { ok: true as const, fence };

    const d = haversineDistanceMeters(latitude, longitude, fence.centerLat, fence.centerLng);
    if (d > fence.radiusM) {
      return {
        ok: false as const,
        fence,
        distanceM: d,
        message: `不在打卡范围内（当前约 ${Math.round(d)} 米，允许半径 ${fence.radiusM} 米）`,
      };
    }
    return { ok: true as const, fence, distanceM: d };
  }

  async punch(dto: {
    userId: number;
    type: string;
    latitude: number;
    longitude: number;
    address: string;
  }) {
    if (!VALID_TYPES.includes(dto.type)) {
      return fail("无效的打卡类型");
    }

    const geo = await this.assertWithinGeofence(dto.latitude, dto.longitude);
    if (!geo.ok) {
      return fail(geo.message);
    }

    const today = localDateStr();

    const existing = await this.repo.findOne({
      where: { userId: dto.userId, date: today, type: dto.type },
    });

    if (existing) {
      existing.punchTime = new Date();
      existing.latitude = dto.latitude;
      existing.longitude = dto.longitude;
      existing.address = dto.address;
      const saved = await this.repo.save(existing);
      return ok(saved, "更新打卡成功");
    }

    const entity = this.repo.create({
      userId: dto.userId,
      date: today,
      type: dto.type,
      punchTime: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      address: dto.address,
    });
    const saved = await this.repo.save(entity);
    return ok(saved, "打卡成功");
  }

  async getTodayRecords(userId: number) {
    const today = localDateStr();
    const records = await this.repo.find({
      where: { userId, date: today },
      order: { punchTime: "ASC" },
    });
    return ok(records);
  }

  async deleteRecordById(authHeader: string | undefined, id: number) {
    const gate = await this.authService.requireAdmin(authHeader);
    if (!gate.ok) {
      return fail(gate.message);
    }
    if (!Number.isFinite(id) || id <= 0) {
      return fail("无效的打卡记录 id");
    }
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      return fail("记录不存在");
    }
    await this.repo.delete({ id });
    return ok(null, "已删除");
  }

  async getRecords(query: { userId: number; startDate?: string; endDate?: string }) {
    const qb = this.repo.createQueryBuilder("a");
    qb.where("a.userId = :userId", { userId: query.userId });

    if (query.startDate) {
      qb.andWhere("a.date >= :start", { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere("a.date <= :end", { end: query.endDate });
    }

    qb.orderBy("a.date", "DESC").addOrderBy("a.punchTime", "ASC");
    const records = await qb.getMany();
    return ok(records);
  }

  async getAdminMonthlySummary(
    authHeader: string | undefined,
    monthRaw: string,
    opts?: { overtimeMorningEnd?: string; overtimeAfternoonEnd?: string },
  ) {
    const gate = await this.authService.requireAdmin(authHeader);
    if (!gate.ok) {
      return fail(gate.message);
    }

    const month = (monthRaw || "").trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return fail("月份格式须为 YYYY-MM");
    }

    const [yStr, moStr] = month.split("-");
    const y = Number(yStr);
    const mo = Number(moStr);
    if (mo < 1 || mo > 12) {
      return fail("月份无效");
    }

    const startDate = `${y}-${pad2(mo)}-01`;
    const lastDay = new Date(y, mo, 0).getDate();
    const endDate = `${y}-${pad2(mo)}-${pad2(lastDay)}`;

    const morningEndMin = minutesFromMidnightSafe(opts?.overtimeMorningEnd ?? "12:00", "12:00");
    const afternoonEndMin = minutesFromMidnightSafe(opts?.overtimeAfternoonEnd ?? "18:00", "18:00");

    const workdays = weekdaysInMonth(startDate, endDate);

    const staffList = await this.staffRepo.find({
      where: { enabled: true },
      order: { id: "ASC" },
    });

    const monthRecords = await this.repo
      .createQueryBuilder("a")
      .where("a.date >= :start AND a.date <= :end", {
        start: startDate,
        end: endDate,
      })
      .orderBy("a.date", "ASC")
      .addOrderBy("a.punchTime", "ASC")
      .getMany();

    const byUser = new Map<number, AttendanceEntity[]>();
    for (const r of monthRecords) {
      if (!byUser.has(r.userId)) byUser.set(r.userId, []);
      byUser.get(r.userId)!.push(r);
    }

    const employees: Array<{
      userId: number;
      name: string;
      role: string;
      workdayCount: number;
      fullPunchWorkdays: number;
      incompleteWorkdays: number;
      missingWorkdayDates: string[];
      distinctPunchDays: number;
      totalOvertimeMinutes: number;
      overtimeStr: string;
      monthHasAnyRecord: boolean;
    }> = [];

    const noRecordInMonth: Array<{ userId: number; name: string; role: string }> = [];

    for (const s of staffList) {
      const userRecs = byUser.get(s.id) || [];
      const byDate = new Map<string, AttendanceEntity[]>();
      for (const r of userRecs) {
        if (!byDate.has(r.date)) byDate.set(r.date, []);
        byDate.get(r.date)!.push(r);
      }

      let totalOvertimeMinutes = 0;
      for (const [, recs] of byDate) {
        totalOvertimeMinutes += calcOvertimeMinutesForDayRecords(
          recs,
          morningEndMin,
          afternoonEndMin,
        );
      }

      let fullPunchWorkdays = 0;
      const missingWorkdayDates: string[] = [];

      for (const d of workdays) {
        const dayRecs = byDate.get(d) || [];
        if (dayRecs.length === 0) {
          missingWorkdayDates.push(d);
          continue;
        }
        if (!isWorkdayComplete(dayRecs)) {
          missingWorkdayDates.push(d);
          continue;
        }
        fullPunchWorkdays++;
      }

      const incompleteWorkdays = missingWorkdayDates.length;
      const monthHasAnyRecord = userRecs.length > 0;

      if (!monthHasAnyRecord) {
        noRecordInMonth.push({
          userId: s.id,
          name: s.name,
          role: s.role,
        });
      }

      employees.push({
        userId: s.id,
        name: s.name,
        role: s.role,
        workdayCount: workdays.length,
        fullPunchWorkdays,
        incompleteWorkdays,
        missingWorkdayDates,
        distinctPunchDays: byDate.size,
        totalOvertimeMinutes,
        overtimeStr: formatOvertimeStr(totalOvertimeMinutes),
        monthHasAnyRecord,
      });
    }

    return ok({
      month,
      startDate,
      endDate,
      workdayCount: workdays.length,
      overtimeMorningEnd: opts?.overtimeMorningEnd?.trim() || "12:00",
      overtimeAfternoonEnd: opts?.overtimeAfternoonEnd?.trim() || "18:00",
      employees,
      noRecordInMonth,
    });
  }
}
