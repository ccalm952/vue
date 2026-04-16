<template>
  <div class="attendance-settings-page">
    <div class="settings-toolbar">
      <el-button text bg type="primary" @click="router.push('/attendance')">
        <el-icon><ArrowLeft /></el-icon> 返回考勤打卡
      </el-button>
    </div>

    <el-card class="fence-settings-card" shadow="hover">
      <template #header>
        <div class="fence-settings-header">
          <span class="card-title">
            <el-icon><MapLocation /></el-icon> 打卡范围配置
          </span>
          <div class="fence-source-tags">
            <el-tag v-if="geofenceCfg.source === 'database'" type="success" size="small">
              生效：页面保存
            </el-tag>
            <el-tag v-else-if="geofenceCfg.source === 'env'" type="info" size="small">
              生效：环境变量 .env
            </el-tag>
            <el-tag v-else type="info" size="small">未启用围栏</el-tag>
          </div>
        </div>
      </template>

      <el-alert type="info" :closable="false" show-icon class="fence-tip">
        在此填写中心点经纬度、半径与名称并保存后，会写入数据库并<strong>立即生效</strong>，
        优先于服务端 `.env` 中的 `ATTENDANCE_GEOFENCE_*` 配置。可拖动地图标记或点击地图修改中心点；
        “清除页面配置”后恢复为 `.env` 配置。
      </el-alert>

      <el-form label-position="top" class="fence-form" @submit.prevent>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="纬度 LAT">
              <el-input-number
                v-model="fenceEditor.centerLat"
                :precision="6"
                :step="0.0001"
                controls-position="right"
                class="fence-input-num"
                @change="syncFenceMapFromEditor"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="经度 LNG">
              <el-input-number
                v-model="fenceEditor.centerLng"
                :precision="6"
                :step="0.0001"
                controls-position="right"
                class="fence-input-num"
                @change="syncFenceMapFromEditor"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="半径（米）">
              <el-input-number
                v-model="fenceEditor.radiusM"
                :min="1"
                :max="50000"
                :step="10"
                controls-position="right"
                class="fence-input-num"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="地点名称">
              <el-input v-model="fenceEditor.label" placeholder="如：门诊大楼" clearable />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="fence-actions">
          <el-button @click="fillFenceFromCurrentLocation">
            <el-icon><Location /></el-icon> 用当前位置填入
          </el-button>
          <el-button :loading="reverseGeoLoading" @click="reverseGeocodeFenceCenter">
            <el-icon><Search /></el-icon> 逆地理编码（补全名称）
          </el-button>
          <el-button type="primary" :loading="savingFence" @click="saveFenceSettings">
            保存配置
          </el-button>
          <el-button type="danger" plain :loading="clearingFence" @click="clearFenceSettings">
            清除页面配置
          </el-button>
        </div>
      </el-form>

      <p class="fence-map-hint">地图：拖动标记或点击地图设置中心点；圆圈为允许打卡半径。</p>
      <div ref="fenceMapRef" class="fence-map" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, Location, Search, MapLocation } from "@element-plus/icons-vue";
import {
  getGeofenceConfigApi,
  saveGeofenceSettingsApi,
  clearGeofenceSettingsApi,
} from "@/api/attendance";
import { geolocateWithAmap, loadAmap, reverseGeocodeWithAmap } from "@/utils/amap";

const router = useRouter();

type GeofenceSource = "database" | "env" | "none";
type AMapInstance = any;

const geofenceCfg = reactive({
  enabled: false,
  centerLat: 0,
  centerLng: 0,
  radiusM: 0,
  label: "",
  source: "none" as GeofenceSource,
});

const fenceEditor = reactive({
  centerLat: 39.9042,
  centerLng: 116.4074,
  radiusM: 200,
  label: "门诊大楼",
});

const savingFence = ref(false);
const clearingFence = ref(false);
const reverseGeoLoading = ref(false);
const fenceMapRef = ref<HTMLElement | null>(null);

let AMapRef: AMapInstance | null = null;
let mapInstance: AMapInstance | null = null;
let fenceMarker: AMapInstance | null = null;
let fenceCircle: AMapInstance | null = null;

