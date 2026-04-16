import { Module, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FeeItemEntity } from "./entities/fee-item.entity";
import { BillingEntity } from "./entities/billing.entity";
import { BillingItemEntity } from "./entities/billing-item.entity";
import { PatientEntity } from "../patient/entities/patient.entity";
import { AppointmentEntity } from "../appointment/entities/appointment.entity";
import { StaffEntity } from "../auth/entities/staff.entity";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FeeItemEntity,
      BillingEntity,
      BillingItemEntity,
      PatientEntity,
      AppointmentEntity,
      StaffEntity,
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule implements OnModuleInit {
  constructor(private readonly billingService: BillingService) {}

  async onModuleInit() {
    await this.billingService.seedFeeItemsIfEmpty();
  }
}
