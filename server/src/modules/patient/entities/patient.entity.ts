import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("patient")
export class PatientEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ default: "" })
  phone!: string;

  @Column({ default: "男" })
  gender!: string;

  @Column({ default: "" })
  source!: string;

  @Column({ default: "" })
  birthday!: string;

  @Column({ type: "int", default: 0 })
  age!: number;

  /** 患者标签名称列表，与前端「设置 → 患者标签」白名单对齐；不在白名单中的项由 prune 接口清理 */
  @Column({ type: "json", nullable: true })
  tags!: string[] | null;

  @Column({ default: "" })
  visitTime!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
