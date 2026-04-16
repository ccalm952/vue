<template>
  <div class="appt-board">
    <!-- 顶栏：周切换 + 日期范围 -->
    <div class="board-toolbar">
      <div class="board-toolbar-left">
        <el-button @click="prevWeek">上一周</el-button>
        <el-button @click="nextWeek">下一周</el-button>
        <el-button type="primary" @click="goThisWeek">回到本周</el-button>
      </div>
      <div class="board-toolbar-center">{{ rangeLabel }}</div>
    </div>

    <!-- 周视图表格 -->
    <div ref="gridWrapRef" class="board-grid-wrapper scrollbar-hide">
      <div v-show="showNowLine" class="now-line-layer" :style="{ top: `${nowLineTopPx}px` }">
        <span class="now-line-badge">{{ nowClock }}</span>
        <div class="now-line-track">
          <span class="now-line-dot" />
          <span class="now-line-bar" />
          <span class="now-line-dot" />
        </div>
      </div>
      <table class="board-grid" cellspacing="0" cellpadding="0">
        <thead>
          <tr>
            <th class="col-hour">时</th>
            <th class="col-min">分</th>
            <th v-for="d in weekDays" :key="d.key" class="col-day" :class="{ today: d.isToday }">
              <div class="day-label">{{ d.weekLabel }}</div>
              <div class="day-date">{{ d.shortDate }}</div>
            </th>
            <th class="col-min col-min-mirror">分</th>
            <th class="col-hour col-hour-mirror">时</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="slot in timeSlots" :key="slot.key" :class="{ 'hour-first': slot.min === 0 }">
            <td v-if="slot.min === 0" class="col-hour" rowspan="4">{{ slot.hour }}</td>
            <td class="col-min">{{ slot.minLabel }}</td>
            <td
              v-for="d in weekDays"
              :key="d.key + slot.key"
              class="col-day-cell"
              :class="{ today: d.isToday }"
            >
              <el-popover
                v-for="appt in getAppointmentsAt(d.dateStr, slot.hour, slot.min)"
                :key="appt.id"
                trigger="click"
                placement="bottom-start"
                :width="360"
                :teleported="true"
                popper-class="appt-summary-popper"
                @show="ensurePatientSummary(appt)"
              >
                <template #reference>
                  <div
                    class="appt-card-anchor"
                    :style="apptCardAnchorStyle(appt)"
                    :title="`${displayPatientName(appt)} - ${appt.doctorName}\n${appt.visitType} ${appt.duration}分钟`"
                    @click.stop
                  >
                    <div class="appt-card">
                      <div class="appt-card-head">
                        <span class="appt-card-head-text"
                          >{{ displayPatientName(appt) }}/初诊医生：{{ appt.doctorName }}</span
                        >
                      </div>
                      <div class="appt-card-body">
                        <span class="appt-card-record"
                          >病历号：{{ patientRecordLabel(appt.patientId) }}</span
                        >
                      </div>
                    </div>
                  </div>
                </template>
                <div class="appt-popover-panel">
                  <div class="appt-popover-title">患者信息</div>
                  <div class="appt-summary-body">
                    <div
                      v-for="row in patientPopoverRows(appt)"
                      :key="row.label"
                      class="appt-summary-row"
                    >
                      <span class="appt-summary-label">{{ row.label }}</span>
                      <span class="appt-summary-value">{{ row.value }}</span>
                    </div>
                  </div>
                  <div class="appt-popover-footer">
                    <el-button type="primary" plain @click="openModifyAppointment(appt)">
                      修改
                    </el-button>
                  </div>
                </div>
              </el-popover>
            </td>
            <td class="col-min col-min-mirror">{{ slot.minLabel }}</td>
            <td v-if="slot.min === 0" class="col-hour col-hour-mirror" rowspan="4">
              {{ slot.hour }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModifyAppointmentDialog
      v-model="modifyDialogVisible"
      :appointment="editingAppointment"
      :patient="editingPatientDisplay"
      @saved="onModifySaved"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
  defineAsyncComponent,
} from "vue";
import { getWeekAppointmentsApi } from "@/api/appointment";
import { getPatientDetailApi } from "@/api/patient";
import { forEachWithConcurrency } from "@/utils/concurrency";

