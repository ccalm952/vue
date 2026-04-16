<template>
  <div class="workbench-page scrollbar-hide">
    <!-- 顶部：今日患者 / 今日任务 / 技加工 -->
    <el-row :gutter="16" class="summary-row">
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="summary-card">
          <div class="summary-card-head">
            <div class="summary-card-title">今日患者</div>
          </div>
          <div class="summary-sub">
            <div class="sub-line">
              <span>待就诊</span>
              <el-tag size="small" type="info">{{ summary.pendingVisit }}</el-tag>
            </div>
            <div class="sub-line">
              <span>待治疗完成</span>
              <el-tag size="small" type="info">{{ summary.pendingTreatment }}</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="summary-card">
          <div class="summary-card-head">
            <div class="summary-card-title">今日任务</div>
          </div>
          <div class="summary-sub">
            <div class="sub-line">
              <span>待写病历</span>
              <el-tag size="small" type="warning">{{ tasks.pendingRecord }}</el-tag>
            </div>
            <div class="sub-line">
              <span>待整改病历</span>
              <el-tag size="small" type="warning">{{ tasks.pendingFix }}</el-tag>
            </div>
            <div class="sub-line">
              <span>待回访</span>
              <el-tag size="small" type="warning">{{ tasks.pendingFollow }}</el-tag>
            </div>
            <div class="sub-line">
              <span>待评价打卡</span>
              <el-tag size="small" type="warning">{{ tasks.pendingEval }}</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="summary-card">
          <div class="summary-card-head">
            <div class="summary-card-title">技加工</div>
          </div>
          <div class="summary-sub">
            <div class="sub-line">
              <span>订单待确认</span>
              <el-tag size="small">{{ lab.pendingConfirm }}</el-tag>
            </div>
            <div class="sub-line">
              <span>待回执</span>
              <el-tag size="small">{{ lab.pendingReceipt }}</el-tag>
            </div>
            <div class="sub-line">
              <span>待验收</span>
              <el-tag size="small">{{ lab.pendingAccept }}</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 今日工作 + 个人业绩 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="24" :lg="14">
        <el-card shadow="never" class="block-card">
          <template #header>
            <span class="block-title">今日工作</span>
          </template>
          <div class="work-stats-grid">
            <div class="ws-item">
              <div class="ws-label">初诊</div>
              <div class="ws-num">{{ workStats.firstVisit }}</div>
            </div>
            <div class="ws-item">
              <div class="ws-label">复诊</div>
              <div class="ws-num">{{ workStats.followVisit }}</div>
            </div>
            <div class="ws-item">
              <div class="ws-label">总诊次</div>
              <div class="ws-num primary">{{ workStats.totalVisit }}</div>
            </div>
            <div class="ws-item">
              <div class="ws-label">新增预约</div>
              <div class="ws-num">{{ workStats.newAppt }}</div>
            </div>
            <div class="ws-item">
              <div class="ws-label">处方总数</div>
              <div class="ws-num muted">—</div>
            </div>
            <div class="ws-item">
              <div class="ws-label">今日实收</div>
              <div class="ws-num muted">—</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="10">
        <el-card shadow="never" class="block-card performance-card">
          <template #header>
            <span class="block-title">个人业绩</span>
          </template>
          <el-tabs v-model="perfTab" class="perf-tabs">
            <el-tab-pane label="现金实收" name="cash" />
            <el-tab-pane label="诊疗服务" name="service" />
            <el-tab-pane label="排行" name="rank" />
          </el-tabs>
          <div class="perf-body">
            <div class="perf-row">
              <span>本月收入</span>
              <strong>¥ {{ performance.monthIncome.toFixed(2) }}</strong>
            </div>
            <el-progress
              class="perf-progress"
              :percentage="performance.progress"
              :stroke-width="10"
            />
            <div class="perf-row sub">
              <span>本月目标</span>
              <span>¥ {{ performance.monthGoal.toFixed(2) }}</span>
            </div>
            <p class="perf-hint">本月收入为收费单中「收费人」与本人姓名一致的实付合计</p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 今日就诊 / 今日随访 -->
    <el-card shadow="never" class="table-card">
      <el-tabs v-model="mainTab" @tab-change="onMainTabChange">
        <el-tab-pane :label="`今日就诊 (${todayAppointments.length})`" name="visit" />
        <el-tab-pane :label="`今日随访 (${followUpCount})`" name="follow" />
      </el-tabs>

      <div class="table-toolbar">
        <el-date-picker
          v-model="filterDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          style="width: 160px"
        />
        <el-checkbox-group v-model="filterChecks" class="filter-checks">
          <el-checkbox value="appt">包含预约</el-checkbox>
          <el-checkbox value="left">包含已离开</el-checkbox>
          <el-checkbox value="noreg">包含未挂号</el-checkbox>
        </el-checkbox-group>
        <div class="table-toolbar-right">
          <el-input
            v-model="tableKeyword"
            clearable
            placeholder="姓名 / 病历号 / 手机"
            class="table-toolbar-search"
            @clear="loadTodayData"
            @keyup.enter="loadTodayData"
          />
          <el-button type="primary" :loading="loading" @click="loadTodayData">刷新</el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="displayRows"
        stripe
        border
        empty-text="抱歉，暂无相关数据"
        class="workbench-table"
        max-height="480"
      >
        <el-table-column
          type="index"
          label="序号"
          width="64"
          align="center"
          header-align="center"
        />
        <el-table-column
          prop="patientName"
          label="姓名"
          min-width="100"
          header-align="center"
          show-overflow-tooltip
          align="center"
        />
        <el-table-column
          prop="appointmentTime"
          label="预约时间"
          min-width="150"
          align="center"
          header-align="center"
        />
        <el-table-column
          prop="visitType"
          label="就诊类型"
          width="100"
          align="center"
          header-align="center"
        />
        <el-table-column
          prop="doctorName"
          label="医生"
          width="100"
          align="center"
          header-align="center"
          show-overflow-tooltip
        />
        <el-table-column
          prop="items"
          label="预约项目"
          min-width="120"
          align="center"
          header-align="center"
          show-overflow-tooltip
          :formatter="itemsColumnFormatter"
        />
        <el-table-column
          prop="remark"
          label="备注"
          min-width="100"
          align="center"
          header-align="center"
          show-overflow-tooltip
        />
        <el-table-column
          label="操作"
          width="200"
          fixed="right"
          align="center"
          header-align="center"
        >
          <template #default="{ row }">
            <div class="table-actions">
              <el-button text bg type="primary" @click="goPatient(row)">患者</el-button>
              <el-button text bg type="primary" @click="router.push('/appointments')"
                >预约</el-button
              >
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { getWeekAppointmentsApi } from "@/api/appointment";
import { getMyMonthIncomeApi } from "@/api/billing";
import { formatAppointmentItemsDisplay } from "@/utils/appointment-items";

