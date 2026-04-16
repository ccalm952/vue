import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./modules/auth/auth.module";
import { PatientModule } from "./modules/patient/patient.module";
import { AppointmentModule } from "./modules/appointment/appointment.module";
import { MedicalRecordModule } from "./modules/medical-record/medical-record.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { BillingModule } from "./modules/billing/billing.module";
import { ImplantModule } from "./modules/implant/implant.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env.local", ".env"],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "mysql",
        host: config.get<string>("MYSQL_HOST", "127.0.0.1"),
        port: config.get<number>("MYSQL_PORT", 3306),
        username: config.get<string>("MYSQL_USER", "root"),
        password: config.get<string>("MYSQL_PASSWORD", ""),
        database: config.get<string>("MYSQL_DATABASE", "dental"),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    AuthModule,
    PatientModule,
    AppointmentModule,
    MedicalRecordModule,
    AttendanceModule,
    BillingModule,
    ImplantModule,
  ],
})
export class AppModule {}