/** 修改弹窗体积大，异步加载以缩短预约页首屏 JS 解析与请求前的等待 */
const ModifyAppointmentDialog = defineAsyncComponent(
  () => import("@/components/appointment/ModifyAppointmentDialog.vue"),
);

interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  visitType: string;
  appointmentTime: string;
  duration: number;
  doctorId: string;
  doctorName: string;
  items: string;
  remark: string;
}

const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
const MINUTES = [0, 15, 30, 45];

/** 与 .col-hour + .col-min 宽度一致，用于「此刻」红线对齐日期区 */
const TIME_AXIS_W = 36 + 32;
const timeAxisWidthCss = `${TIME_AXIS_W}px`;

const weekOffset = ref(0);
const appointments = ref<Appointment[]>([]);

interface PatientSummary {
  name: string;
  source: string;
  phone: string;
  birthday: string;
  age: string | number;
}

interface ApiResponse<T> {
  data: T;
}

const DASH = "—";

const EMPTY_PATIENT_SUMMARY = (): PatientSummary => ({
  name: "",
  source: DASH,
  phone: DASH,
  birthday: DASH,
  age: DASH,
});

/** 接口患者详情 → 统一结构（prefetch / ensure 共用） */
function patientSummaryFromApi(
  p: Record<string, unknown> | null | undefined,
): PatientSummary | null {
  if (!p) return null;
  const rawAge = p.age;
  const age: string | number =
    typeof rawAge === "string" || typeof rawAge === "number" ? rawAge : DASH;
  return {
    name: typeof p.name === "string" ? p.name : "",
    source: typeof p.source === "string" && p.source ? p.source : DASH,
    phone: typeof p.phone === "string" && p.phone ? p.phone : DASH,
    birthday: typeof p.birthday === "string" && p.birthday ? p.birthday : DASH,
    age,
  };
}

const PATIENT_POPOVER_ROWS: { key: keyof PatientSummary; label: string }[] = [
  { key: "name", label: "姓名" },
  { key: "source", label: "病历号" },
  { key: "phone", label: "手机" },
  { key: "birthday", label: "出生日期" },
  { key: "age", label: "年龄" },
];

const patientSummaryById = ref<Record<number, PatientSummary>>({});

/** 周数据刷新时递增，丢弃过期的预取结果，避免快速切周时写回旧缓存 */
let patientPrefetchEpoch = 0;
const PATIENT_PREFETCH_CONCURRENCY = 6;

const modifyDialogVisible = ref(false);
const editingAppointment = ref<Appointment | null>(null);

/** 预约 + 缓存档案合并为一条展示用摘要 */
function mergeSummaryForAppointment(appt: Appointment): PatientSummary {
  const p = patientSummaryById.value[appt.patientId];
  const name =
    p?.name != null && String(p.name).trim() !== "" ? String(p.name).trim() : appt.patientName;
  return {
    name,
    source: p?.source ?? DASH,
    phone: p?.phone ?? DASH,
    birthday: p?.birthday ?? DASH,
    age: p?.age ?? DASH,
  };
}

function patientPopoverRows(appt: Appointment) {
  const s = mergeSummaryForAppointment(appt);
  return PATIENT_POPOVER_ROWS.map((r) => ({
    label: r.label,
    value: String(s[r.key]),
  }));
}

const editingPatientDisplay = computed(() => {
  const a = editingAppointment.value;
  if (!a) return { name: "", phone: "", source: "" };
  const s = mergeSummaryForAppointment(a);
  return { name: s.name, phone: String(s.phone), source: String(s.source) };
});

