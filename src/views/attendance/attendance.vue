<template>
  <div class="attendance">
    <div class="attendance-toolbar">
      <el-button
        link
        type="primary"
        class="attendance-toolbar-btn"
        @click="router.push('/attendance/settings')"
      >
        打卡范围配置
      </el-button>
      <el-button
        link
        type="primary"
        class="attendance-toolbar-btn"
        @click="router.push('/attendance/shift-settings')"
      >
        班次时间配置
      </el-button>
      <el-button
        v-if="isAdmin"
        link
        type="primary"
        class="attendance-toolbar-btn"
        @click="router.push('/attendance/stats')"
      >
        考勤统计
      </el-button>
    </div>
    <!-- 打卡区 -->
    <el-card class="attendance-card" shadow="hover">
      <div class="attendance-clock">
        <div class="attendance-date">{{ currentDateStr }}</div>
        <div class="attendance-time">{{ currentTime }}</div>
        <el-button
          class="attendance-punch-btn"
          text
          type="primary"
          :loading="punching"
          :disabled="punching || quickPunchType === null"
          @click="quickPunch"
        >
          打卡
        </el-button>
      </div>

      <div class="attendance-location">
        <template v-if="location.latitude">
          <div
            class="attendance-location-status"
            :class="{
              'is-ok': !geofenceCfg.enabled || insideFence,
              'is-warn': geofenceCfg.enabled && !insideFence,
            }"
          >
            <el-icon class="attendance-location-icon" :size="16">
              <CircleCheckFilled v-if="!geofenceCfg.enabled || insideFence" />
              <WarningFilled v-else />
            </el-icon>
            <div class="attendance-location-content">
              <div class="attendance-location-address">{{ location.address || "未知地址" }}</div>
            </div>
          </div>
        </template>
        <div v-else class="attendance-location-empty">
          <el-button type="primary" plain round :loading="locating" @click="refreshLocation">
            <el-icon><LocationFilled /></el-icon>
            {{ locating ? "正在获取位置..." : "获取定位" }}
          </el-button>
          <p class="attendance-location-hint">打卡前请先获取定位</p>
        </div>
      </div>
    </el-card>
    <!-- 历史记录 -->
    <el-card class="attendance-history" shadow="never">
      <template v-if="historyRows.length">
        <div class="attendance-history-week-nav">
          <el-button size="small" text type="primary" @click="shiftHistoryStripWeek(-1)">
            上一周
          </el-button>
          <el-button size="small" text type="primary" @click="shiftHistoryStripWeek(1)">
            下一周
          </el-button>
          <el-button size="small" text type="primary" @click="goToCurrentWeek">
            回到本周
          </el-button>
        </div>
        <div class="attendance-history-strip-outer" role="group" aria-label="选择日期">
          <div class="attendance-history-strip">
            <button
              v-for="d in historyStripDates"
              :key="d.key"
              type="button"
              class="attendance-history-strip-day"
              :class="{
                'is-selected': d.key === historySelectedDate,
                'is-today': d.isToday,
                'has-record': d.hasRecord,
              }"
              @click="historySelectedDate = d.key"
            >
              <span class="attendance-history-strip-dow">{{ d.dow }}</span>
              <span class="attendance-history-strip-num">{{ d.dayNum }}</span>
              <span v-if="d.hasRecord" class="attendance-history-strip-dot" aria-hidden="true" />
            </button>
          </div>
        </div>

        <p class="attendance-history-overtime">{{ selectedOvertimeLine }}</p>

        <div class="attendance-history-timeline">
          <div
            v-for="(item, idx) in selectedDayTimeline"
            :key="item.key"
            class="attendance-history-timeline-item"
          >
            <div class="attendance-history-timeline-rail">
              <span class="attendance-history-timeline-dot" />
              <span
                v-if="idx < selectedDayTimeline.length - 1"
                class="attendance-history-timeline-line"
              />
            </div>
            <div class="attendance-history-timeline-body">
              <div class="attendance-history-timeline-head">
                <span class="attendance-history-timeline-label">{{ item.label }}</span>
                <span
                  class="attendance-history-timeline-time"
                  :class="{ 'is-empty': !item.time }"
                  >{{ item.time || "--:--" }}</span
                >
              </div>
              <div v-if="item.address" class="attendance-history-timeline-addr">
                <el-icon class="attendance-history-timeline-addr-icon" :size="14">
                  <LocationFilled />
                </el-icon>
                <span>{{ item.address }}</span>
              </div>
              <el-button
                v-if="isAdmin && item.id"
                type="danger"
                link
                size="small"
                :loading="deletingRecordId === item.id"
                @click="confirmDeleteAttendanceRecord(item.id)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </template>
      <el-empty v-else class="attendance-history-empty-block" description="暂无打卡记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { LocationFilled, CircleCheckFilled, WarningFilled } from "@element-plus/icons-vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth-store";
