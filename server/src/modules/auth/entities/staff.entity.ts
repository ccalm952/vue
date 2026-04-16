import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("staff")
export class StaffEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  loginAccount!: string;

  @Column({ comment: "SHA-256 hex" })
  loginPassword!: string;

  @Column()
  name!: string;

  @Column({ default: "" })
  phone!: string;

  @Column({ default: "管理员" })
  role!: string;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