function openModifyAppointment(appt: Appointment) {
  ensurePatientSummary(appt);
  editingAppointment.value = appt;
  modifyDialogVisible.value = true;
}

async function onModifySaved() {
  editingAppointment.value = null;
  await fetchAppointments();
}

/** 卡片/气泡统一用合并后的姓名（与 mergeSummaryForAppointment 一致） */
function displayPatientName(appt: Appointment) {
  return mergeSummaryForAppointment(appt).name;
}

function patientRecordLabel(patientId: number) {
  const src = patientSummaryById.value[patientId]?.source;
  return src && src !== DASH ? src : "···";
}

async function prefetchPatientSummaries(forAppointments: readonly Appointment[], epoch: number) {
  const ids = [
    ...new Set(forAppointments.map((a) => a.patientId).filter((x) => Number(x))),
  ] as number[];
  const next: Record<number, PatientSummary> = { ...patientSummaryById.value };
  await forEachWithConcurrency(ids, PATIENT_PREFETCH_CONCURRENCY, async (id) => {
    try {
      const res = (await getPatientDetailApi(id)) as ApiResponse<Record<string, unknown>>;
      const s = patientSummaryFromApi(res.data);
      if (s) next[id] = s;
      else next[id] = EMPTY_PATIENT_SUMMARY();
    } catch {
      next[id] = EMPTY_PATIENT_SUMMARY();
    }
  });
  if (epoch !== patientPrefetchEpoch) return;
  patientSummaryById.value = next;
}

/** 打开气泡时总是拉取最新患者档案，避免列表缓存停留在改名前 */
async function ensurePatientSummary(appt: Appointment) {
  try {
    const res = (await getPatientDetailApi(appt.patientId)) as ApiResponse<Record<string, unknown>>;
    const s = patientSummaryFromApi(res.data);
    if (s) {
      patientSummaryById.value = { ...patientSummaryById.value, [appt.patientId]: s };
    }
  } catch {
    /* */
  }
}

function getMondayOfWeek(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff + offset * 7);
  return monday;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

const mondayDate = computed(() => getMondayOfWeek(weekOffset.value));

const weekDays = computed(() => {
  const mon = mondayDate.value;
  const todayStr = formatDate(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mon, i);
    const dateStr = formatDate(d);
    return {
      key: dateStr,
      dateStr,
      weekLabel: WEEKDAY_NAMES[d.getDay()],
      shortDate: `${d.getMonth() + 1}/${d.getDate()}`,
      isToday: dateStr === todayStr,
    };
  });
});

const rangeLabel = computed(() => {
  const mon = mondayDate.value;
  const sun = addDays(mon, 6);
  return `${mon.getMonth() + 1}月${mon.getDate()}日 - ${sun.getMonth() + 1}月${sun.getDate()}日`;
});

const timeSlots = computed(() => {
  const slots: { key: string; hour: number; min: number; minLabel: string }[] = [];
  for (const h of HOURS) {
    for (const m of MINUTES) {
      slots.push({
        key: `${h}-${m}`,
        hour: h,
        min: m,
        minLabel: pad2(m),
      });
    }
  }
  return slots;
});

function parseApptTime(appt: Appointment) {
  const t = appt.appointmentTime;
  const d = new Date(t);
  return { dateStr: formatDate(d), hour: d.getHours(), min: d.getMinutes() };
}

function getStartSlotMin(min: number) {
  if (min < 15) return 0;
  if (min < 30) return 15;
  if (min < 45) return 30;
  return 45;
}

/** 按「日期 + 整点 + 15 分钟槽」聚合，避免表格每个格子都对全量 appointments 做 filter（约 364 格 × N 次） */
const appointmentsByCellKey = computed(() => {
  const map = new Map<string, Appointment[]>();
  for (const a of appointments.value) {
    const { dateStr, hour, min: am } = parseApptTime(a);
    const slotMin = getStartSlotMin(am);
    const key = `${dateStr}\0${hour}\0${slotMin}`;
    const list = map.get(key);
    if (list) list.push(a);
    else map.set(key, [a]);
  }
  return map;
});