import { useAttendanceShiftStore } from "@/stores/attendance-shift-store";
import {
  punchApi,
  getTodayRecordsApi,
  getAttendanceRecordsApi,
  getGeofenceConfigApi,
  deleteAttendanceRecordAdminApi,
} from "@/api/attendance";
import {
  isWallClockAtOrAfter,
  isWallClockAtOrBefore,
  isWallClockInInclusiveRange,
  minutesFromMidnight,
} from "@/config/attendance-shift";
import { geolocateWithAmap, reverseGeocodeWithAmap } from "@/utils/amap";

const router = useRouter();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.userInfo?.role === "管理员");
const attendanceShiftStore = useAttendanceShiftStore();
const { merged: shiftMerged } = storeToRefs(attendanceShiftStore);

/* ═══ 打卡区（顺序与模板一致：时钟 → 围栏配置 → 定位 → 围栏判定 → 今日记录 → 类型按钮 → 提交）═══ */

/* ── 1. 实时时钟 ── */
const currentTime = ref("");
const currentDateStr = ref("");
let clockTimer: ReturnType<typeof setInterval>;

function updateClock() {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString("zh-CN", { hour12: false });
  currentDateStr.value = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

/* ── 2. 围栏配置 ── */
const geofenceCfg = reactive({
  enabled: false,
  centerLat: 0,
  centerLng: 0,
  radiusM: 0,
  label: "",
});

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
    }
  } catch {
    /* 接口失败时不启用围栏，避免误拦打卡 */
  }
}

/* ── 3. 定位 ── */
const locating = ref(false);
const location = reactive({ latitude: 0, longitude: 0, address: "" });
const todayRecordsLoadedOnce = ref(false);

// 自动打卡：定位成功后自动尝试一次
const autoPunchEnabled = ref(true);
const autoPunchAttempted = ref(false);
const lastLocationSuccessAt = ref(0);

async function refreshLocation() {
  locating.value = true;
  try {
    const result = await geolocateWithAmap();
    location.latitude = result.latitude;
    location.longitude = result.longitude;
    location.address =
      result.address ||
      (await reverseGeocodeWithAmap(result.latitude, result.longitude).catch(() => "")) ||
      `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`;
    lastLocationSuccessAt.value = Date.now();
  } catch (err: unknown) {
    console.warn("[attendance] refreshLocation", err);
  } finally {
    locating.value = false;
  }
}

/* ── 4. 围栏距离与是否在范围内（依赖定位坐标）── */
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const distanceToFenceM = computed(() => {
  if (!geofenceCfg.enabled || !location.latitude) return null;
  return haversineDistanceMeters(
    location.latitude,
    location.longitude,
    geofenceCfg.centerLat,
    geofenceCfg.centerLng,
  );
});

const insideFence = computed(() => {
  if (!geofenceCfg.enabled) return true;
  const d = distanceToFenceM.value;
  if (d === null) return false;
  return d <= geofenceCfg.radiusM;
});

