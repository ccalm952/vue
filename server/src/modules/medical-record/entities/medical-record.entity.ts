import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("medical_record")
export class MedicalRecordEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  patientId!: number;

  @Column({ comment: "初诊病历 / 复诊病历" })
  type!: string;

  @Column({ default: "" })
  doctorId!: string;

  @Column({ default: "" })
  doctorName!: string;

  @Column({ default: "" })
  visitTime!: string;

  @Column({ type: "text", nullable: true, comment: "主诉" })
  chiefComplaint!: string;

  @Column({ type: "text", nullable: true, comment: "现病史" })
  presentIllness!: string;

  @Column({ type: "text", nullable: true, comment: "既往史" })
  pastHistory!: string;

  @Column({ type: "text", nullable: true, comment: "口腔检查" })
  oralExam!: string;

  @Column({ type: "text", nullable: true, comment: "辅助检查" })
  auxExam!: string;

  @Column({ type: "text", nullable: true, comment: "诊断" })
  diagnosis!: string;

  @Column({ type: "text", nullable: true, comment: "治疗计划" })
  treatmentPlan!: string;

  @Column({ type: "text", nullable: true, comment: "处置" })
  treatment!: string;

  @Column({ type: "text", nullable: true, comment: "医嘱" })
  advice!: string;

  @Column({ type: "text", nullable: true, comment: "备注" })
  remark!: string;

  @Column({ type: "int", default: 0, comment: "牙位图 JSON" })
  toothChart!: number;

  @Column({ type: "text", nullable: true, comment: "牙位备注" })
  toothNote!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