function updateFenceCircleGeometry() {
  if (!fenceMarker || !fenceCircle) return;
  const position = fenceMarker.getPosition();
  fenceCircle.setCenter(position);
  fenceCircle.setRadius(Math.max(1, Number(fenceEditor.radiusM) || 200));
}

function syncFenceMapFromEditor() {
  if (!AMapRef || !mapInstance || !fenceMarker || !fenceCircle) return;
  const lat = Number(fenceEditor.centerLat) || 39.9042;
  const lng = Number(fenceEditor.centerLng) || 116.4074;
  const lngLat = new AMapRef.LngLat(lng, lat);
  fenceMarker.setPosition(lngLat);
  updateFenceCircleGeometry();
  mapInstance.setCenter(lngLat);
  mapInstance.setFitView([fenceMarker, fenceCircle], false, [48, 48, 48, 48]);
}

async function initFenceMap() {
  if (!fenceMapRef.value || mapInstance) return;

  const AMap = await loadAmap();
  AMapRef = AMap;

  const lat = Number(fenceEditor.centerLat) || 39.9042;
  const lng = Number(fenceEditor.centerLng) || 116.4074;
  const radius = Math.max(1, Number(fenceEditor.radiusM) || 200);
  const center = new AMap.LngLat(lng, lat);

  mapInstance = new AMap.Map(fenceMapRef.value, {
    viewMode: "2D",
    zoom: 16,
    center,
    resizeEnable: true,
  });
  mapInstance.addControl(new AMap.ToolBar());

  fenceMarker = new AMap.Marker({
    position: center,
    draggable: true,
    cursor: "move",
  });
  mapInstance.add(fenceMarker);

  fenceCircle = new AMap.Circle({
    center,
    radius,
    strokeColor: "#667eea",
    strokeWeight: 2,
    fillColor: "#764ba2",
    fillOpacity: 0.12,
  });
  mapInstance.add(fenceCircle);

  fenceMarker.on("dragend", (event: any) => {
    const lngLat = event?.lnglat || fenceMarker?.getPosition();
    if (!lngLat) return;
    fenceEditor.centerLat = Math.round(Number(lngLat.getLat()) * 1e6) / 1e6;
    fenceEditor.centerLng = Math.round(Number(lngLat.getLng()) * 1e6) / 1e6;
    updateFenceCircleGeometry();
  });

  mapInstance.on("click", (event: any) => {
    const lngLat = event?.lnglat;
    if (!lngLat || !fenceMarker) return;
    fenceEditor.centerLat = Math.round(Number(lngLat.getLat()) * 1e6) / 1e6;
    fenceEditor.centerLng = Math.round(Number(lngLat.getLng()) * 1e6) / 1e6;
    fenceMarker.setPosition(lngLat);
    updateFenceCircleGeometry();
  });

  mapInstance.setFitView([fenceMarker, fenceCircle], false, [48, 48, 48, 48]);
}

function destroyFenceMap() {
  mapInstance?.destroy();
  mapInstance = null;
  fenceMarker = null;
  fenceCircle = null;
  AMapRef = null;
}

function invalidateFenceMapSize() {
  setTimeout(() => mapInstance?.resize(), 120);
}

watch(
  () => fenceEditor.radiusM,
  () => {
    if (mapInstance && fenceMarker && fenceCircle) {
      updateFenceCircleGeometry();
      mapInstance.setFitView([fenceMarker, fenceCircle], false, [48, 48, 48, 48]);
    }
  },
);

function applyResolvedGeofenceToEditor(d: {
  enabled?: boolean;
  centerLat?: number;
  centerLng?: number;
  radiusM?: number;
  label?: string;
}) {
  if (d.enabled) {
    fenceEditor.centerLat = Number(d.centerLat) || fenceEditor.centerLat;
    fenceEditor.centerLng = Number(d.centerLng) || fenceEditor.centerLng;
    fenceEditor.radiusM = Number(d.radiusM) || 200;
    fenceEditor.label = typeof d.label === "string" ? d.label : "";
  } else {
    fenceEditor.centerLat = 39.9042;
    fenceEditor.centerLng = 116.4074;
    fenceEditor.radiusM = 200;
    fenceEditor.label = "门诊大楼";
  }
}

