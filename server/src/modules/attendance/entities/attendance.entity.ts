import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("attendance")
export class AttendanceEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  date!: string;

  @Column()
  type!: string;

  @Column({ type: "datetime" })
  punchTime!: Date;

  @Column({ type: "decimal", precision: 10, scale: 7, default: 0 })
  latitude!: number;

  @Column({ type: "decimal", precision: 10, scale: 7, default: 0 })
  longitude!: number;

  @Column({ default: "" })
  address!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
