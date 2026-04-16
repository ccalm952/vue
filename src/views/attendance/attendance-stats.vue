<template>
  <div class="attendance-stats-page">
    <div class="stats-toolbar">
      <el-button text bg type="primary" @click="router.push('/attendance')">
        <el-icon><ArrowLeft /></el-icon> 返回打卡
      </el-button>
    </div>

    <el-card class="stats-filter-card" shadow="never">
      <div class="filter-row">
        <span class="filter-label">统计月份</span>
        <el-date-picker
          v-model="monthVal"
          type="month"
          placeholder="选择月份"
          value-format="YYYY-MM"
          :clearable="false"
        />
        <el-button type="primary" :loading="loading" @click="loadData">查询</el-button>
      </div>
      <p class="filter-hint">
        工作日按周一至周五计算；加班时长按当前「班次时间配置」中的正常下班时刻起算（与打卡页一致）。
      </p>
    </el-card>

    <template v-if="summary">
      <el-alert
        v-if="summary.noRecordInMonth.length"
        type="warning"
        show-icon
        :closable="false"
        class="stats-alert"
      >
        <template #title
          >本月无任何打卡记录的员工（{{ summary.noRecordInMonth.length }} 人）</template
        >
        <div class="name-tags">
          <el-tag
            v-for="p in summary.noRecordInMonth"
            :key="p.userId"
            type="info"
            effect="plain"
            size="small"
          >
            {{ p.name }}（{{ p.role }}）
          </el-tag>
        </div>
      </el-alert>

      <el-card class="stats-table-card" shadow="never">
        <template #header>
          <span class="card-head-title">{{ summary.month }} 考勤汇总</span>
          <span class="card-head-meta">
            工作日 {{ summary.workdayCount }} 天 · 加班起算：上午 {{ summary.overtimeMorningEnd }} /
            下午 {{ summary.overtimeAfternoonEnd }}
          </span>
        </template>
        <el-table
          :data="summary.employees"
          stripe
          border
          style="width: 100%"
          row-key="userId"
          @expand-change="onExpandChange"
        >
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="expand-detail">
                <div v-if="detailLoading[row.userId]" class="expand-loading">加载中…</div>
                <template v-else-if="row.userId in detailByUserId">
                  <template v-if="detailByUserId[row.userId]!.length">
                    <p class="expand-detail-title">
                      有打卡记录的日期（{{ detailByUserId[row.userId]!.length }} 天）
                    </p>
                    <el-table
                      :data="detailByUserId[row.userId]"
                      stripe
                      size="small"
                      class="expand-punch-table"
                      empty-text="暂无数据"
                    >
                      <el-table-column prop="date" label="日期" width="120" />
                      <el-table-column label="上午上班" width="100" align="center">
                        <template #default="{ row: r }">
                          <span :class="{ missing: !r.morningIn }">{{
                            r.morningIn || "--:--"
                          }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="上午下班" width="100" align="center">
                        <template #default="{ row: r }">
                          <span :class="{ missing: !r.morningOut }">{{
                            r.morningOut || "--:--"
                          }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="下午上班" width="100" align="center">
                        <template #default="{ row: r }">
                          <span :class="{ missing: !r.afternoonIn }">{{
                            r.afternoonIn || "--:--"
                          }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="下午下班" width="100" align="center">
                        <template #default="{ row: r }">
                          <span :class="{ missing: !r.afternoonOut }">{{
                            r.afternoonOut || "--:--"
                          }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="加班时长" width="130" align="center">
                        <template #default="{ row: r }">
                          <el-tag v-if="r.overtimeMinutes > 0" type="warning" size="small">
                            {{ r.overtimeStr }}
                          </el-tag>
                          <span v-else class="text-muted">-</span>
                        </template>
                      </el-table-column>
                    </el-table>
                  </template>
                  <el-empty v-else description="本月无打卡记录" :image-size="72" />
                </template>
                <p v-else-if="detailLoadFailed[row.userId]" class="expand-retry-hint">
                  加载失败，请收起本行后重新展开重试
                </p>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="姓名" width="100" fixed />
          <el-table-column prop="role" label="角色" width="100" />
          <el-table-column prop="workdayCount" label="工作日数" width="96" align="center" />
          <el-table-column prop="fullPunchWorkdays" label="满勤工作日" width="110" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.fullPunchWorkdays === row.workdayCount" type="success" size="small">
                {{ row.fullPunchWorkdays }}
              </el-tag>
              <span v-else>{{ row.fullPunchWorkdays }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="incompleteWorkdays" label="缺卡工作日" width="110" align="center">
            <template #default="{ row }">
              <span :class="{ 'text-danger': row.incompleteWorkdays > 0 }">{{
                row.incompleteWorkdays
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="distinctPunchDays"
            label="有打卡的天数"
            width="120"
            align="center"
          />
          <el-table-column label="加班时长" width="130" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.totalOvertimeMinutes > 0" type="warning" size="small">
                {{ row.overtimeStr }}
              </el-tag>
              <span v-else class="text-muted">{{ row.overtimeStr }}</span>
            </template>
          </el-table-column>
          <el-table-column label="本月是否有打卡" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="row.monthHasAnyRecord ? 'success' : 'info'" size="small">
                {{ row.monthHasAnyRecord ? "有" : "无" }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft } from "@element-plus/icons-vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth-store";
import { useAttendanceShiftStore } from "@/stores/attendance-shift-store";
import { getAttendanceAdminMonthlySummaryApi, getAttendanceRecordsApi } from "@/api/attendance";
import { minutesFromMidnight, type AttendanceShiftFullConfig } from "@/config/attendance-shift";

const router = useRouter();
const authStore = useAuthStore();
const shiftStore = useAttendanceShiftStore();
const { merged: shiftMerged } = storeToRefs(shiftStore);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function defaultMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

const monthVal = ref(defaultMonth());
const loading = ref(false);

interface NoRecordRow {
  userId: number;
  name: string;
  role: string;
}

interface EmployeeRow {
  userId: number;
  name: string;
  role: string;
  workdayCount: number;
  fullPunchWorkdays: number;
  incompleteWorkdays: number;
  missingWorkdayDates: string[];
  distinctPunchDays: number;
  totalOvertimeMinutes: number;
  overtimeStr: string;
  monthHasAnyRecord: boolean;
}

interface SummaryPayload {
  month: string;
  startDate: string;
  endDate: string;
  workdayCount: number;
  overtimeMorningEnd: string;
  overtimeAfternoonEnd: string;
  employees: EmployeeRow[];
  noRecordInMonth: NoRecordRow[];
}

const summary = ref<SummaryPayload | null>(null);

/** 仅含当日至少有一条打卡的日期；与打卡页历史表列一致 */
interface PunchDayRow {
  date: string;
  morningIn: string | null;
  morningOut: string | null;
  afternoonIn: string | null;
  afternoonOut: string | null;
  overtimeMinutes: number;
  overtimeStr: string;
}

const detailByUserId = ref<Record<number, PunchDayRow[]>>({});
const detailLoading = ref<Record<number, boolean>>({});
const detailLoadFailed = ref<Record<number, boolean>>({});

function timeHHMMFromRecord(r: { punchTime: string }): string {
  const d = new Date(r.punchTime);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

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

function buildPunchDayRows(
  records: Array<{ date: string; type: string; punchTime: string }>,
  shift: AttendanceShiftFullConfig,
): PunchDayRow[] {
  const grouped: Record<string, Record<string, (typeof records)[0]>> = {};
  for (const r of records) {
    const dateKey = r.date;
    if (!grouped[dateKey]) grouped[dateKey] = {};
    grouped[dateKey][r.type] = r;
  }
  const morningEndMin = minutesFromMidnight(shift.overtimeMorningNormalEnd);
  const afternoonEndMin = minutesFromMidnight(shift.overtimeAfternoonNormalEnd);

  const rows: PunchDayRow[] = [];
  for (const [date, recs] of Object.entries(grouped)) {
    const hasAny = ["morning_in", "morning_out", "afternoon_in", "afternoon_out"].some(
      (t) => recs[t],
    );
    if (!hasAny) continue;

    const mOut = recs.morning_out ? timeHHMMFromRecord(recs.morning_out) : null;
    const aOut = recs.afternoon_out ? timeHHMMFromRecord(recs.afternoon_out) : null;
    const ot = calcOvertimeMinutes(mOut, aOut, morningEndMin, afternoonEndMin);
    rows.push({
      date,
      morningIn: recs.morning_in ? timeHHMMFromRecord(recs.morning_in) : null,
      morningOut: mOut,
      afternoonIn: recs.afternoon_in ? timeHHMMFromRecord(recs.afternoon_in) : null,
      afternoonOut: aOut,
      overtimeMinutes: ot,
      overtimeStr: formatOvertime(ot),
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

async function onExpandChange(row: EmployeeRow, expandedRows: EmployeeRow[]) {
  const open = expandedRows.some((r) => r.userId === row.userId);
  if (!open || !summary.value) return;
  if (row.userId in detailByUserId.value) return;
  detailLoading.value[row.userId] = true;
  detailLoadFailed.value[row.userId] = false;
  try {
    const res: any = await getAttendanceRecordsApi({
      userId: row.userId,
      startDate: summary.value.startDate,
      endDate: summary.value.endDate,
    });
    const records = (res.data || []) as Array<{ date: string; type: string; punchTime: string }>;
    detailByUserId.value[row.userId] = buildPunchDayRows(records, shiftMerged.value);
  } catch {
    detailLoadFailed.value[row.userId] = true;
    /* 拦截器已提示；不写入 detailByUserId 以便重试 */
  } finally {
    detailLoading.value[row.userId] = false;
  }
}

async function ensureAdmin() {
  if (!authStore.userInfo) {
    try {
      await authStore.fetchUserInfo();
    } catch {
      router.replace("/login");
      return false;
    }
  }
  if (authStore.userInfo?.role !== "管理员") {
    ElMessage.warning("仅管理员可查看考勤统计");
    router.replace("/attendance");
    return false;
  }
  return true;
}

async function loadData() {
  if (!(await ensureAdmin())) return;
  const m = monthVal.value;
  if (!m) {
    ElMessage.warning("请选择月份");
    return;
  }
  loading.value = true;
  try {
    const res: any = await getAttendanceAdminMonthlySummaryApi({
      month: m,
      overtimeMorningEnd: shiftMerged.value.overtimeMorningNormalEnd,
      overtimeAfternoonEnd: shiftMerged.value.overtimeAfternoonNormalEnd,
    });
    summary.value = res.data as SummaryPayload;
    detailByUserId.value = {};
    detailLoading.value = {};
    detailLoadFailed.value = {};
  } catch {
    summary.value = null;
    detailByUserId.value = {};
    detailLoading.value = {};
    detailLoadFailed.value = {};
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!(await ensureAdmin())) return;
  await loadData();
});
</script>

<style scoped>
.attendance-stats-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  box-sizing: border-box;
}

.stats-toolbar {
  margin-bottom: 16px;
}

.stats-filter-card {
  border-radius: 12px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-regular);
}

.filter-hint {
  margin: 12px 0 0;
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.stats-alert {
  margin-bottom: 16px;
  border-radius: 10px;
}

.name-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.stats-table-card {
  border-radius: 12px;
}

.stats-table-card :deep(.el-card__header) {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 12px;
}

.card-head-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.card-head-meta {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.expand-detail {
  padding: 8px 12px 12px 40px;
}

.expand-loading {
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
  padding: 8px 0;
}

.expand-detail-title {
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
  margin: 0 0 10px;
}

.expand-punch-table {
  max-width: 920px;
}

.expand-punch-table .missing {
  color: var(--el-color-danger);
  font-size: var(--el-font-size-small);
}

.expand-retry-hint {
  font-size: var(--el-font-size-small);
  color: var(--el-color-danger);
  margin: 0;
  padding: 8px 0;
}

.text-danger {
  color: var(--el-color-danger);
  font-weight: 600;
}

.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
