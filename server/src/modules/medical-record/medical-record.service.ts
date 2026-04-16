import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MedicalRecordEntity } from "./entities/medical-record.entity";
import { ok, fail } from "../../common/api-response";

@Injectable()
export class MedicalRecordService {
  constructor(
    @InjectRepository(MedicalRecordEntity)
    private readonly repo: Repository<MedicalRecordEntity>,
  ) {}

  async create(dto: Partial<MedicalRecordEntity>) {
    const entity = this.repo.create(dto);
    const saved = await this.repo.save(entity);
    return ok(saved, "病历保存成功");
  }

  async getById(id: number) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return fail("病历不存在");
    return ok(entity);
  }

  async getByPatient(patientId: number) {
    const list = await this.repo.find({
      where: { patientId },
      order: { createdAt: "DESC" },
    });
    return ok(list);
  }

  async update(id: number, dto: Partial<MedicalRecordEntity>) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return fail("病历不存在");
    Object.assign(entity, dto);
    const saved = await this.repo.save(entity);
    return ok(saved, "病历更新成功");
  }

  async remove(id: number) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return fail("病历不存在");
    await this.repo.remove(entity);
    return ok(null, "病历已删除");
  }
}
