<template>
  <div class="revenue-page scrollbar-hide">
    <div class="revenue-toolbar">
      <el-radio-group v-model="queryMode" size="default">
        <el-radio-button value="day">日查询</el-radio-button>
        <el-radio-button value="month">月查询</el-radio-button>
      </el-radio-group>
      <el-date-picker
        v-if="queryMode === 'day'"
        v-model="dateRangeDay"
        type="daterange"
        :id="['revenue-analysis-day-range-start', 'revenue-analysis-day-range-end']"
        :name="['revenue_analysis_day_range_start', 'revenue_analysis_day_range_end']"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        class="revenue-date"
      />
      <el-date-picker
        v-else
        v-model="dateRangeMonth"
        type="monthrange"
        :id="['revenue-analysis-month-range-start', 'revenue-analysis-month-range-end']"
        :name="['revenue_analysis_month_range_start', 'revenue_analysis_month_range_end']"
        value-format="YYYY-MM"
        range-separator="至"
        start-placeholder="开始月份"
        end-placeholder="结束月份"
        class="revenue-date"
      />
      <el-button type="primary" :icon="Search" :loading="loading" @click="runQuery">查询</el-button>
    </div>

    <div class="revenue-summary">
      <div class="revenue-summary-line">
        <span class="revenue-summary-label">实收总额</span>
        <span class="revenue-summary-value"
          >¥
          {{
            totalActual.toLocaleString("zh-CN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          }}</span
        >
        <el-tooltip
          content="统计所选日期范围内收费记录的实付合计；按员工维度时按「收费人」与员工姓名对应汇总。"
          placement="top"
        >
          <el-icon class="revenue-summary-tip"><QuestionFilled /></el-icon>
        </el-tooltip>
      </div>
      <div class="revenue-summary-sub muted">所选区间：{{ rangeLabel }}</div>
    </div>

    <div class="revenue-chart-card">
      <el-radio-group v-model="chartDimension" size="default" class="revenue-dimension">
        <el-radio-button value="staff">员工实收分布</el-radio-button>
        <el-radio-button value="feeSub">收费小类实收分布</el-radio-button>
      </el-radio-group>
      <p class="revenue-chart-hint">点击饼图扇区查看对应收费明细</p>
      <div ref="chartRef" class="revenue-chart" />
    </div>

    <el-dialog
      v-model="detailVisible"
      title="详细列表"
      width="92%"
      destroy-on-close
      class="revenue-detail-dialog"
      @closed="onDetailClosed"
    >
      <div v-if="detailSliceLabel" class="revenue-detail-sub">{{ detailSliceLabel }}</div>
      <p v-if="detailHasOrphanPatient" class="revenue-detail-warn">
        部分行无患者档案：通常为患者已不在库中但收费记录仍在（例如直接在数据库删患者、或旧数据）。通过本系统「删除患者」会同时删除其收费记录。
      </p>
      <el-table
        v-loading="detailLoading"
        :data="detailRows"
        border
        stripe
        max-height="480"
        class="revenue-detail-table"
      >
        <el-table-column prop="chargeTime" label="收费时间" min-width="150" />
        <el-table-column prop="patientSource" label="病历号" width="110" show-overflow-tooltip />
        <el-table-column
          prop="patientName"
          label="患者姓名"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column prop="appointmentTime" label="预约时间" min-width="150" />
        <el-table-column
          prop="appointmentDoctor"
          label="预约医生"
          width="100"
          show-overflow-tooltip
        />
        <el-table-column prop="totalAmount" label="本单应收" width="110" align="right">
          <template #default="{ row }">{{ money2(row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column prop="actualPaid" label="本单实收" width="110" align="right">
          <template #default="{ row }">{{ money2(row.actualPaid) }}</template>
        </el-table-column>
        <el-table-column prop="arrears" label="欠款" width="100" align="right">
          <template #default="{ row }">{{ money2(row.arrears) }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { TooltipComponent, TitleComponent, GraphicComponent } from "echarts/components";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsType } from "echarts/core";
import { Search, QuestionFilled } from "@element-plus/icons-vue";

echarts.use([
  TooltipComponent,
  TitleComponent,
  GraphicComponent,
  PieChart,
  CanvasRenderer,
  LabelLayout,
]);
import {
  getRevenueAnalysisApi,
  getRevenueAnalysisDetailApi,
  type RevenueDetailRow,
} from "@/api/billing";

type QueryMode = "day" | "month";
type ChartDimension = "staff" | "feeSub";

interface PieSlice {
  name: string;
  value: number;
}

const queryMode = ref<QueryMode>("month");
const chartDimension = ref<ChartDimension>("staff");
const loading = ref(false);
const chartRef = ref<HTMLDivElement | null>(null);

const dateRangeDay = ref<[string, string]>(defaultDayRange());
const dateRangeMonth = ref<[string, string]>(defaultMonthRange());

const totalActual = ref(0);
const pieByStaff = ref<PieSlice[]>([]);
const pieByFeeSub = ref<PieSlice[]>([]);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detailRows = ref<RevenueDetailRow[]>([]);
const detailSliceName = ref("");

const detailSliceLabel = computed(() => {
  if (!detailSliceName.value) return "";
  const dim = chartDimension.value === "staff" ? "员工（收费人）" : "收费小类";
  return `${dim}：${detailSliceName.value}`;
});

const detailHasOrphanPatient = computed(() =>
  detailRows.value.some((r) => r.patientMissing === true),
);

let chart: EChartsType | null = null;
let resizeObs: ResizeObserver | null = null;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function defaultDayRange(): [string, string] {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const last = new Date(y, m, 0).getDate();
  return [`${y}-${pad2(m)}-01`, `${y}-${pad2(m)}-${pad2(last)}`];
}

function defaultMonthRange(): [string, string] {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const ym = `${y}-${m}`;
  return [ym, ym];
}

const rangeLabel = computed(() => {
  if (queryMode.value === "day" && dateRangeDay.value?.length === 2) {
    const [a, b] = dateRangeDay.value;
    return `${a} — ${b}`;
  }
  if (queryMode.value === "month" && dateRangeMonth.value?.length === 2) {
    const [a, b] = dateRangeMonth.value;
    const end = expandMonthEnd(b);
    return `${a}-01 — ${end}`;
  }
  return "—";
});

function expandMonthEnd(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y!, m!, 0).getDate();
  return `${ym}-${pad2(last)}`;
}

function money2(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function resolveQueryBounds(): { start: string; end: string } {
  if (queryMode.value === "day" && dateRangeDay.value?.length === 2) {
    return { start: dateRangeDay.value[0]!, end: dateRangeDay.value[1]! };
  }
  if (dateRangeMonth.value?.length === 2) {
    const start = `${dateRangeMonth.value[0]!}-01`;
    const end = expandMonthEnd(dateRangeMonth.value[1]!);
    return { start, end };
  }
  const d = defaultDayRange();
  return { start: d[0], end: d[1] };
}

async function runQuery() {
  loading.value = true;
  try {
    const { start, end } = resolveQueryBounds();
    const res: any = await getRevenueAnalysisApi({ startDate: start, endDate: end });
    const d = res?.data ?? res;
    totalActual.value = Number(d?.totalActual) || 0;
    pieByStaff.value = Array.isArray(d?.byStaff) ? d.byStaff : [];
    pieByFeeSub.value = Array.isArray(d?.byFeeSubcategory) ? d.byFeeSubcategory : [];
    await nextTick();
    renderOrUpdateChart();
  } catch {
    totalActual.value = 0;
    pieByStaff.value = [];
    pieByFeeSub.value = [];
    await nextTick();
    renderOrUpdateChart();
  } finally {
    loading.value = false;
  }
}

function onDetailClosed() {
  detailRows.value = [];
  detailSliceName.value = "";
}

async function openDetailDialog(sliceName: string) {
  detailSliceName.value = sliceName;
  detailVisible.value = true;
  detailLoading.value = true;
  detailRows.value = [];
  const { start, end } = resolveQueryBounds();
  const dimension = chartDimension.value;
  try {
    const res: any = await getRevenueAnalysisDetailApi({
      startDate: start,
      endDate: end,
      dimension,
      sliceName,
    });
    const payload = res?.data ?? res;
    detailRows.value = Array.isArray(payload?.list) ? payload.list : [];
  } catch {
    detailRows.value = [];
  } finally {
    detailLoading.value = false;
  }
}

function bindPieClick() {
  if (!chart) return;
  chart.off("click");
  chart.on("click", (p: { componentType?: string; seriesType?: string; name?: string }) => {
    if (p.componentType !== "series" || p.seriesType !== "pie") return;
    const name = String(p.name ?? "").trim();
    if (!name) return;
    void openDetailDialog(name);
  });
}

const chartTitle = computed(() =>
  chartDimension.value === "staff" ? "员工实收分布" : "收费小类实收分布",
);

const currentPieData = computed(() =>
  chartDimension.value === "staff" ? pieByStaff.value : pieByFeeSub.value,
);

function initChart() {
  if (!chartRef.value || chart) return;
  chart = echarts.init(chartRef.value);
  resizeObs = new ResizeObserver(() => chart?.resize());
  resizeObs.observe(chartRef.value);
}

function renderOrUpdateChart() {
  if (!chartRef.value) return;
  if (!chart) initChart();
  if (!chart) return;

  const data = currentPieData.value.map((d) => ({ name: d.name, value: d.value }));
  const empty = !data.length;
  chart.setOption(
    {
      title: {
        text: chartTitle.value,
        left: "center",
        top: 8,
        textStyle: { fontSize: 15, fontWeight: 600, color: "#303133" },
      },
      graphic: empty
        ? [
            {
              type: "text",
              left: "center",
              top: "52%",
              style: {
                text: "该区间内无数据",
                fill: "#909399",
                fontSize: 14,
              },
            },
          ]
        : [],
      tooltip: {
        trigger: "item",
        formatter: (p: { name: string; value: number; percent: number }) =>
          `${p.name}<br/>实收 ¥${Number(p.value).toLocaleString("zh-CN")}（${p.percent.toFixed(2)}%）`,
      },
      series: [
        {
          name: "实收",
          type: "pie",
          radius: empty ? ["0%", "0%"] : ["36%", "62%"],
          center: ["50%", "54%"],
          silent: empty,
          itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
          label: {
            show: !empty,
            formatter: "{b}({c}) - {d}%",
          },
          data: empty ? [] : data,
        },
      ],
    },
    true,
  );
  chart.resize();
  bindPieClick();
}

watch([chartDimension, currentPieData], () => {
  nextTick(() => renderOrUpdateChart());
});

onMounted(() => {
  runQuery();
});

onBeforeUnmount(() => {
  chart?.off("click");
  resizeObs?.disconnect();
  resizeObs = null;
  chart?.dispose();
  chart = null;
});
</script>

<style scoped>
.revenue-page {
  padding: 16px 20px 24px;
  max-width: 1200px;
  margin: 0 auto;
  box-sizing: border-box;
}

.revenue-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.revenue-date {
  width: 280px;
  max-width: 100%;
}

@media (min-width: 640px) {
  .revenue-date {
    width: 320px;
  }
}

.revenue-summary {
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 20px 22px;
  margin-bottom: 16px;
}

.revenue-summary-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.revenue-summary-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.revenue-summary-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--el-color-primary);
  letter-spacing: 0.02em;
}

.revenue-summary-tip {
  font-size: 18px;
  color: var(--el-text-color-secondary);
  cursor: help;
}

.revenue-summary-sub {
  margin-top: 8px;
  font-size: 13px;
}

.revenue-summary-sub.muted {
  color: var(--el-text-color-secondary);
}

.revenue-chart-card {
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 16px 16px 8px;
}

.revenue-dimension {
  margin-bottom: 8px;
}

.revenue-chart-hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.revenue-detail-sub {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 10px;
}

.revenue-detail-warn {
  margin: 0 0 10px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
  border-radius: 6px;
  border: 1px solid var(--el-color-warning-light-5);
}

.revenue-chart {
  width: 100%;
  height: 420px;
}
</style>
