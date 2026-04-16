import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { FeeItemEntity } from "./entities/fee-item.entity";
import { BillingEntity } from "./entities/billing.entity";
import { BillingItemEntity } from "./entities/billing-item.entity";
import { PatientEntity } from "../patient/entities/patient.entity";
import { AppointmentEntity } from "../appointment/entities/appointment.entity";
import { StaffEntity } from "../auth/entities/staff.entity";
import { ok, fail } from "../../common/api-response";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatBillingDateTime(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(FeeItemEntity)
    private readonly feeItemRepo: Repository<FeeItemEntity>,
    @InjectRepository(BillingEntity)
    private readonly billingRepo: Repository<BillingEntity>,
    @InjectRepository(BillingItemEntity)
    private readonly billingItemRepo: Repository<BillingItemEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientRepo: Repository<PatientEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepo: Repository<AppointmentEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
  ) {}

  async getFeeItems() {
    const items = await this.feeItemRepo.find({ order: { sort: "ASC", id: "ASC" } });
    return ok(items);
  }

  /**
   * 工作台「个人业绩」：当前登录员工在本月作为收费人（operatorName 与员工姓名一致）的实付合计。
   */
  async getMyMonthIncome(authHeader?: string) {
    const staffId = this.extractStaffIdFromToken(authHeader);
    if (!staffId) return fail("未登录或 token 无效", 401);

    const staff = await this.staffRepo.findOne({ where: { id: staffId } });
    if (!staff) return fail("用户不存在", 401);

    const operatorName = (staff.name || "").trim();
    if (!operatorName) {
      return ok({ monthIncome: 0 });
    }

    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;
    const startStr = `${y}-${pad2(mo)}-01`;
    const lastDay = new Date(y, mo, 0).getDate();
    const endStr = `${y}-${pad2(mo)}-${pad2(lastDay)}`;
    const startAt = new Date(`${startStr}T00:00:00.000`);
    const endAt = new Date(`${endStr}T23:59:59.999`);

    const raw = await this.billingRepo
      .createQueryBuilder("b")
      .select("SUM(COALESCE(b.actualPaid, b.totalAmount))", "total")
      .where("b.chargeTime >= :startAt", { startAt })
      .andWhere("b.chargeTime <= :endAt", { endAt })
      .andWhere("TRIM(b.operatorName) = :operatorName", { operatorName })
      .getRawOne();

    const total = Number(raw?.total ?? 0);
    const monthIncome = Math.round(total * 100) / 100;
    return ok({ monthIncome });
  }

  private extractStaffIdFromToken(authHeader?: string): number | null {
    const token = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;
    const parts = token.split("-");
    if (parts.length < 2) return null;
    const id = Number(parts[1]);
    return Number.isNaN(id) ? null : id;
  }

  effectiveActualPaid(b: { totalAmount: number; actualPaid: number | null }) {
    const total = Number(b.totalAmount);
    if (b.actualPaid == null || Number.isNaN(Number(b.actualPaid))) return total;
    return Math.round(Number(b.actualPaid) * 100) / 100;
  }

  arrearsFor(b: { totalAmount: number; actualPaid: number | null }) {
    const total = Math.round(Number(b.totalAmount) * 100) / 100;
    const paid = this.effectiveActualPaid(b);
    return Math.round((total - paid) * 100) / 100;
  }

  async createBilling(dto: {
    patientId: number;
    payMethod: string;
    chargeTime: string;
    operatorName?: string;
    note?: string;
    actualPaid?: number;
    items: {
      feeItemId: number;
      itemName: string;
      category: string;
      price: number;
      quantity: number;
    }[];
  }) {
    if (!dto.items?.length) return fail("请至少添加一项收费");

    const totalAmount = dto.items.reduce(
      (sum, it) => sum + Number(it.price) * Number(it.quantity),
      0,
    );
    const total = Math.round(totalAmount * 100) / 100;
    let actualPaid =
      dto.actualPaid != null && !Number.isNaN(Number(dto.actualPaid))
        ? Math.round(Number(dto.actualPaid) * 100) / 100
        : total;
    if (actualPaid < 0) actualPaid = 0;

    const billing = this.billingRepo.create({
      patientId: dto.patientId,
      payMethod: dto.payMethod || "",
      chargeTime: new Date(dto.chargeTime),
      operatorName: dto.operatorName || "",
      note: dto.note || "",
      totalAmount: total,
      actualPaid,
    });
    const saved = await this.billingRepo.save(billing);

    const itemEntities = dto.items.map((it) =>
      this.billingItemRepo.create({
        billingId: saved.id,
        feeItemId: it.feeItemId,
        itemName: it.itemName,
        category: it.category,
        price: it.price,
        quantity: it.quantity,
        amount: Math.round(Number(it.price) * Number(it.quantity) * 100) / 100,
      }),
    );
    await this.billingItemRepo.save(itemEntities);

    return ok({ ...saved, items: itemEntities }, "收费创建成功");
  }

  async getBillingList(patientId: number) {
    const billings = await this.billingRepo.find({
      where: { patientId },
      order: { chargeTime: "DESC" },
    });
    const ids = billings.map((b) => b.id);
    let allItems: BillingItemEntity[] = [];
    if (ids.length) {
      allItems = await this.billingItemRepo
        .createQueryBuilder("bi")
        .where("bi.billingId IN (:...ids)", { ids })
        .getMany();
    }
    const grouped = new Map<number, BillingItemEntity[]>();
    for (const it of allItems) {
      if (!grouped.has(it.billingId)) grouped.set(it.billingId, []);
      grouped.get(it.billingId)!.push(it);
    }
    const result = billings.map((b) => ({
      ...b,
      items: grouped.get(b.id) || [],
      arrears: this.arrearsFor(b),
    }));
    return ok(result);
  }

  /**
   * 营收分析：区间内各笔收费的实付汇总；
   * - byStaff：按收费人 operatorName（与员工姓名一致）汇总；
   * - byFeeSubcategory：按收费明细 itemName，将单笔实付按明细金额占该笔合计比例分摊后汇总。
   */
  async getRevenueAnalysis(startDate: string, endDate: string) {
    const start = String(startDate || "").trim();
    const end = String(endDate || "").trim();
    if (!start || !end) return fail("请传入 startDate、endDate（YYYY-MM-DD）");

    const startAt = new Date(`${start}T00:00:00.000`);
    const endAt = new Date(`${end}T23:59:59.999`);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return fail("日期格式无效");
    }
    if (startAt > endAt) return fail("开始日期不能晚于结束日期");

    const billings = await this.billingRepo
      .createQueryBuilder("b")
      .where("b.chargeTime >= :startAt", { startAt })
      .andWhere("b.chargeTime <= :endAt", { endAt })
      .orderBy("b.chargeTime", "ASC")
      .getMany();

    let totalActual = 0;
    const byStaffMap = new Map<string, number>();
    for (const b of billings) {
      const paid = this.effectiveActualPaid(b);
      totalActual += paid;
      const key = (b.operatorName || "").trim() || "未指定";
      byStaffMap.set(key, (byStaffMap.get(key) || 0) + paid);
    }

    const ids = billings.map((b) => b.id);
    let allItems: BillingItemEntity[] = [];
    if (ids.length) {
      allItems = await this.billingItemRepo
        .createQueryBuilder("bi")
        .where("bi.billingId IN (:...ids)", { ids })
        .getMany();
    }
    const itemsByBilling = new Map<number, BillingItemEntity[]>();
    for (const it of allItems) {
      if (!itemsByBilling.has(it.billingId)) itemsByBilling.set(it.billingId, []);
      itemsByBilling.get(it.billingId)!.push(it);
    }

    const feeSubMap = new Map<string, number>();
    for (const b of billings) {
      const actual = this.effectiveActualPaid(b);
      const bItems = itemsByBilling.get(b.id) || [];
      const total = Math.round(Number(b.totalAmount) * 100) / 100;

      if (!bItems.length) {
        const k = "无明细";
        feeSubMap.set(k, (feeSubMap.get(k) || 0) + actual);
        continue;
      }

      if (total <= 0) {
        const share = actual / bItems.length;
        for (const it of bItems) {
          const k = (it.itemName || "").trim() || "未命名";
          feeSubMap.set(k, (feeSubMap.get(k) || 0) + share);
        }
        continue;
      }

      for (const it of bItems) {
        const lineAmt = Math.round(Number(it.amount) * 100) / 100;
        const ratio = lineAmt / total;
        const alloc = actual * ratio;
        const k = (it.itemName || "").trim() || "未命名";
        feeSubMap.set(k, (feeSubMap.get(k) || 0) + alloc);
      }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const byStaff = [...byStaffMap.entries()]
      .map(([name, value]) => ({ name, value: round2(value) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    const byFeeSubcategory = [...feeSubMap.entries()]
      .map(([name, value]) => ({ name, value: round2(value) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    return ok({
      totalActual: round2(totalActual),
      byStaff,
      byFeeSubcategory,
    });
  }

  /**
   * 饼图下钻：区间内、指定维度切片对应的收费单列表（含患者与就近预约信息）。
   */
  async getRevenueAnalysisDetail(
    startDate: string,
    endDate: string,
    dimension: string,
    sliceName: string,
  ) {
    const start = String(startDate || "").trim();
    const end = String(endDate || "").trim();
    const dim = String(dimension || "").trim();
    const slice = String(sliceName || "").trim();
    if (!start || !end) return fail("请传入 startDate、endDate（YYYY-MM-DD）");
    if (dim !== "staff" && dim !== "feeSub") return fail("dimension 须为 staff 或 feeSub");
    if (!slice) return fail("请传入 sliceName");

    const startAt = new Date(`${start}T00:00:00.000`);
    const endAt = new Date(`${end}T23:59:59.999`);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return fail("日期格式无效");
    }
    if (startAt > endAt) return fail("开始日期不能晚于结束日期");

    const billings = await this.billingRepo
      .createQueryBuilder("b")
      .where("b.chargeTime >= :startAt", { startAt })
      .andWhere("b.chargeTime <= :endAt", { endAt })
      .orderBy("b.chargeTime", "DESC")
      .getMany();

    const ids = billings.map((b) => b.id);
    let allItems: BillingItemEntity[] = [];
    if (ids.length) {
      allItems = await this.billingItemRepo
        .createQueryBuilder("bi")
        .where("bi.billingId IN (:...ids)", { ids })
        .getMany();
    }
    const itemsByBilling = new Map<number, BillingItemEntity[]>();
    for (const it of allItems) {
      if (!itemsByBilling.has(it.billingId)) itemsByBilling.set(it.billingId, []);
      itemsByBilling.get(it.billingId)!.push(it);
    }

    let filtered: BillingEntity[];
    if (dim === "staff") {
      filtered = billings.filter((b) => {
        const op = (b.operatorName || "").trim();
        if (slice === "未指定") return !op;
        return op === slice;
      });
    } else {
      filtered = billings.filter((b) => {
        const lines = itemsByBilling.get(b.id) || [];
        if (slice === "无明细") return lines.length === 0;
        return lines.some((it) => (it.itemName || "").trim() === slice);
      });
    }

    const pids = [...new Set(filtered.map((b) => b.patientId).filter((x) => Number.isFinite(x)))];
    const patients =
      pids.length > 0 ? await this.patientRepo.find({ where: { id: In(pids) } }) : [];
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    const appts =
      pids.length > 0
        ? await this.appointmentRepo.find({
            where: { patientId: In(pids) },
            order: { appointmentTime: "DESC" },
          })
        : [];
    const apptsByPatient = new Map<number, AppointmentEntity[]>();
    for (const a of appts) {
      if (!apptsByPatient.has(a.patientId)) apptsByPatient.set(a.patientId, []);
      apptsByPatient.get(a.patientId)!.push(a);
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const list = filtered.map((b) => {
      const p = patientMap.get(b.patientId);
      const chargeTime = b.chargeTime instanceof Date ? b.chargeTime : new Date(b.chargeTime);
      const appt = this.pickAppointmentForCharge(chargeTime, apptsByPatient.get(b.patientId) || []);
      const total = round2(Number(b.totalAmount) || 0);
      const actual = round2(this.effectiveActualPaid(b));
      const arrears = round2(total - actual);
      const hasPatient = !!p;
      return {
        chargeTime: formatBillingDateTime(chargeTime),
        patientId: b.patientId,
        patientMissing: !hasPatient,
        patientSource: hasPatient ? (p!.source || "").trim() || "—" : "—",
        patientName: hasPatient
          ? (p!.name || "").trim() || "—"
          : `患者档案缺失（ID ${b.patientId}）`,
        appointmentTime: appt
          ? String(appt.appointmentTime || "")
              .trim()
              .slice(0, 16)
          : "—",
        appointmentDoctor: (appt?.doctorName || "").trim() || "—",
        totalAmount: total,
        actualPaid: actual,
        arrears: arrears < 0 ? 0 : arrears,
      };
    });

    return ok({ list });
  }

  /** 取收费时间之前最近的一条预约；若无则取该患者时间上最早的一条 */
  private pickAppointmentForCharge(
    chargeTime: Date,
    list: AppointmentEntity[],
  ): AppointmentEntity | null {
    if (!list.length) return null;
    const ct = chargeTime.getTime();
    let best: AppointmentEntity | null = null;
    let bestT = -Infinity;
    for (const a of list) {
      const t = new Date(a.appointmentTime).getTime();
      if (!Number.isFinite(t)) continue;
      if (t <= ct && t > bestT) {
        bestT = t;
        best = a;
      }
    }
    if (best) return best;
    return list.reduce((earliest, a) => {
      const ta = new Date(a.appointmentTime).getTime();
      const te = new Date(earliest.appointmentTime).getTime();
      return ta < te ? a : earliest;
    });
  }

  async getPatientBillingStats(patientId: number) {
    const qb = this.billingRepo.createQueryBuilder("b");
    qb.select("SUM(b.totalAmount)", "totalReceivable");
    qb.addSelect("SUM(COALESCE(b.actualPaid, b.totalAmount))", "totalActualPaid");
    qb.addSelect("SUM(b.totalAmount - COALESCE(b.actualPaid, b.totalAmount))", "totalArrears");
    qb.addSelect("COUNT(b.id)", "billingCount");
    qb.where("b.patientId = :patientId", { patientId });
    const raw = await qb.getRawOne();
    return ok({
      totalReceivable: Number(raw?.totalReceivable || 0),
      totalActualPaid: Number(raw?.totalActualPaid || 0),
      totalArrears: Number(raw?.totalArrears || 0),
      billingCount: Number(raw?.billingCount || 0),
    });
  }

  /** 初始化默认收费项目（数据库表为空时调用） */
  async seedFeeItemsIfEmpty() {
    const count = await this.feeItemRepo.count();
    if (count > 0) return;

    const defaults = [
      { category: "治疗费", name: "洁牙", price: 300, unit: "次", sort: 1 },
      { category: "治疗费", name: "补牙(树脂)", price: 500, unit: "颗", sort: 2 },
      { category: "治疗费", name: "根管治疗", price: 2000, unit: "颗", sort: 3 },
      { category: "治疗费", name: "拔牙(普通)", price: 300, unit: "颗", sort: 4 },
      { category: "治疗费", name: "拔智齿", price: 800, unit: "颗", sort: 5 },
      { category: "诊疗费", name: "初诊检查", price: 100, unit: "次", sort: 1 },
      { category: "诊疗费", name: "复诊检查", price: 50, unit: "次", sort: 2 },
      { category: "检查费", name: "全景片", price: 100, unit: "次", sort: 1 },
      { category: "检查费", name: "CT(CBCT)", price: 300, unit: "次", sort: 2 },
      { category: "材料费", name: "牙冠(全瓷)", price: 3000, unit: "颗", sort: 1 },
      { category: "材料费", name: "牙冠(钴铬)", price: 1000, unit: "颗", sort: 2 },
      { category: "材料费", name: "临时牙", price: 200, unit: "颗", sort: 3 },
      { category: "正畸费", name: "金属托槽矫正", price: 15000, unit: "次", sort: 1 },
      { category: "正畸费", name: "隐形矫正", price: 35000, unit: "次", sort: 2 },
      { category: "种植费", name: "种植体(韩系)", price: 5000, unit: "颗", sort: 1 },
      { category: "种植费", name: "种植体(欧美系)", price: 10000, unit: "颗", sort: 2 },
      { category: "修复费", name: "嵌体修复", price: 2500, unit: "颗", sort: 1 },
      { category: "修复费", name: "贴面", price: 3000, unit: "颗", sort: 2 },
    ];
    await this.feeItemRepo.save(defaults.map((d) => this.feeItemRepo.create(d)));
  }
}
