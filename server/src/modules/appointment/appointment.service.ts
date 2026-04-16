import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppointmentEntity } from "./entities/appointment.entity";
import { ok, fail } from "../../common/api-response";

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(AppointmentEntity)
    private readonly repo: Repository<AppointmentEntity>,
  ) {}

  async create(dto: Partial<AppointmentEntity>) {
    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);
    return ok(saved, "预约创建成功");
  }

  async getByPatient(patientId: number) {
    const list = await this.repo.find({
      where: { patientId },
      order: { appointmentTime: "DESC" },
    });
    return ok(list);
  }

  async getByDateRange(start: string, end: string) {
    const list = await this.repo
      .createQueryBuilder("a")
      .where("a.appointmentTime >= :start AND a.appointmentTime < :end", { start, end })
      .orderBy("a.appointmentTime", "ASC")
      .getMany();
    return ok(list);
  }

  async update(id: number, dto: Record<string, any>) {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) return fail("预约不存在");
    if (dto.patientName !== undefined) existing.patientName = dto.patientName;
    if (dto.visitType !== undefined) existing.visitType = dto.visitType;
    if (dto.appointmentTime !== undefined) existing.appointmentTime = dto.appointmentTime;
    if (dto.duration !== undefined) existing.duration = Number(dto.duration);
    if (dto.doctorId !== undefined) existing.doctorId = String(dto.doctorId);
    if (dto.doctorName !== undefined) existing.doctorName = dto.doctorName;
    if (dto.items !== undefined) existing.items = dto.items;
    if (dto.remark !== undefined) existing.remark = dto.remark;
    const saved = await this.repo.save(existing);
    return ok(saved, "预约已更新");
  }
}
