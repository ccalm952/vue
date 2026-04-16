import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash } from "crypto";
import { StaffEntity } from "./entities/staff.entity";
import { ok, fail } from "../../common/api-response";

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
  ) {}

  /** 启动时自动创建默认管理员 */
  async onModuleInit() {
    const count = await this.staffRepo.count();
    if (count === 0) {
      const admin = this.staffRepo.create({
        loginAccount: "admin",
        loginPassword: this.hashPassword("123456"),
        name: "管理员",
        role: "管理员",
      });
      await this.staffRepo.save(admin);
      console.log("已创建默认管理员账号 admin / 123456");
    }
  }

  async login(username?: string, password?: string) {
    if (!username || !password) {
      return fail("账号和密码不能为空");
    }

    const staff = await this.staffRepo.findOne({
      where: { loginAccount: username },
    });

    if (!staff) {
      return fail("账号不存在");
    }

    if (!staff.enabled) {
      return fail("账号已被禁用");
    }

    if (staff.loginPassword !== this.hashPassword(password)) {
      return fail("密码错误");
    }

    const accessToken = `token-${staff.id}-${Date.now()}`;
    return ok({
      accessToken,
      userId: staff.id,
      username: staff.loginAccount,
      realName: staff.name,
      role: staff.role,
    });
  }

  async getUserInfo(authHeader?: string) {
    const staffId = this.extractStaffId(authHeader);
    if (!staffId) {
      return fail("未登录或 token 无效", 401);
    }

    const staff = await this.staffRepo.findOne({ where: { id: staffId } });
    if (!staff) {
      return fail("用户不存在", 401);
    }

    return ok({
      userId: staff.id,
      username: staff.loginAccount,
      realName: staff.name,
      role: staff.role,
      phone: staff.phone,
    });
  }

  async logout() {
    return ok(null, "已退出登录");
  }

  async getDoctorList() {
    const list = await this.staffRepo.find({
      where: { enabled: true },
      select: ["id", "name", "role"],
      order: { id: "ASC" },
    });
    return ok(list);
  }

  private hashPassword(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  private extractStaffId(authHeader?: string): number | null {
    const token = (authHeader ?? "").replace("Bearer ", "").trim();
    if (!token) return null;
    const parts = token.split("-");
    if (parts.length < 2) return null;
    const id = Number(parts[1]);
    return Number.isNaN(id) ? null : id;
  }

  /** 考勤统计等管理接口：校验当前 token 对应员工为管理员 */
  async requireAdmin(authHeader?: string) {
    const staffId = this.extractStaffId(authHeader);
    if (!staffId) {
      return { ok: false as const, message: "未登录或 token 无效" };
    }
    const staff = await this.staffRepo.findOne({ where: { id: staffId } });
    if (!staff) {
      return { ok: false as const, message: "用户不存在" };
    }
    if (staff.role !== "管理员") {
      return { ok: false as const, message: "需要管理员权限" };
    }
    return { ok: true as const, staff };
  }
}
