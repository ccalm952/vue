import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("implant_visit_tooth")
export class ImplantVisitToothEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "visit_id" })
  visitId!: number;

  @Column({ name: "tooth_no", default: "" })
  toothNo!: string;

  @Column({ name: "implant_brand", default: "" })
  implantBrand!: string;

  @Column({ name: "implant_model", default: "" })
  implantModel!: string;

  @Column({ name: "implant_qty", type: "int", default: 0 })
  implantQty!: number;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder!: number;

  @Column({ name: "tooth_remark", type: "text", nullable: true })
  toothRemark!: string | null;
}
