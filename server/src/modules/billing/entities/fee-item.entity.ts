import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("fee_item")
export class FeeItemEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ comment: "大类：治疗费/检查费/材料费…" })
  category!: string;

  @Column({ comment: "项目名称：洁牙、拔牙…" })
  name!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({ default: "", comment: "单位：次/颗/盒…" })
  unit!: string;

  @Column({ type: "int", default: 1, comment: "排序权重" })
  sort!: number;
}
