import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PatientModule } from "../patient/patient.module";
import { PatientEntity } from "../patient/entities/patient.entity";
import { ImplantVisitEntity } from "./entities/implant-visit.entity";
import { ImplantVisitToothEntity } from "./entities/implant-visit-tooth.entity";
import { ImplantInventoryEntity } from "./entities/implant-inventory.entity";
import { ImplantController } from "./implant.controller";
import { ImplantService } from "./implant.service";

@Module({
  imports: [
    PatientModule,
    TypeOrmModule.forFeature([
      PatientEntity,
      ImplantVisitEntity,
      ImplantVisitToothEntity,
      ImplantInventoryEntity,
    ]),
  ],
  controllers: [ImplantController],
  providers: [ImplantService],
})
export class ImplantModule {}
