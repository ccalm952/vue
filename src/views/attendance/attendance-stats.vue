<template>
  <div class="attendance-stats-page">
    <div class="attendance-stats-page__toolbar">
      <el-button text bg type="primary" @click="router.push('/attendance')">
        <el-icon><ArrowLeft /></el-icon> 返回打卡
      </el-button>
    </div>

    <el-card class="attendance-stats-page__filters-card" shadow="never">
      <div class="attendance-stats-page__filters">
        <span class="attendance-stats-page__filter-label">统计月份</span>
        <el-date-picker
          v-model="monthVal"
          type="month"
          placeholder="选择月份"
          value-format="YYYY-MM"
          :clearable="false"
        />
        <el-button type="primary" :loading="loading" @click="loadData">查询</el-button>
      </div>
    </el-card>

    <template v-if="summary">
      <el-card class="attendance-stats-page__summary-card" shadow="never">
        <template #header>
          <span class="attendance-stats-page__summary-title">{{ summary.month }} 考勤汇总</span>
          <span class="attendance-stats-page__summary-meta">
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
              <div class="attendance-stats-page__details">
                <div
                  v-if="detailLoading[row.userId]"
                  class="attendance-stats-page__details-loading"
                >
                  加载中...
                </div>
                <template v-else-if="row.userId in detailByUserId">
                  <template v-if="detailByUserId[row.userId]!.length">
                    <p class="attendance-stats-page__details-title">
                      有打卡记录的日期（{{ detailByUserId[row.userId]!.length }} 天）
                    </p>
                    <el-table
                      :data="detailByUserId[row.userId]"
                      stripe
                      size="small"
                      class="attendance-stats-page__details-table"
                      empty-text="暂无数据"
                    >
                      <el-table-column prop="date" label="日期" width="120" />
                      <el-table-column label="上午上班" width="100" align="center">
                        <template #default="{ row: r }">
                          <span
                            :class="{ 'attendance-stats-page__punch-time--missing': !r.morningIn }"
                            >{{ r.morningIn || "--:--" }}</span
                          >
                        </template>
                      </el-table-column>
                      <el-table-column label="上午下班" width="100" align="center">
                        <template #default="{ row: r }">
                          <span
                            :class="{ 'attendance-stats-page__punch-time--missing': !r.morningOut }"
                            >{{ r.morningOut || "--:--" }}</span
                          >
                        </template>
                      </el-table-column>
                      <el-table-column label="下午上班" width="100" align="center">
                        <template #default="{ row: r }">
                          <span
                            :class="{
                              'attendance-stats-page__punch-time--missing': !r.afternoonIn,
                            }"
                            >{{ r.afternoonIn || "--:--" }}</span
                          >
                        </template>
                      </el-table-column>
                      <el-table-column label="下午下班" width="100" align="center">
                        <template #default="{ row: r }">
                          <span
                            :class="{
                              'attendance-stats-page__punch-time--missing': !r.afternoonOut,
                            }"
                            >{{ r.afternoonOut || "--:--" }}</span
                          >
                        </template>
                      </el-table-column>
                      <el-table-column label="加班时长" width="130" align="center">
                        <template #default="{ row: r }">
                          <el-tag v-if="r.overtimeMinutes > 0" type="warning" size="small">
                            {{ r.overtimeStr }}
                          </el-tag>
                          <span v-else class="attendance-stats-page__text--muted">-</span>
                        </template>
                      </el-table-column>
                    </el-table>
                  </template>
                  <el-empty v-else description="本月无打卡记录" :image-size="72" />
                </template>
                <p
                  v-else-if="detailLoadFailed[row.userId]"
                  class="attendance-stats-page__details-retry"
                >
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
              <span
                :class="{ 'attendance-stats-page__text--danger': row.incompleteWorkdays > 0 }"
                >{{ row.incompleteWorkdays }}</span
              >
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
              <span v-else class="attendance-stats-page__text--muted">{{ row.overtimeStr }}</span>
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
}

interface ApiResponse<T> {
  data: T;
}

interface AttendanceRecord {
  date: string;
  type: string;
  punchTime: string;
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
    const res = (await getAttendanceRecordsApi({
      userId: row.userId,
      startDate: summary.value.startDate,
      endDate: summary.value.endDate,
    })) as ApiResponse<AttendanceRecord[]>;
    const records = res.data || [];
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
    const res = (await getAttendanceAdminMonthlySummaryApi({
      month: m,
      overtimeMorningEnd: shiftMerged.value.overtimeMorningNormalEnd,
      overtimeAfternoonEnd: shiftMerged.value.overtimeAfternoonNormalEnd,
    })) as ApiResponse<SummaryPayload>;
    summary.value = res.data;
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
  padding: 16px;
  max-width: 1400px;
  margin: auto;
  box-sizing: border-box;
}

.attendance-stats-page__toolbar {
  margin-bottom: 16px;
}

.attendance-stats-page__filters-card {
  border-radius: 12px;
  margin-bottom: 16px;
}

.attendance-stats-page__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.attendance-stats-page__filter-label {
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-regular);
}

.attendance-stats-page__summary-card {
  border-radius: 12px;
}

.attendance-stats-page__summary-card :deep(.el-card__header) {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 12px;
}

.attendance-stats-page__summary-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.attendance-stats-page__summary-meta {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.attendance-stats-page__details {
  padding: 8px 12px 12px 40px;
}

.attendance-stats-page__details-loading {
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
  padding: 8px 0;
}

.attendance-stats-page__details-title {
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
  margin: 0 0 10px;
}

.attendance-stats-page__details-table {
  max-width: 920px;
}

.attendance-stats-page__details-table .attendance-stats-page__punch-time--missing {
  color: var(--el-color-danger);
  font-size: var(--el-font-size-small);
}

.attendance-stats-page__details-retry {
  font-size: var(--el-font-size-small);
  color: var(--el-color-danger);
  margin: 0;
  padding: 8px 0;
}

.attendance-stats-page__text--danger {
  color: var(--el-color-danger);
  font-weight: 600;
}

.attendance-stats-page__text--muted {
  color: var(--el-text-color-placeholder);
}
</style>