async function loadGeofence() {
  try {
    const res: any = await getGeofenceConfigApi();
    const d = res.data;
    if (d) {
      geofenceCfg.enabled = !!d.enabled;
      geofenceCfg.centerLat = Number(d.centerLat) || 0;
      geofenceCfg.centerLng = Number(d.centerLng) || 0;
      geofenceCfg.radiusM = Number(d.radiusM) || 0;
      geofenceCfg.label = typeof d.label === "string" ? d.label : "";
      geofenceCfg.source = (d.source as GeofenceSource) || "none";
      applyResolvedGeofenceToEditor(d);
    }
  } catch {
    /* */
  }
}

async function fillFenceFromCurrentLocation() {
  try {
    const result = await geolocateWithAmap();
    fenceEditor.centerLat = Math.round(result.latitude * 1e6) / 1e6;
    fenceEditor.centerLng = Math.round(result.longitude * 1e6) / 1e6;
    syncFenceMapFromEditor();
  } catch (e: unknown) {
    console.warn("[attendance-settings] fillFenceFromCurrentLocation", e);
  }
}

async function reverseGeocodeFenceCenter() {
  reverseGeoLoading.value = true;
  try {
    const address = await reverseGeocodeWithAmap(fenceEditor.centerLat, fenceEditor.centerLng);
    if (address) {
      fenceEditor.label = address;
    }
  } catch (e: unknown) {
    console.warn("[attendance-settings] reverseGeocodeFenceCenter", e);
  } finally {
    reverseGeoLoading.value = false;
  }
}

async function saveFenceSettings() {
  savingFence.value = true;
  try {
    await saveGeofenceSettingsApi({
      centerLat: fenceEditor.centerLat,
      centerLng: fenceEditor.centerLng,
      radiusM: fenceEditor.radiusM,
      label: fenceEditor.label,
    });
    ElMessage.success("已保存");
    await loadGeofence();
    syncFenceMapFromEditor();
  } catch {
    /* */
  } finally {
    savingFence.value = false;
  }
}

async function clearFenceSettings() {
  try {
    await ElMessageBox.confirm(
      "确定清除页面保存的围栏吗？清除后将恢复使用服务端 .env 中的 ATTENDANCE_GEOFENCE_* 配置（若未配置则不限制范围）。",
      "清除页面配置",
      { type: "warning", confirmButtonText: "清除", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  clearingFence.value = true;
  try {
    await clearGeofenceSettingsApi();
    ElMessage.success("已清除");
    await loadGeofence();
    syncFenceMapFromEditor();
  } catch {
    /* */
  } finally {
    clearingFence.value = false;
  }
}

onMounted(async () => {
  window.addEventListener("resize", invalidateFenceMapSize);
  await loadGeofence();
  await nextTick();
  await initFenceMap();
  syncFenceMapFromEditor();
});

onUnmounted(() => {
  window.removeEventListener("resize", invalidateFenceMapSize);
  destroyFenceMap();
});
</script>

<style scoped>
.attendance-settings-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  box-sizing: border-box;
}

.settings-toolbar {
  margin-bottom: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 15px;
}

.fence-settings-card {
  margin-bottom: 16px;
}

.fence-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.fence-source-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.fence-tip {
  margin-bottom: 16px;
}

.fence-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.fence-input-num {
  width: 100%;
}

.fence-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.fence-map-hint {
  margin: 0 0 8px;
  font-size: var(--el-font-size-extra-small);
  color: #909399;
}

.fence-map {
  width: 100%;
  height: min(52vh, 420px);
  min-height: 240px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  z-index: 0;
}

@media (max-width: 640px) {
  .attendance-settings-page {
    padding: 12px;
  }

  .fence-actions {
    flex-direction: column;
  }

  .fence-actions .el-button {
    margin-left: 0;
    width: 100%;
  }

  .fence-map {
    height: 45vh;
    min-height: 220px;
  }
}
</style>