/* ── 5. 今日记录（打卡区状态）── */
interface PunchRecord {
  id: number;
  type: string;
  punchTime: string;
  latitude: number;
  longitude: number;
  address: string;
}

const todayRecords = ref<PunchRecord[]>([]);

const todayMap = computed(() => {
  const map: Record<string, PunchRecord> = {};
  for (const r of todayRecords.value) {
    map[r.type] = r;
  }
  return map;
});

/* ── 6. 打卡类型判定（单键「打卡」按顺序取第一个可打类型）── */
const punchTypes = ["morning_in", "morning_out", "afternoon_in", "afternoon_out"] as const;

function isManualPunchDisabled(t: string) {
  void currentTime.value;
  if (punching.value || !location.latitude) return true;
  if (geofenceCfg.enabled && !insideFence.value) return true;
  const map = todayMap.value;
  const shift = shiftMerged.value;
  const now = new Date();
  if (t === "morning_in" && map.morning_in) return true;
  if (
    t === "morning_in" &&
    !isWallClockInInclusiveRange(now, shift.morningInWindowStart, shift.morningInWindowEnd)
  ) {
    return true;
  }
  if (t === "morning_out" && !map.morning_in) return true;
  if (t === "morning_out" && !isWallClockAtOrBefore(now, shift.morningOutLatest)) return true;
  if (t === "afternoon_in" && map.afternoon_in) return true;
  if (t === "afternoon_in" && !isWallClockAtOrAfter(now, shift.afternoonClockInEarliest)) {
    return true;
  }
  if (t === "afternoon_out" && !map.afternoon_in) return true;
  return false;
}

const quickPunchType = computed(() => {
  void currentTime.value;
  for (const t of punchTypes) {
    if (!isManualPunchDisabled(t)) return t;
  }
  return null;
});

function quickPunch() {
  const t = quickPunchType.value;
  if (!t) return;
  void doPunch(t);
}

function tryAutoPunch() {
  if (!autoPunchEnabled.value) return;
  if (autoPunchAttempted.value) return;
  if (locating.value) return;
  if (!location.latitude) return;
  if (geofenceCfg.enabled && !insideFence.value) return;
  if (!authStore.userInfo?.userId) return;
  if (!todayRecordsLoadedOnce.value) return;
  if (punching.value) return;
  if (!quickPunchType.value) return;
  autoPunchAttempted.value = true;
  quickPunch();
}

watch(
  () =>
    [
      lastLocationSuccessAt.value,
      authStore.userInfo?.userId,
      todayRecordsLoadedOnce.value,
    ] as const,
  () => {
    tryAutoPunch();
  },
);

/* ── 7. 提交打卡 ── */
const punching = ref(false);

async function doPunch(type: string) {
  if (!location.latitude) {
    ElMessage.warning("请先获取定位信息");
    return;
  }
  if (geofenceCfg.enabled && !insideFence.value) {
    ElMessage.warning("当前位置不在允许打卡范围内");
    return;
  }
  const map = todayMap.value;
  if (type === "morning_in" && map.morning_in) {
    ElMessage.warning("上午上班已打卡");
    return;
  }
  if (type === "afternoon_in" && map.afternoon_in) {
    ElMessage.warning("下午上班已打卡");
    return;
  }
  if (
    type === "afternoon_in" &&
    !isWallClockAtOrAfter(new Date(), shiftMerged.value.afternoonClockInEarliest)
  ) {
    ElMessage.warning(
      `未到「下午上班最早可打」时间（${shiftMerged.value.afternoonClockInEarliest}）前不能打下午上班，可先更新上午下班`,
    );
    return;
  }
  if (
    type === "morning_in" &&
    !isWallClockInInclusiveRange(
      new Date(),
      shiftMerged.value.morningInWindowStart,
      shiftMerged.value.morningInWindowEnd,
    )
  ) {
    ElMessage.warning(
      `「上午上班」仅允许在 ${shiftMerged.value.morningInWindowStart} - ${shiftMerged.value.morningInWindowEnd} 内打卡`,
    );
    return;
  }
  if (type === "morning_out" && !map.morning_in) {
    ElMessage.warning("请先打上午上班，再打上午下班");
    return;
  }
  if (
    type === "morning_out" &&
    !isWallClockAtOrBefore(new Date(), shiftMerged.value.morningOutLatest)
  ) {
    ElMessage.warning(
      `已超过「上午下班最晚可打」时间（${shiftMerged.value.morningOutLatest}），无法再打上午下班`,
    );
    return;
  }
  if (type === "afternoon_out" && !map.afternoon_in) {
    ElMessage.warning("请先打下午上班，再打下午下班");
    return;
  }
  const userId = authStore.userInfo?.userId;
  if (!userId) {
    ElMessage.error("请先登录");
    return;
  }
  punching.value = true;
  try {
    await punchApi({
      userId,
      type,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
    });
    ElMessage.success("已打卡");
    await loadTodayRecords();
    await loadHistory();
  } catch {
    /* interceptor handles */
  } finally {
    punching.value = false;
  }
}