function getAppointmentsAt(dateStr: string, hour: number, slotMin: number) {
  const key = `${dateStr}\0${hour}\0${slotMin}`;
  return appointmentsByCellKey.value.get(key) ?? [];
}

// 与样式中 .appt-board --appt-grid-row-h / .col-day-cell 一致
const ROW_H = 28;
/** 卡片相对「整块占用行」上下留白；垂直为 0 以便标签头高度与表格行高一致 */
const APPT_INSET_Y = 0;
const APPT_INSET_X = 2;

/** 占位锚点（Popover 触发器需有非零尺寸） */
function apptCardAnchorStyle(appt: Appointment) {
  const rows = Math.max(1, Math.ceil(appt.duration / 15));
  const blockH = rows * ROW_H;
  const innerH = blockH - APPT_INSET_Y * 2;
  const top = APPT_INSET_Y;
  return {
    position: "absolute" as const,
    left: `${APPT_INSET_X}px`,
    right: `${APPT_INSET_X}px`,
    top: `${top}px`,
    height: `${innerH}px`,
    zIndex: 1,
  };
}

const gridWrapRef = ref<HTMLElement | null>(null);
const showNowLine = ref(false);
const nowLineTopPx = ref(0);
const nowClock = ref("");

/** 从 8:00 起算的分钟数，网格右边界为 21:00（最后一格结束） */
function minutesFromGridStart(now: Date) {
  const startH = HOURS[0] ?? 8;
  return (now.getHours() - startH) * 60 + now.getMinutes();
}

const GRID_END_MIN = HOURS.length * 60;

function syncNowLine() {
  const wrap = gridWrapRef.value;
  const now = new Date();
  nowClock.value = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  if (!wrap || !weekDays.value.some((d) => d.isToday)) {
    showNowLine.value = false;
    return;
  }

  const m0 = minutesFromGridStart(now);
  if (m0 < 0 || m0 > GRID_END_MIN) {
    showNowLine.value = false;
    return;
  }

  const thead = wrap.querySelector(".board-grid thead") as HTMLElement | null;
  const theadH = thead?.offsetHeight ?? 56;
  nowLineTopPx.value = theadH + (m0 / 15) * ROW_H;
  showNowLine.value = true;
}

let nowLineTimer: ReturnType<typeof setInterval> | null = null;
let resizeObs: ResizeObserver | null = null;

function prevWeek() {
  weekOffset.value--;
}
function nextWeek() {
  weekOffset.value++;
}
function goThisWeek() {
  weekOffset.value = 0;
}

async function fetchAppointments() {
  patientPrefetchEpoch++;
  const prefetchEpoch = patientPrefetchEpoch;
  const mon = mondayDate.value;
  const start = formatDate(mon);
  const end = formatDate(addDays(mon, 7));
  try {
    const res = (await getWeekAppointmentsApi(start, end)) as ApiResponse<Appointment[]>;
    const list: Appointment[] = res.data || [];
    appointments.value = list;
    // 不阻塞首屏；限制并发 + epoch 避免切周竞态与浏览器/服务端被瞬时打满
    void prefetchPatientSummaries(list, prefetchEpoch);
  } catch {
    /* */
  }
}

watch(weekOffset, () => fetchAppointments());

watch([weekOffset, weekDays], () => nextTick(syncNowLine));

onMounted(() => {
  fetchAppointments();
  nextTick(syncNowLine);
  nowLineTimer = setInterval(syncNowLine, 30_000);
  const el = gridWrapRef.value;
  if (el && typeof ResizeObserver !== "undefined") {
    resizeObs = new ResizeObserver(() => syncNowLine());
    resizeObs.observe(el);
  }
});