const router = useRouter();

interface ApptRow {
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

interface ApiResponse<T> {
  data: T;
}

interface MonthIncomeData {
  monthIncome: number;
}

const loading = ref(false);
const mainTab = ref("visit");
const filterDate = ref(todayStr());
const filterChecks = ref<string[]>(["appt"]);
const tableKeyword = ref("");
const todayAppointments = ref<ApptRow[]>([]);

const summary = ref({
  pendingVisit: 0,
  pendingTreatment: 0,
});

const tasks = ref({
  pendingRecord: 0,
  pendingFix: 0,
  pendingFollow: 0,
  pendingEval: 0,
});

const lab = ref({
  pendingConfirm: 0,
  pendingReceipt: 0,
  pendingAccept: 0,
});

const workStats = ref({
  firstVisit: 0,
  followVisit: 0,
  totalVisit: 0,
  newAppt: 0,
});

const performance = ref({
  monthIncome: 0,
  monthGoal: 100000,
  progress: 0,
});

const perfTab = ref("cash");

function itemsColumnFormatter(_row: ApptRow, _column: unknown, cellValue: unknown) {
  return formatAppointmentItemsDisplay(cellValue);
}

function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextDayStr(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + 1);
  return todayStr(dt);
}

function dayRangeQuery(dateStr: string) {
  const start = `${dateStr} 00:00:00`;
  const end = `${nextDayStr(dateStr)} 00:00:00`;
  return { start, end };
}

