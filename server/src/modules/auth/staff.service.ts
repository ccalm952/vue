import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash } from "crypto";
import { StaffEntity } from "./entities/staff.entity";
import { ok, fail } from "../../common/api-response";

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffEntity)
    private readonly repo: Repository<StaffEntity>,
  ) {}

  private hashPassword(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  toSafeRow(s: StaffEntity) {
    return {
      id: s.id,
      loginAccount: s.loginAccount,
      name: s.name,
      phone: s.phone,
      role: s.role,
      enabled: s.enabled,
      createdAt: s.createdAt,
    };
  }

  async list(keyword: string | undefined, page: number, pageSize: number) {
    const p = Math.max(1, page || 1);
    const ps = Math.min(100, Math.max(1, pageSize || 10));
    const qb = this.repo.createQueryBuilder("s").orderBy("s.createdAt", "DESC");
    const kw = keyword?.trim();
    if (kw) {
      const k = `%${kw}%`;
      qb.andWhere(
        "(s.name LIKE :k OR s.phone LIKE :k OR s.role LIKE :k OR s.loginAccount LIKE :k)",
        { k },
      );
    }
    const [rows, total] = await qb
      .skip((p - 1) * ps)
      .take(ps)
      .getManyAndCount();
    return ok({
      list: rows.map((s) => this.toSafeRow(s)),
      total,
    });
  }

  async create(body: Record<string, any>) {
    const loginAccount = String(body.loginAccount || "").trim();
    const loginPassword = String(body.loginPassword || "");
    const name = String(body.name || "").trim();
    if (!loginAccount || !loginPassword) return fail("登录账号与密码不能为空");
    if (!name) return fail("员工姓名不能为空");
    const exists = await this.repo.findOne({ where: { loginAccount } });
    if (exists) return fail("登录账号已存在");
    const entity = this.repo.create({
      loginAccount,
      loginPassword: this.hashPassword(loginPassword),
      name,
      phone: String(body.phone || "").trim(),
      role: String(body.role || "医生").trim() || "医生",
      enabled: body.enabled !== false,
    });
    const saved = await this.repo.save(entity);
    return ok(this.toSafeRow(saved), "已创建员工");
  }

  async update(id: number, body: Record<string, any>) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return fail("员工不存在");
    const nextAccount =
      body.loginAccount != null ? String(body.loginAccount).trim() : entity.loginAccount;
    if (nextAccount !== entity.loginAccount) {
      const dup = await this.repo.findOne({ where: { loginAccount: nextAccount } });
      if (dup) return fail("登录账号已被占用");
      entity.loginAccount = nextAccount;
    }
    if (body.name != null) entity.name = String(body.name).trim();
    if (body.phone != null) entity.phone = String(body.phone).trim();
    if (body.role != null) entity.role = String(body.role).trim();
    if (body.enabled != null) entity.enabled = Boolean(body.enabled);
    const pwd = body.loginPassword != null ? String(body.loginPassword) : "";
    if (pwd.length > 0) entity.loginPassword = this.hashPassword(pwd);
    const saved = await this.repo.save(entity);
    return ok(this.toSafeRow(saved), "已更新");
  }

  async remove(id: number) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return fail("员工不存在");
    await this.repo.remove(entity);
    return ok(null, "已删除");
  }
}
