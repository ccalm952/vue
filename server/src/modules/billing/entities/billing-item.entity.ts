import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("billing_item")
export class BillingItemEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  billingId!: number;

  @Column()
  feeItemId!: number;

  @Column({ default: "" })
  itemName!: string;

  @Column({ default: "" })
  category!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({ type: "int", default: 1 })
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  amount!: number;
}