onBeforeUnmount(() => {
  if (nowLineTimer) clearInterval(nowLineTimer);
  resizeObs?.disconnect();
});
</script>

<style scoped>
.appt-board {
  --appt-grid-row-h: 28px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 16px;
  box-sizing: border-box;
}

.board-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
  min-height: 32px;
}

.board-toolbar-left {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.board-toolbar-center {
  flex: 1;
  text-align: center;
  font-size: 16px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.board-grid-wrapper {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
}

.now-line-layer {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 5;
  height: 0;
  pointer-events: none;
  transform: translateY(-50%);
}

.now-line-badge {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  padding: 2px 6px;
  border-radius: 3px;
  background: #f56c6c;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.now-line-track {
  box-sizing: border-box;
  margin-left: v-bind(timeAxisWidthCss);
  margin-right: v-bind(timeAxisWidthCss);
  display: flex;
  align-items: center;
  height: 2px;
}

.now-line-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #f56c6c;
}

.now-line-bar {
  flex: 1;
  height: 2px;
  background: #f56c6c;
}

.board-grid {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.board-grid thead {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
}

.board-grid th,
.board-grid td {
  box-sizing: border-box;
  border: 1px solid #ebeef5;
  text-align: center;
  font-size: var(--el-font-size-extra-small);
  color: #606266;
}

.board-grid th {
  padding: 8px 4px;
  font-weight: 600;
  background: #fafafa;
}

.col-hour {
  width: 36px;
  font-size: var(--el-font-size-small);
  font-weight: 600;
  color: #303133;
  vertical-align: middle;
}

.col-min {
  width: 32px;
  font-size: var(--el-font-size-extra-small);
  color: #909399;
}

/* 与左侧对称：紧邻日期列，略强调分隔 */
.col-min-mirror {
  border-left: 1px solid #dcdfe6;
}

.col-day {
  min-width: 100px;
}

.col-day.today {
  background: #ecf5ff;
}

.day-label {
  font-size: var(--el-font-size-small);
}

.day-date {
  font-size: var(--el-font-size-extra-small);
  color: #909399;
}

.col-day-cell {
  height: var(--appt-grid-row-h, 28px);
  padding: 0;
  position: relative;
  vertical-align: top;
  overflow: visible;
}

.col-day-cell.today {
  background: #fafcff;
}

tr.hour-first td {
  border-top: 1px solid #dcdfe6;
}

.appt-card-anchor {
  cursor: pointer;
}

.appt-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #e8e8e8de;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.15s;
  box-sizing: border-box;
}

.appt-card:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.appt-card-head {
  flex-shrink: 0;
  height: var(--appt-grid-row-h, 28px);
  min-height: var(--appt-grid-row-h, 28px);
  box-sizing: border-box;
  padding: 0 6px;
  background: #ffe58f;
  border-radius: 5px 5px 0 0;
  display: flex;
  align-items: center;
}

.appt-card-head-text {
  font-size: 16px;
  color: #303133;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.appt-card-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  gap: 0;
  padding: 0 6px;
  background: #fff;
  border-radius: 0 0 5px 5px;
  box-sizing: border-box;
}

.appt-card-record {
  display: block;
  font-size: 16px;
  font-weight: 500;
  color: #606266;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.appt-summary-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.appt-summary-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: var(--el-font-size-base);
}

.appt-summary-label {
  flex: 0 0 72px;
  color: #909399;
}

.appt-summary-value {
  flex: 1;
  color: #303133;
  word-break: break-all;
}

.appt-popover-panel {
  padding: 0;
}

.appt-popover-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 10px;
}

.appt-popover-footer {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
  text-align: right;
}
</style>

<!-- teleported 浮层，需非 scoped 覆盖 popper 根节点 -->
<style>
.appt-summary-popper.el-popper {
  padding: 12px 14px 10px;
  border-radius: 8px;
}
</style>
