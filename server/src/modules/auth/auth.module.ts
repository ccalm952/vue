import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StaffEntity } from "./entities/staff.entity";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { StaffController } from "./staff.controller";
import { StaffService } from "./staff.service";

@Module({
  imports: [TypeOrmModule.forFeature([StaffEntity])],
  controllers: [AuthController, StaffController],
  providers: [AuthService, StaffService],
  exports: [AuthService],
})
export class AuthModule {}