async function loadTodayData() {
  loading.value = true;
  try {
    const { start, end } = dayRangeQuery(filterDate.value || todayStr());
    const [apptRes, incomeRes] = await Promise.allSettled([
      getWeekAppointmentsApi(start, end),
      getMyMonthIncomeApi(),
    ]);

    if (apptRes.status === "fulfilled") {
      const res = apptRes.value as ApiResponse<ApptRow[]>;
      const list = (res?.data ?? []) as ApptRow[];
      todayAppointments.value = Array.isArray(list) ? list : [];
    } else {
      todayAppointments.value = [];
    }

    if (incomeRes.status === "fulfilled") {
      const res = incomeRes.value as ApiResponse<MonthIncomeData>;
      const v = Number(res?.data?.monthIncome);
      performance.value.monthIncome = Number.isFinite(v) ? v : 0;
    } else {
      performance.value.monthIncome = 0;
    }

    summary.value.pendingVisit = todayAppointments.value.length;
    summary.value.pendingTreatment = 0;

    workStats.value.totalVisit = todayAppointments.value.length;
    workStats.value.newAppt = todayAppointments.value.length;
    let first = 0;
    let fu = 0;
    for (const a of todayAppointments.value) {
      const vt = (a.visitType || "").trim();
      if (vt.includes("初诊")) first++;
      else if (vt.includes("复诊")) fu++;
    }
    workStats.value.firstVisit = first;
    workStats.value.followVisit = fu;

    performance.value.progress = Math.min(
      100,
      Math.round((performance.value.monthIncome / Math.max(performance.value.monthGoal, 1)) * 100),
    );
  } finally {
    loading.value = false;
  }
}

const followUpCount = ref(0);

const displayRows = computed(() => {
  if (mainTab.value === "follow") {
    return [] as ApptRow[];
  }
  let rows = todayAppointments.value;
  const kw = tableKeyword.value.trim();
  if (kw) {
    const k = kw.toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.patientName && r.patientName.toLowerCase().includes(k)) ||
        formatAppointmentItemsDisplay(r.items).toLowerCase().includes(k) ||
        String(r.patientId).includes(kw),
    );
  }
  return rows;
});

function onMainTabChange() {
  /* 随访 Tab 暂无接口，保持空表 */
}

function goPatient(row: ApptRow) {
  router.push(`/patient/${row.patientId}`);
}

watch(filterDate, () => {
  loadTodayData();
});

onMounted(() => {
  filterDate.value = todayStr();
  loadTodayData();
});
</script>

<style scoped>
.workbench-page {
  padding: 16px 20px 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.summary-row {
  margin-bottom: 16px;
}

.summary-row :deep(.el-col) {
  display: flex;
}

.summary-card {
  border-radius: 10px;
  flex: 1;
  width: 100%;
  min-height: 168px;
  display: flex;
  flex-direction: column;
}

.summary-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.summary-card-head {
  flex-shrink: 0;
  min-height: 44px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin: 0 0 10px;
  padding-bottom: 10px;
  box-sizing: border-box;
}

.summary-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.35;
  margin: 0;
}

.summary-sub {
  flex: 1;
  margin-top: 0;
  padding-top: 0;
  min-height: 0;
}

.summary-sub .sub-line + .sub-line {
  margin-top: 6px;
}

.sub-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.stats-row {
  margin-bottom: 16px;
}

.stats-row :deep(.el-col) {
  display: flex;
}

.block-card {
  border-radius: 10px;
  min-height: 200px;
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.block-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.block-title {
  font-weight: 600;
  font-size: 15px;
}

.work-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 16px;
  flex: 1;
  align-content: start;
}

.ws-item {
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 88px;
}

.ws-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  width: 100%;
}

.ws-num {
  font-size: 22px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.ws-num.primary {
  color: var(--el-color-primary);
}

.ws-num.muted {
  font-size: 16px;
  color: var(--el-text-color-placeholder);
}

.performance-card :deep(.el-card__body) {
  padding-top: 0;
}

.perf-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.perf-body {
  padding: 4px 0 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.perf-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 14px;
}

.perf-row strong {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.perf-progress {
  margin: 4px 0 12px;
}

.perf-row.sub {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-top: 0;
  margin-bottom: 0;
}

.perf-row.sub span:last-child {
  font-variant-numeric: tabular-nums;
}

.perf-hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.table-card {
  border-radius: 10px;
}

.table-card :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.table-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 12px;
  row-gap: 10px;
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 12px;
}

.filter-checks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.table-toolbar-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.table-toolbar-search {
  width: 220px;
}

.workbench-table {
  width: 100%;
}

.table-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .work-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .table-toolbar-right {
    margin-left: 0;
    width: 100%;
  }

  .table-toolbar-search {
    width: 100% !important;
  }
}
</style>
