import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("appointment")
export class AppointmentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  patientId!: number;

  @Column({ default: "" })
  patientName!: string;

  @Column({ comment: "初诊 / 复诊" })
  visitType!: string;

  @Column()
  appointmentTime!: string;

  @Column({ type: "int", comment: "持续时间（分钟）" })
  duration!: number;

  @Column({ default: "" })
  doctorId!: string;

  @Column({ default: "" })
  doctorName!: string;

  @Column({ type: "text", nullable: true })
  items!: string;

  @Column({ default: "" })
  remark!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
