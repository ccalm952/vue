import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { AppointmentEntity } from "../appointment/entities/appointment.entity";
import { BillingEntity } from "../billing/entities/billing.entity";
import { BillingItemEntity } from "../billing/entities/billing-item.entity";
import { ImplantVisitEntity } from "../implant/entities/implant-visit.entity";
import { ImplantVisitToothEntity } from "../implant/entities/implant-visit-tooth.entity";
import { MedicalRecordEntity } from "../medical-record/entities/medical-record.entity";
import { PatientEntity } from "./entities/patient.entity";
import { StaffEntity } from "../auth/entities/staff.entity";
import { ok, fail, pageOk } from "../../common/api-response";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly repo: Repository<PatientEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepo: Repository<AppointmentEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /** 初诊医生：该患者时间上最早、且 visitType 含「初诊」的预约的 doctorName */
  private async inferFirstVisitDoctor(patientId: number): Promise<string> {
    if (!Number.isFinite(patientId) || patientId <= 0) return "";
    const ap = await this.appointmentRepo
      .createQueryBuilder("a")
      .where("a.patientId = :pid", { pid: patientId })
      .andWhere("TRIM(a.visitType) LIKE :vt", { vt: "%初诊%" })
      .orderBy("a.appointmentTime", "ASC")
      .getOne();
    return (ap?.doctorName || "").trim();
  }

  private async loadFirstVisitMap(patientIds: number[]): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    const uniq = [...new Set(patientIds.filter((x) => Number.isFinite(x) && x > 0))];
    if (!uniq.length) return map;
    const appts = await this.appointmentRepo.find({
      where: { patientId: In(uniq) },
      order: { appointmentTime: "ASC" },
    });
    for (const a of appts) {
      if (!String(a.visitType || "").includes("初诊")) continue;
      if (map.has(a.patientId)) continue;
      const dn = (a.doctorName || "").trim();
      if (dn) map.set(a.patientId, dn);
    }
    return map;
  }

  /** 将预约时间规范为 YYYY-MM-DD（列表「上次就诊时间」展示用） */
  private appointmentTimeToYmd(t: string): string {
    const s = String(t ?? "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    return ymd(d);
  }

  /** 各患者最后一次预约的日期（无预约则不在 map 中） */
  private async loadLastAppointmentDateMap(patientIds: number[]): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    const uniq = [...new Set(patientIds.filter((x) => Number.isFinite(x) && x > 0))];
    if (!uniq.length) return map;
    const rows = await this.appointmentRepo
      .createQueryBuilder("a")
      .select("a.patientId", "patientId")
      .addSelect("MAX(a.appointmentTime)", "lastAt")
      .where("a.patientId IN (:...ids)", { ids: uniq })
      .groupBy("a.patientId")
      .getRawMany<{ patientId: number | string; lastAt: string | null }>();
    for (const r of rows) {
      const pid = Number(r.patientId);
      const raw = r.lastAt != null ? String(r.lastAt).trim() : "";
      const y = this.appointmentTimeToYmd(raw);
      if (y) map.set(pid, y);
    }
    return map;
  }

  async getList(
    query: {
      keyword?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
      /**
       * 与侧栏「自动分组」一致：保存患者查询条件，患者列表数量随条件变化而变化。
       * all | mine | notVisitedYear
       */
      scope?: string;
    },
    authHeader?: string,
  ) {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.max(query.pageSize ?? 10, 1);
    const skip = (page - 1) * pageSize;

    const qb = this.repo.createQueryBuilder("p");

    if (query.keyword) {
      qb.andWhere("(p.name LIKE :kw OR p.phone LIKE :kw)", { kw: `%${query.keyword}%` });
    }

    if (query.startDate) {
      qb.andWhere("p.createdAt >= :start", { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere("p.createdAt <= :end", { end: `${query.endDate} 23:59:59` });
    }

    const scope = String(query.scope || "").trim();
    if (scope === "mine") {
      const name = await this.staffNameFromAuth(authHeader);
      if (name) {
        qb.andWhere(
          "EXISTS (SELECT 1 FROM appointment a WHERE a.patientId = p.id AND TRIM(a.doctorName) = :mineDoc)",
          { mineDoc: name },
        );
      }
    } else if (scope === "notVisitedYear") {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      const cut = ymd(cutoff);
      qb.andWhere(
        `(
          (SELECT MAX(a2.appointmentTime) FROM appointment a2 WHERE a2.patientId = p.id) IS NULL
          OR DATE((SELECT MAX(a2.appointmentTime) FROM appointment a2 WHERE a2.patientId = p.id)) < :cut
        )`,
        { cut },
      );
    }

    qb.orderBy("p.createdAt", "DESC");

    const [list, total] = await qb.skip(skip).take(pageSize).getManyAndCount();
    const ids = list.map((p) => p.id);
    const [fvMap, lastApptMap] = await Promise.all([
      this.loadFirstVisitMap(ids),
      this.loadLastAppointmentDateMap(ids),
    ]);
    const rows = list.map((p) => ({
      ...p,
      firstVisit: fvMap.get(p.id) ?? "",
      /** 与患者表字段脱钩：始终取该患者预约中最后一次预约的日期 */
      lastVisitTime: lastApptMap.get(p.id) ?? "",
    }));
    return pageOk(rows, total);
  }

  /**
   * 患者侧栏「分组」人数统计。
   * 自动分组：保存患者查询条件，患者列表数量随条件变化而变化（`auto` 为各自动条件对应的人数）。
   */
  async getSidebarCounts(authHeader?: string) {
    const total = await this.repo.count();

    const staffName = await this.staffNameFromAuth(authHeader);
    let myPatients = 0;
    if (staffName) {
      const raw = await this.repo.manager
        .createQueryBuilder()
        .select("COUNT(DISTINCT a.patientId)", "cnt")
        .from(AppointmentEntity, "a")
        .where("TRIM(a.doctorName) = :sn", { sn: staffName })
        .getRawOne<{ cnt: string | number | null }>();
      myPatients = Number(raw?.cnt ?? 0);
    }

    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cut = ymd(cutoff);

    const notVisitedOverYear = await this.repo
      .createQueryBuilder("p")
      .where(
        `(
          (SELECT MAX(a2.appointmentTime) FROM appointment a2 WHERE a2.patientId = p.id) IS NULL
          OR DATE((SELECT MAX(a2.appointmentTime) FROM appointment a2 WHERE a2.patientId = p.id)) < :cut
        )`,
        { cut },
      )
      .getCount();

    return ok({
      total,
      myPatients,
      auto: {
        notVisitedOverYear,
      },
    });
  }

  private extractStaffIdFromToken(authHeader?: string): number | null {
    const token = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;
    const parts = token.split("-");
    if (parts.length < 2) return null;
    const id = Number(parts[1]);
    return Number.isNaN(id) ? null : id;
  }

  private async staffNameFromAuth(authHeader?: string): Promise<string | null> {
    const staffId = this.extractStaffIdFromToken(authHeader);
    if (!staffId) return null;
    const staff = await this.staffRepo.findOne({ where: { id: staffId } });
    const n = staff?.name?.trim();
    return n || null;
  }

  async getById(id: number) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return fail("患者不存在");
    const firstVisit = await this.inferFirstVisitDoctor(id);
    const lastMap = await this.loadLastAppointmentDateMap([id]);
    const lastVisitTime = lastMap.get(id) ?? "";
    return ok({ ...entity, firstVisit, lastVisitTime });
  }

  /**
   * 当日病历号：YYMMDD + 两位当日流水（从 01 起），如 2026-04-08 首个为 26040801。
   */
  async nextMedicalRecordNo(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const prefix = `${yy}${mm}${dd}`;
    const row = await this.repo
      .createQueryBuilder("p")
      .select("MAX(p.source)", "mx")
      .where("CHAR_LENGTH(TRIM(p.source)) = :eight", { eight: 8 })
      .andWhere("TRIM(p.source) LIKE :pre", { pre: `${prefix}%` })
      .andWhere("TRIM(p.source) REGEXP '^[0-9]{8}$'")
      .getRawOne<{ mx: string | null }>();
    let next = 1;
    const mx = row?.mx != null ? String(row.mx).trim() : "";
    if (mx.length === 8 && /^\d{8}$/.test(mx)) {
      const suf = parseInt(mx.slice(6), 10);
      if (!Number.isNaN(suf)) next = suf + 1;
    }
    if (next > 99) {
      throw new Error("当日自动生成病历号已超过 99，请改用手动编号");
    }
    return `${prefix}${String(next).padStart(2, "0")}`;
  }

  async create(dto: Partial<PatientEntity>) {
    const payload = { ...dto } as Record<string, unknown>;
    delete payload.firstVisit;
    if (!String((payload.source as string) ?? "").trim()) {
      payload.source = await this.nextMedicalRecordNo();
    }
    const entity = this.repo.create(payload as Partial<PatientEntity>);
    const saved = await this.repo.save(entity);
    const firstVisit = await this.inferFirstVisitDoctor(saved.id);
    return ok({ ...saved, firstVisit }, "新增成功");
  }

  async update(id: number, dto: Partial<PatientEntity>) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return fail("患者不存在");

    const payload = { ...dto } as Record<string, unknown>;
    delete payload.firstVisit;
    Object.assign(entity, payload);
    const saved = await this.repo.save(entity);
    const firstVisit = await this.inferFirstVisitDoctor(saved.id);
    return ok({ ...saved, firstVisit }, "更新成功");
  }

  /**
   * 将库内所有患者的 tags 裁剪为仅保留 allowedTags 中出现的项（用于设置页保存白名单后清理历史标签）。
   */
  async pruneTagsToAllowed(allowedTags: string[]) {
    const allowed = new Set(allowedTags.map((t) => String(t).trim()).filter((t) => t.length > 0));
    const rows = await this.repo.find();
    let updated = 0;
    for (const p of rows) {
      const raw = p.tags;
      const arr = Array.isArray(raw)
        ? raw.map((x) => String(x).trim()).filter((t) => t.length > 0)
        : [];
      const next = arr.filter((t) => allowed.has(t));
      const changed = next.length !== arr.length || next.some((t, i) => t !== arr[i]);
      if (!changed) continue;
      p.tags = next.length ? next : null;
      await this.repo.save(p);
      updated++;
    }
    return ok({ updated }, `已清理 ${updated} 位患者的无效标签`);
  }

  /** 删除患者前清理所有引用 patient 的业务数据（预约、病历、收费、种植就诊） */
  private async removeRelatedDataForPatients(manager: EntityManager, ids: number[]) {
    const uniq = [...new Set(ids.filter((x) => Number.isFinite(x) && x > 0))];
    if (!uniq.length) return;

    const billingRepo = manager.getRepository(BillingEntity);
    const bills = await billingRepo.find({
      where: { patientId: In(uniq) },
      select: ["id"],
    });
    const billIds = bills.map((b) => b.id);
    if (billIds.length) {
      await manager.delete(BillingItemEntity, { billingId: In(billIds) });
    }
    await billingRepo.delete({ patientId: In(uniq) });

    await manager.delete(AppointmentEntity, { patientId: In(uniq) });
    await manager.delete(MedicalRecordEntity, { patientId: In(uniq) });

    const visitRepo = manager.getRepository(ImplantVisitEntity);
    const visits = await visitRepo.find({
      where: { patientId: In(uniq) },
      select: ["id"],
    });
    const visitIds = visits.map((v) => v.id);
    if (visitIds.length) {
      await manager.delete(ImplantVisitToothEntity, { visitId: In(visitIds) });
    }
    await visitRepo.delete({ patientId: In(uniq) });
  }

  async remove(id: number) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return fail("患者不存在");

    await this.dataSource.transaction(async (manager) => {
      await this.removeRelatedDataForPatients(manager, [id]);
      await manager.delete(PatientEntity, { id });
    });
    return ok(null, "删除成功");
  }

  async batchRemove(ids: number[]) {
    if (!ids?.length) return fail("请选择要删除的患者");

    await this.dataSource.transaction(async (manager) => {
      await this.removeRelatedDataForPatients(manager, ids);
      await manager.delete(PatientEntity, { id: In(ids) });
    });
    return ok(null, `已删除 ${ids.length} 条记录`);
  }
}