/* ═══ 历史记录区 ═══ */

/* ── 加班计算（历史行展示） ── */
function calcOvertimeMinutes(
  morningOut: string | null,
  afternoonOut: string | null,
  morningEndMin: number,
  afternoonEndMin: number,
): number {
  let total = 0;
  if (morningOut) {
    const parts = morningOut.split(":").map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const mins = h * 60 + m;
    if (mins > morningEndMin) total += mins - morningEndMin;
  }
  if (afternoonOut) {
    const parts = afternoonOut.split(":").map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const mins = h * 60 + m;
    if (mins > afternoonEndMin) total += mins - afternoonEndMin;
  }
  return total;
}

function formatOvertime(minutes: number): string {
  if (minutes <= 0) return "无";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}小时${m}分钟`;
  if (h > 0) return `${h}小时`;
  return `${m}分钟`;
}

/* ── 历史记录 ── */
const dateRange = ref<string[] | null>(null);
const historyRecords = ref<any[]>([]);

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const historySelectedDate = ref(fmtDate(new Date()));

interface HistoryRow {
  date: string;
  morningIn: string | null;
  morningOut: string | null;
  afternoonIn: string | null;
  afternoonOut: string | null;
  morningInId?: number;
  morningOutId?: number;
  afternoonInId?: number;
  afternoonOutId?: number;
  morningInAddr: string;
  morningOutAddr: string;
  afternoonInAddr: string;
  afternoonOutAddr: string;
  overtimeMinutes: number;
  overtimeStr: string;
  address: string;
}

function timeFromRecord(r: any): string {
  const d = new Date(r.punchTime);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const historyRows = computed<HistoryRow[]>(() => {
  const grouped: Record<string, Record<string, any>> = {};
  for (const r of historyRecords.value) {
    const dateKey = r.date as string;
    let byType = grouped[dateKey];
    if (!byType) {
      byType = {};
      grouped[dateKey] = byType;
    }
    byType[r.type] = r;
  }
  return Object.entries(grouped)
    .map(([date, recs]) => {
      const mOut = recs.morning_out ? timeFromRecord(recs.morning_out) : null;
      const aOut = recs.afternoon_out ? timeFromRecord(recs.afternoon_out) : null;
      const ot = calcOvertimeMinutes(
        mOut,
        aOut,
        minutesFromMidnight(shiftMerged.value.overtimeMorningNormalEnd),
        minutesFromMidnight(shiftMerged.value.overtimeAfternoonNormalEnd),
      );
      const addresses = Object.values(recs)
        .map((r: any) => r.address)
        .filter(Boolean);
      const addr = (r: any) => (typeof r?.address === "string" ? r.address : "");
      return {
        date,
        morningIn: recs.morning_in ? timeFromRecord(recs.morning_in) : null,
        morningOut: mOut,
        afternoonIn: recs.afternoon_in ? timeFromRecord(recs.afternoon_in) : null,
        afternoonOut: aOut,
        morningInId: recs.morning_in?.id as number | undefined,
        morningOutId: recs.morning_out?.id as number | undefined,
        afternoonInId: recs.afternoon_in?.id as number | undefined,
        afternoonOutId: recs.afternoon_out?.id as number | undefined,
        morningInAddr: addr(recs.morning_in),
        morningOutAddr: addr(recs.morning_out),
        afternoonInAddr: addr(recs.afternoon_in),
        afternoonOutAddr: addr(recs.afternoon_out),
        overtimeMinutes: ot,
        overtimeStr: formatOvertime(ot),
        address: addresses[addresses.length - 1] || "",
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
});

const historyRowByDate = computed(() => {
  const m: Record<string, HistoryRow> = {};
  for (const row of historyRows.value) {
    m[row.date] = row;
  }
  return m;
});

/** 含 `date` 的那一周的周一（12:00 本地时间，避免夏令时边界） */
function mondayOfWeekContaining(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const toMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + toMonday);
  return d;
}

/** 当前周条展示的周一（yyyy-mm-dd） */
const historyStripWeekMonday = ref(fmtDate(mondayOfWeekContaining(new Date())));

const historyStripDates = computed(() => {
  const map = historyRowByDate.value;
  const dowZh = ["日", "一", "二", "三", "四", "五", "六"];
  const parts = historyStripWeekMonday.value.split("-").map(Number);
  const y = parts[0] ?? 0;
  const mo = parts[1] ?? 1;
  const da = parts[2] ?? 1;
  const start = new Date(y, mo - 1, da, 12, 0, 0, 0);
  const todayKey = fmtDate(new Date());

  const out: {
    key: string;
    dow: string;
    dayNum: number;
    hasRecord: boolean;
    isToday: boolean;
  }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = fmtDate(d);
    const row = map[key];
    const hasRecord = !!(
      row &&
      (row.morningIn || row.morningOut || row.afternoonIn || row.afternoonOut)
    );
    out.push({
      key,
      dow: "周" + dowZh[d.getDay()],
      dayNum: d.getDate(),
      hasRecord,
      isToday: key === todayKey,
    });
  }
  return out;
});

function historyStripDateKeys(): Set<string> {
  return new Set(historyStripDates.value.map((x) => x.key));
}

/** 切换周后，若当前选中不在本栏，优先选「今天」（若在本周）否则选周一 */
function ensureHistorySelectionInWeekStrip() {
  const keys = historyStripDateKeys();
  if (keys.has(historySelectedDate.value)) return;
  const todayK = fmtDate(new Date());
  if (keys.has(todayK)) {
    historySelectedDate.value = todayK;
    return;
  }
  const first = historyStripDates.value[0];
  if (first) historySelectedDate.value = first.key;
}

function shiftHistoryStripWeek(deltaWeeks: number) {
  const parts = historyStripWeekMonday.value.split("-").map(Number);
  const d = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1, 12, 0, 0, 0);
  d.setDate(d.getDate() + deltaWeeks * 7);
  historyStripWeekMonday.value = fmtDate(d);
  ensureHistorySelectionInWeekStrip();
}

function goToCurrentWeek() {
  historyStripWeekMonday.value = fmtDate(mondayOfWeekContaining(new Date()));
  historySelectedDate.value = fmtDate(new Date());
}

const selectedOvertimeLine = computed(() => {
  const row = historyRowByDate.value[historySelectedDate.value];
  if (!row) return "加班时长：—";
  if (row.overtimeMinutes <= 0) return "加班时长：无";
  return `加班时长：${row.overtimeStr}`;
});

const selectedDayTimeline = computed(() => {
  const row = historyRowByDate.value[historySelectedDate.value];
  return [
    {
      key: "morning_in",
      label: "上午上班",
      time: row?.morningIn ?? null,
      address: row?.morningInAddr ?? "",
      id: row?.morningInId,
    },
    {
      key: "morning_out",
      label: "上午下班",
      time: row?.morningOut ?? null,
      address: row?.morningOutAddr ?? "",
      id: row?.morningOutId,
    },
    {
      key: "afternoon_in",
      label: "下午上班",
      time: row?.afternoonIn ?? null,
      address: row?.afternoonInAddr ?? "",
      id: row?.afternoonInId,
    },
    {
      key: "afternoon_out",
      label: "下午下班",
      time: row?.afternoonOut ?? null,
      address: row?.afternoonOutAddr ?? "",
      id: row?.afternoonOutId,
    },
  ];
});

watch(
  () => historySelectedDate.value,
  (key) => {
    const [yy, mm, dd] = key.split("-").map(Number);
    if (!yy || !mm || !dd) return;
    const d = new Date(yy, mm - 1, dd, 12, 0, 0, 0);
    if (Number.isNaN(d.getTime())) return;
    const mon = fmtDate(mondayOfWeekContaining(d));
    if (mon !== historyStripWeekMonday.value) {
      historyStripWeekMonday.value = mon;
    }
  },
);

/* ── 数据加载 ── */
async function loadTodayRecords() {
  const userId = authStore.userInfo?.userId;
  if (!userId) return;
  try {
    const res: any = await getTodayRecordsApi(userId);
    todayRecords.value = res.data || [];
  } catch {
    /* interceptor handles */
  } finally {
    todayRecordsLoadedOnce.value = true;
    tryAutoPunch();
  }
}

const deletingRecordId = ref<number | null>(null);

async function confirmDeleteAttendanceRecord(id: number) {
  try {
    await ElMessageBox.confirm("确定删除该条打卡记录？删除后不可恢复。", "删除打卡", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  deletingRecordId.value = id;
  try {
    await deleteAttendanceRecordAdminApi(id);
    ElMessage.success("已删除");
    await loadHistory();
    await loadTodayRecords();
  } catch {
    /* 拦截器已提示 */
  } finally {
    deletingRecordId.value = null;
  }
}

async function loadHistory() {
  const userId = authStore.userInfo?.userId;
  if (!userId) return;
  try {
    const params: any = { userId };
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const res: any = await getAttendanceRecordsApi(params);
    historyRecords.value = res.data || [];
  } catch {
    /* interceptor handles */
  }
}

/* ── 初始化 ──
 * 子页面 onMounted 早于 app-layout，刷新后 Pinia 无 userInfo，
 * 若不先 fetchUserInfo，loadHistory/loadTodayRecords 会因无 userId 直接跳过，表格会一直空。
 */
onMounted(async () => {
  updateClock();
  clockTimer = setInterval(updateClock, 1000);

  await loadGeofence();

  refreshLocation();

  if (authStore.token && !authStore.userInfo?.userId) {
    try {
      await authStore.fetchUserInfo();
    } catch {
      return;
    }
  }

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 89);
  dateRange.value = [fmtDate(start), fmtDate(end)];

  await loadTodayRecords();
  await loadHistory();

  historySelectedDate.value = fmtDate(new Date());
  historyStripWeekMonday.value = fmtDate(mondayOfWeekContaining(new Date()));
});

onUnmounted(() => {
  clearInterval(clockTimer);
});
</script>

<style scoped>
.attendance {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── 工具栏 ── */
.attendance-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.attendance-toolbar-btn {
  padding: 8px;
  margin: 0;
}

/* ═══ 打卡主卡片（顺序：卡片容器 → 时钟 → 定位条）═══ */

/* 卡片容器 */
.attendance-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

/* 1. 时钟（日期、时间，右侧「打卡」） */
.attendance-clock {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.attendance-punch-btn.el-button.is-text {
  padding: 0;
  flex-shrink: 0;
}

.attendance-date {
  font-size: 14px;
}

.attendance-time {
  font-size: 14px;
}

/* 2. 定位条（宽度随地址等文本收缩，最长不超过卡片） */
.attendance-location {
  align-items: center;
  justify-content: center;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: min(500px, 100%);
  width: fit-content;
  height: 32px;
}

.attendance-location-status {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  width: fit-content;
  max-width: 100%;
}

.attendance-location-status.is-ok .attendance-location-icon {
  color: var(--el-color-success);
  flex-shrink: 0;
}

.attendance-location-status.is-warn .attendance-location-icon {
  color: var(--el-color-warning);
  flex-shrink: 0;
}

.attendance-location-content {
  flex: 0 1 auto;
  min-width: 0;
}

.attendance-location-address {
  font-size: 14px;
}

.attendance-location-empty {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 8px;
  text-align: center;
}

.attendance-location-hint {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
}

/* ═══ 历史记录 ═══ */
.attendance-history {
  margin: 0;
}

.attendance-history-empty-block {
  padding: 24px 0;
}

.attendance-history-week-nav {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin: 0 0 4px;
}

.attendance-history-strip-outer {
  margin: 0 0 8px;
  overflow: hidden;
}

.attendance-history-strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
  padding: 4px 0 10px;
}

.attendance-history-strip-day {
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font: inherit;
  gap: 6px;
  min-width: 0;
  padding: 6px 2px 8px;
}

.attendance-history-strip-day:hover {
  background: var(--el-fill-color-light);
}

.attendance-history-strip-dow {
  font-size: 12px;
  line-height: 1.2;
}

.attendance-history-strip-num {
  align-items: center;
  border-radius: 50%;
  display: flex;
  font-size: 15px;
  font-weight: 600;
  height: 36px;
  justify-content: center;
  line-height: 1;
  width: 36px;
}

.attendance-history-strip-day.is-selected .attendance-history-strip-num {
  background: var(--el-color-primary);
  color: #fff;
}

.attendance-history-strip-day.is-today:not(.is-selected) .attendance-history-strip-num {
  outline: 1px solid var(--el-color-primary-light-5);
}

.attendance-history-strip-dot {
  background: var(--el-color-warning);
  border-radius: 50%;
  flex-shrink: 0;
  height: 5px;
  margin-top: -2px;
  width: 5px;
}

.attendance-history-overtime {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
  margin: 0 0 16px;
  text-align: center;
}

.attendance-history-timeline {
  display: flex;
  flex-direction: column;
}

.attendance-history-timeline-item {
  display: flex;
  gap: 12px;
}

.attendance-history-timeline-rail {
  align-items: center;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 14px;
}

.attendance-history-timeline-dot {
  background: #fff;
  border: 2px solid var(--el-color-primary);
  border-radius: 50%;
  box-sizing: border-box;
  flex-shrink: 0;
  height: 12px;
  width: 12px;
}

.attendance-history-timeline-line {
  background: var(--el-border-color-lighter);
  flex: 1;
  min-height: 20px;
  width: 2px;
}

.attendance-history-timeline-body {
  flex: 1;
  min-width: 0;
  padding-bottom: 18px;
}

.attendance-history-timeline-head {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.attendance-history-timeline-label {
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.attendance-history-timeline-time {
  font-size: 14px;
}

.attendance-history-timeline-time.is-empty {
  color: var(--el-text-color-placeholder);
  font-size: 16px;
  font-weight: 400;
}

.attendance-history-timeline-addr {
  align-items: flex-start;
  color: var(--el-text-color-secondary);
  display: flex;
  font-size: 12px;
  gap: 4px;
  line-height: 1.45;
  margin-top: 6px;
  word-break: break-all;
}

.attendance-history-timeline-addr-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.attendance-history-empty {
  color: var(--el-text-color-placeholder);
}

/* ── 响应式（打卡区相关在前，与上方结构顺序一致）── */
@media (max-width: 640px) {
}
</style>
