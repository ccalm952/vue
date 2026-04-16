import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/** 单条记录 id=1：页面保存的打卡围栏，优先于环境变量 */
@Entity("geofence_settings")
export class GeofenceSettingsEntity {
  @PrimaryColumn({ type: "int" })
  id!: number;

  @Column({ type: "double", comment: "中心纬度" })
  centerLat!: number;

  @Column({ type: "double", comment: "中心经度" })
  centerLng!: number;

  @Column({ type: "int", default: 200, comment: "允许半径（米）" })
  radiusM!: number;

  @Column({ default: "", comment: "地点名称" })
  label!: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}
