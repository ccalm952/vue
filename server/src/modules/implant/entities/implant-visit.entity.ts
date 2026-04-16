import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("implant_visit")
export class ImplantVisitEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "patient_id" })
  patientId!: number;

  /** YYYY-MM-DD */
  @Column({ name: "visit_date", length: 32 })
  visitDate!: string;

  /** 二期（月数等），与桌面版 remark 一致 */
  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @Column({ default: "" })
  staff!: string;

  @Column({ name: "follow_up", type: "text", nullable: true })
  followUp!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
