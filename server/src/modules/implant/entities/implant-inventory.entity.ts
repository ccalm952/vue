import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("implant_inventory")
@Unique(["brand", "modelCode"])
export class ImplantInventoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  brand!: string;

  @Column({ name: "model_code" })
  modelCode!: string;

  @Column({ type: "int", default: 0 })
  supplement!: number;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder!: number;
}
