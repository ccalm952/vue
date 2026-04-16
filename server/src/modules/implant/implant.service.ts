import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PatientService } from "../patient/patient.service";
import { PatientEntity } from "../patient/entities/patient.entity";
import { ImplantVisitEntity } from "./entities/implant-visit.entity";
import { ImplantVisitToothEntity } from "./entities/implant-visit-tooth.entity";
import { ImplantInventoryEntity } from "./entities/implant-inventory.entity";
import { ok, fail } from "../../common/api-response";

export function normalizePhone(raw: string): string {
  if (!raw) return "";
  const s = String(raw)
    .trim()
    .replace(/[\uFF10-\uFF19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30));
  return s.replace(/\D/g, "");
}

function emptyToNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

@Injectable()
export class ImplantService {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patientRepo: Repository<PatientEntity>,
    @InjectRepository(ImplantVisitEntity)
    private readonly visitRepo: Repository<ImplantVisitEntity>,
    @InjectRepository(ImplantVisitToothEntity)
    private readonly toothRepo: Repository<ImplantVisitToothEntity>,
    @InjectRepository(ImplantInventoryEntity)
    private readonly inventoryRepo: Repository<ImplantInventoryEntity>,
    private readonly patientService: PatientService,
  ) {}

  private async findPatientByPhoneNormalized(phoneN: string) {
    const rows = await this.patientRepo
      .createQueryBuilder("p")
      .where("LENGTH(TRIM(p.phone)) > 0")
      .getMany();
    return rows.find((r) => normalizePhone(r.phone) === phoneN) ?? null;
  }

  async upsertPatient(
    phone: string,
    name: string,
    chartNo?: string | null,
    extras?: { birthday?: string; age?: number },
  ) {
    const phoneN = normalizePhone(phone);
    if (!phoneN) return fail("手机不能为空");
    const nm = String(name || "").trim();
    if (!nm) return fail("姓名不能为空");
    let p = await this.findPatientByPhoneNormalized(phoneN);
    const chart = emptyToNull(chartNo);
    if (p) {
      p.name = nm;
      if (chart != null) p.source = chart;
      p.phone = phoneN;
      if (extras?.birthday != null && String(extras.birthday).trim() !== "") {
        p.birthday = String(extras.birthday).trim();
      }
      if (extras?.age != null && !Number.isNaN(Number(extras.age))) {
        p.age = Number(extras.age);
      }
      await this.patientRepo.save(p);
      return ok(p);
    }
    const source =
      chart != null && String(chart).trim() !== ""
        ? String(chart).trim()
        : await this.patientService.nextMedicalRecordNo();
    const ageNum = Number(extras?.age);
    p = this.patientRepo.create({
      name: nm,
      phone: phoneN,
      source,
      gender: "男",
      birthday: extras?.birthday != null ? String(extras.birthday).trim() : "",
      age: !Number.isNaN(ageNum) ? ageNum : 0,
    });
    await this.patientRepo.save(p);
    return ok(p);
  }

  async searchFlatRows(query: {
    name?: string;
    phone?: string;
    chart?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(query.limit ?? 5000, 1), 10000);
    const qb = this.visitRepo
      .createQueryBuilder("v")
      .innerJoin("patient", "p", "p.id = v.patient_id")
      .leftJoin("implant_visit_tooth", "t", "t.visit_id = v.id")
      .select([
        "p.id AS patientId",
        "p.name AS patientName",
        "p.phone AS phone",
        "p.source AS chartNo",
        "v.id AS visitId",
        "v.visit_date AS visitDate",
        "v.remark AS remark",
        "v.staff AS staff",
        "v.follow_up AS followUp",
        "t.id AS toothId",
        "t.tooth_no AS toothNo",
        "t.implant_brand AS implantBrand",
        "t.implant_model AS implantModel",
        "t.implant_qty AS implantQty",
        "t.tooth_remark AS toothRemark",
      ])
      .orderBy("v.visit_date", "ASC")
      .addOrderBy("p.phone", "ASC")
      .addOrderBy("v.id", "ASC")
      .addOrderBy("COALESCE(t.sort_order, 0)", "ASC")
      .addOrderBy("t.id", "ASC")
      .take(limit);

    if (query.name?.trim()) {
      qb.andWhere("p.name LIKE :name", { name: `%${query.name.trim()}%` });
    }
    if (query.phone?.trim()) {
      qb.andWhere("p.phone LIKE :phone", {
        phone: `%${normalizePhone(query.phone)}%`,
      });
    }
    if (query.chart?.trim()) {
      qb.andWhere("IFNULL(p.source,'') LIKE :chart", {
        chart: `%${query.chart.trim()}%`,
      });
    }
    if (query.dateFrom?.trim()) {
      qb.andWhere("v.visit_date >= :df", { df: query.dateFrom.trim() });
    }
    if (query.dateTo?.trim()) {
      qb.andWhere("v.visit_date <= :dt", { dt: query.dateTo.trim() });
    }

    const raw = await qb.getRawMany();
    const inv = await this.inventoryRepo.find();
    const modelToBrand = new Map<string, string>();
    const brandByModel = new Map<string, Set<string>>();
    for (const r of inv) {
      const model = (r.modelCode || "").trim();
      const brand = (r.brand || "").trim();
      if (!model) continue;
      if (!brandByModel.has(model)) brandByModel.set(model, new Set());
      if (brand) brandByModel.get(model)!.add(brand);
    }
    for (const [model, set] of brandByModel) {
      if (set.size === 1) modelToBrand.set(model, [...set][0]!);
      else modelToBrand.set(model, "");
    }

    const rows = raw.map((row: Record<string, unknown>) => {
      const g = (a: string, b?: string) =>
        (row[a] ?? row[b ?? a.toLowerCase()]) as string | number | null | undefined;
      let implantBrand = String(g("implantBrand", "implant_brand") ?? "");
      const implModel = g("implantModel", "implant_model");
      if (!implantBrand.trim() && implModel) {
        const m = String(implModel).trim();
        implantBrand = modelToBrand.get(m) ?? "";
      }
      return {
        patientId: Number(g("patientId", "patient_id")),
        patientName: String(g("patientName", "patient_name") ?? ""),
        phone: String(g("phone") ?? ""),
        chartNo: g("chartNo", "chart_no") as string | null | undefined,
        visitId: Number(g("visitId", "visit_id")),
        visitDate: String(g("visitDate", "visit_date") ?? ""),
        remark: g("remark") as string | null | undefined,
        staff: g("staff") as string | null | undefined,
        followUp: g("followUp", "follow_up") as string | null | undefined,
        toothId: g("toothId", "tooth_id") == null ? null : Number(g("toothId", "tooth_id")),
        toothNo: g("toothNo", "tooth_no") as string | null | undefined,
        implantBrand,
        implantModel: implModel as string | null | undefined,
        implantQty: Number(g("implantQty", "implant_qty") ?? 0),
        toothRemark: g("toothRemark", "tooth_remark") as string | null | undefined,
      };
    });

    return ok(rows);
  }

  async createVisit(body: {
    phone: string;
    patientName: string;
    chartNo?: string | null;
    birthday?: string | null;
    age?: number | null;
    visitDate: string;
    remark?: string | null;
    staff?: string | null;
    followUp?: string | null;
    teeth: Array<{
      toothNo?: string;
      implantBrand?: string;
      implantModel?: string;
      toothRemark?: string;
    }>;
  }) {
    const teeth = (body.teeth || []).filter(
      (t) => String(t.toothNo || "").trim() || String(t.implantModel || "").trim(),
    );
    if (!teeth.length) return fail("请至少填写一条牙位或植体");

    const up = await this.upsertPatient(body.phone, body.patientName, body.chartNo, {
      birthday: body.birthday ?? undefined,
      age: body.age != null && !Number.isNaN(Number(body.age)) ? Number(body.age) : undefined,
    });
    if (up.code !== 0 || !up.data) return up;
    const patient = up.data as PatientEntity;

    const visit = this.visitRepo.create({
      patientId: patient.id,
      visitDate: body.visitDate.trim(),
      remark: emptyToNull(body.remark),
      staff: (body.staff || "").trim(),
      followUp: emptyToNull(body.followUp),
    });
    await this.visitRepo.save(visit);

    let order = 0;
    for (const t of teeth) {
      const model = emptyToNull(t.implantModel);
      const qty = model ? 1 : 0;
      const tooth = this.toothRepo.create({
        visitId: visit.id,
        toothNo: emptyToNull(t.toothNo) ?? "",
        implantBrand: emptyToNull(t.implantBrand) ?? "",
        implantModel: model ?? "",
        implantQty: qty,
        sortOrder: order++,
        toothRemark: emptyToNull(t.toothRemark),
      });
      await this.toothRepo.save(tooth);
    }

    return ok({ visitId: visit.id }, "保存成功");
  }

  async updateVisitRow(body: {
    visitId: number;
    toothId?: number | null;
    patientId?: number | null;
    patientName: string;
    phone: string;
    visitDate: string;
    remark?: string | null;
    staff?: string | null;
    toothNo?: string | null;
    implantBrand?: string | null;
    implantModel?: string | null;
    toothRemark?: string | null;
  }) {
    const visitId = Number(body.visitId);
    const visit = await this.visitRepo.findOne({ where: { id: visitId } });
    if (!visit) return fail("就诊记录不存在");

    const pid = body.patientId != null ? Number(body.patientId) : visit.patientId;
    if (pid <= 0) return fail("无效患者");

    const phoneN = normalizePhone(body.phone);
    if (!phoneN) return fail("手机不能为空");
    const name = String(body.patientName || "").trim();
    if (!name) return fail("姓名不能为空");

    const patient = await this.patientRepo.findOne({ where: { id: pid } });
    if (!patient) return fail("患者不存在");

    const others = await this.patientRepo
      .createQueryBuilder("p")
      .where("p.id != :pid", { pid })
      .andWhere("p.phone = :ph", { ph: phoneN })
      .getOne();
    if (others) return fail("手机已被其他患者使用");

    patient.name = name;
    patient.phone = phoneN;
    await this.patientRepo.save(patient);

    visit.visitDate = String(body.visitDate || "").trim();
    visit.remark = emptyToNull(body.remark);
    visit.staff = (body.staff || "").trim();
    await this.visitRepo.save(visit);

    const toothNo = emptyToNull(body.toothNo);
    const brand = emptyToNull(body.implantBrand);
    const model = emptyToNull(body.implantModel);
    const tr = emptyToNull(body.toothRemark);
    const implantQty = model ? 1 : 0;

    if (body.toothId == null) {
      if (toothNo || model) {
        const max = await this.toothRepo
          .createQueryBuilder("t")
          .select("COALESCE(MAX(t.sort_order), -1)", "m")
          .where("t.visit_id = :vid", { vid: visitId })
          .getRawOne();
        const sortOrder = Number(max?.m ?? 0) + 1;
        const tooth = this.toothRepo.create({
          visitId,
          toothNo: toothNo ?? "",
          implantBrand: brand ?? "",
          implantModel: model ?? "",
          implantQty,
          sortOrder,
          toothRemark: tr,
        });
        await this.toothRepo.save(tooth);
      }
      return ok(null, "已更新");
    }

    const tooth = await this.toothRepo.findOne({
      where: { id: Number(body.toothId) },
    });
    if (!tooth || tooth.visitId !== visitId) return fail("牙位记录不存在");

    if (toothNo || model) {
      tooth.toothNo = toothNo ?? "";
      tooth.implantBrand = brand ?? "";
      tooth.implantModel = model ?? "";
      tooth.implantQty = implantQty;
      tooth.toothRemark = tr;
      await this.toothRepo.save(tooth);
    } else {
      await this.toothRepo.delete({ id: tooth.id });
    }

    return ok(null, "已更新");
  }

  async deleteVisitRow(visitId: number, toothId?: number | null) {
    const v = await this.visitRepo.findOne({ where: { id: visitId } });
    if (!v) return fail("记录不存在");
    const patientId = v.patientId;

    if (toothId != null) {
      await this.toothRepo.delete({ id: toothId });
    }
    const left = await this.toothRepo.count({ where: { visitId } });
    if (left === 0) {
      await this.visitRepo.delete({ id: visitId });
    }

    const visitCount = await this.visitRepo.count({
      where: { patientId },
    });
    if (visitCount === 0) {
      await this.patientRepo.delete({ id: patientId });
    }

    return ok(null, "已删除");
  }

  async listInventory() {
    const usage = await this.usageMapByBrandModel();
    const rows = await this.inventoryRepo.find({
      order: { sortOrder: "ASC", id: "ASC" },
    });
    const list = rows.map((r) => {
      const brand = (r.brand || "").trim();
      const model = (r.modelCode || "").trim();
      const supplement = r.supplement || 0;
      const used = usage.get(`${brand}\0${model}`) ?? 0;
      return {
        id: r.id,
        brand,
        model,
        supplement,
        used,
        left: supplement - used,
      };
    });
    list.sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
    return ok(list);
  }

  private async usageMapByBrandModel(): Promise<Map<string, number>> {
    const merged = new Map<string, number>();
    const raw = await this.toothRepo
      .createQueryBuilder("t")
      .select("t.implant_brand", "b")
      .addSelect("t.implant_model", "m")
      .addSelect("SUM(t.implant_qty)", "q")
      .where('t.implant_model IS NOT NULL AND TRIM(t.implant_model) != ""')
      .andWhere("t.implant_qty > 0")
      .groupBy("t.implant_brand")
      .addGroupBy("t.implant_model")
      .getRawMany();

    const inv = await this.inventoryRepo.find();
    const modelToBrands = new Map<string, Set<string>>();
    for (const r of inv) {
      const m = (r.modelCode || "").trim();
      const b = (r.brand || "").trim();
      if (!m) continue;
      if (!modelToBrands.has(m)) modelToBrands.set(m, new Set());
      if (b) modelToBrands.get(m)!.add(b);
    }

    for (const row of raw) {
      let b = String(row.b || "").trim();
      const m = String(row.m || "").trim();
      const q = Number(row.q || 0);
      if (!m) continue;
      if (!b) {
        const set = modelToBrands.get(m);
        if (set && set.size === 1) b = [...set][0]!;
      }
      const key = `${b}\0${m}`;
      merged.set(key, (merged.get(key) ?? 0) + q);
    }
    return merged;
  }

  async addInventorySupplement(body: {
    brand: string;
    modelCode: string;
    supplement: number;
    sortOrder?: number;
  }) {
    const brand = String(body.brand || "").trim();
    const code = String(body.modelCode || "").trim();
    const qty = Number(body.supplement);
    if (!brand) return fail("品牌不能为空");
    if (!code) return fail("型号不能为空");
    if (!Number.isFinite(qty) || qty <= 0) return fail("补货数量必须大于 0");

    let row = await this.inventoryRepo.findOne({
      where: { brand, modelCode: code },
    });
    if (row) {
      row.supplement += qty;
      await this.inventoryRepo.save(row);
    } else {
      row = this.inventoryRepo.create({
        brand,
        modelCode: code,
        supplement: qty,
        sortOrder: body.sortOrder ?? 0,
      });
      await this.inventoryRepo.save(row);
    }
    return ok(row, "已添加");
  }

  async updateInventory(
    id: number,
    body: { brand: string; modelCode: string; supplement: number },
  ) {
    const row = await this.inventoryRepo.findOne({ where: { id } });
    if (!row) return fail("库存记录不存在");
    const brand = String(body.brand || "").trim();
    const code = String(body.modelCode || "").trim();
    const qty = Number(body.supplement);
    if (!brand) return fail("品牌不能为空");
    if (!code) return fail("型号不能为空");
    if (!Number.isFinite(qty) || qty < 0) return fail("补货数量不能小于 0");
    row.brand = brand;
    row.modelCode = code;
    row.supplement = qty;
    await this.inventoryRepo.save(row);
    return ok(row, "已更新");
  }

  async deleteInventory(id: number) {
    await this.inventoryRepo.delete({ id });
    return ok(null, "已删除");
  }

  async deleteAllInventory() {
    await this.inventoryRepo.clear();
    return ok(null, "已清空");
  }

  async queryLeftStock(brand: string, model: string) {
    const b = brand.trim();
    const m = model.trim();
    if (!b || !m) return fail("请输入品牌和型号");
    const usage = await this.usageMapByBrandModel();
    const row = await this.inventoryRepo.findOne({
      where: { brand: b, modelCode: m },
    });
    if (!row) return fail("未找到该品牌/型号库存记录");
    const used = usage.get(`${b}\0${m}`) ?? 0;
    const supplement = row.supplement;
    return ok({
      supplement,
      used,
      left: supplement - used,
    });
  }

  async statsStaff() {
    const rows = await this.visitRepo
      .createQueryBuilder("v")
      .select("v.staff", "staff")
      .where("TRIM(IFNULL(v.staff,'')) != ''")
      .getRawMany();
    const counter = new Map<string, number>();
    for (const r of rows) {
      const raw = String(r.staff || "").trim();
      if (!raw) continue;
      for (const name of raw.split(/[+＋]/)) {
        const n = name.trim();
        if (!n) continue;
        counter.set(n, (counter.get(n) ?? 0) + 1);
      }
    }
    const list = [...counter.entries()].sort((a, b) =>
      b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0]),
    );
    return ok(list.map(([name, count]) => ({ name, count })));
  }

  async statsMonths() {
    const raw = await this.visitRepo
      .createQueryBuilder("v")
      .select("DISTINCT SUBSTRING(v.visit_date, 1, 7)", "month")
      .where("LENGTH(TRIM(v.visit_date)) >= 7")
      .orderBy("month", "DESC")
      .getRawMany();
    return ok(raw.map((r) => r.month).filter(Boolean));
  }

  async statsMonthTotal(month: string) {
    const m = String(month || "").trim();
    if (!m) return fail("请指定月份");
    const total = await this.toothRepo
      .createQueryBuilder("t")
      .innerJoin("implant_visit", "v", "v.id = t.visit_id")
      .where("SUBSTRING(v.visit_date, 1, 7) = :month", { month: m })
      .andWhere("(TRIM(IFNULL(t.tooth_no,'')) != '' OR TRIM(IFNULL(t.implant_model,'')) != '')")
      .getCount();
    return ok(total);
  }

  /** 种植患者：只返回 implant_visit 里出现过的 patientId 对应的患者 */
  async listImplantPatients(nameKeyword?: string) {
    const qb = this.patientRepo
      .createQueryBuilder("p")
      .where("p.id IN (SELECT DISTINCT v.patient_id FROM implant_visit v)")
      .orderBy("p.name", "ASC")
      .addOrderBy("p.phone", "ASC");

    if (nameKeyword?.trim()) {
      qb.andWhere("p.name LIKE :kw", { kw: `%${nameKeyword.trim()}%` });
    }

    const rows = await qb.getMany();
    return ok(
      rows.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        source: p.source,
        gender: p.gender,
        birthday: p.birthday,
        age: p.age,
        createdAt: p.createdAt,
      })),
    );
  }

  async mergePatientsByName(keyword?: string) {
    const kw = keyword?.trim();
    const dupNames: { n: string }[] = await this.patientRepo.query(
      kw
        ? "SELECT TRIM(`name`) AS n FROM patient WHERE TRIM(COALESCE(`name`,'')) != '' AND TRIM(`name`) LIKE ? GROUP BY TRIM(`name`) HAVING COUNT(*) > 1"
        : "SELECT TRIM(`name`) AS n FROM patient WHERE TRIM(COALESCE(`name`,'')) != '' GROUP BY TRIM(`name`) HAVING COUNT(*) > 1",
      kw ? [`%${kw}%`] : [],
    );

    let mergedGroups = 0;
    let removed = 0;

    for (const row of dupNames) {
      const name = String(row.n || "").trim();
      if (!name) continue;
      const same = await this.patientRepo
        .createQueryBuilder("p")
        .where("TRIM(p.name) = :name", { name })
        .orderBy("p.id", "ASC")
        .getMany();
      if (same.length <= 1) continue;
      const keepId = same[0]!.id;
      for (const p of same.slice(1)) {
        await this.visitRepo.update({ patientId: p.id }, { patientId: keepId });
        await this.patientRepo.delete({ id: p.id });
        removed++;
      }
      mergedGroups++;
    }

    return ok({ mergedGroups, removedPatients: removed });
  }
}
