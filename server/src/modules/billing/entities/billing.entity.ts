import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("billing")
export class BillingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  patientId!: number;

  @Column({ default: "" })
  payMethod!: string;

  @Column({ type: "datetime" })
  chargeTime!: Date;

  @Column({ default: "" })
  operatorName!: string;

  @Column({ default: "" })
  note!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  /** 实付金额；历史数据为 null 时按「足额实付」处理（等价于 totalAmount） */
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  actualPaid!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
