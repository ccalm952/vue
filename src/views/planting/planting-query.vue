<template>
  <div class="planting-page">
    <el-card shadow="never" class="filter-card">
      <template #header>
        <span class="page-title">查询</span>
        <span class="page-sub">按姓名、手机、病历号、日期筛选种植记录</span>
      </template>
      <el-form :inline="true" class="filter-form">
        <el-form-item label="姓名">
          <el-input v-model="filters.name" clearable placeholder="姓名" style="width: 140px" />
        </el-form-item>
        <el-form-item label="手机">
          <el-input v-model="filters.phone" clearable placeholder="手机" style="width: 140px" />
        </el-form-item>
        <el-form-item label="病历号">
          <el-input v-model="filters.chart" clearable placeholder="病历号" style="width: 140px" />
        </el-form-item>
        <el-form-item label="日期">
          <div class="planting-filter-daterange">
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              :id="['planting-query-date-range-start', 'planting-query-date-range-end']"
              :name="['planting_query_date_range_start', 'planting_query_date_range_end']"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
            />
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="load">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <div class="table-actions">
        <el-button type="danger" plain :disabled="!selection.length" @click="onDelete">
          删除选中
        </el-button>
      </div>
      <el-table
        v-loading="loading"
        :data="rows"
        border
        stripe
        :span-method="spanMethod"
        @selection-change="selection = $event"
        @row-dblclick="openEdit"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="patientName" label="姓名" min-width="90" />
        <el-table-column prop="phone" label="手机" min-width="110" />
        <el-table-column prop="visitDate" label="日期" width="110" />
        <el-table-column prop="remark" label="二期" width="72" />
        <el-table-column prop="toothNo" label="牙位" width="72" />
        <el-table-column prop="implantBrand" label="品牌" min-width="90" />
        <el-table-column prop="implantModel" label="植体" min-width="90" />
        <el-table-column prop="toothRemark" label="备注" min-width="100" show-overflow-tooltip />
        <el-table-column prop="staff" label="人员" width="90" />
      </el-table>
    </el-card>

    <el-dialog v-model="editVisible" title="编辑记录" width="520px" @closed="editRow = null">
      <el-form v-if="editRow" label-position="top">
        <el-form-item label="姓名">
          <el-input v-model="editForm.patientName" />
        </el-form-item>
        <el-form-item label="手机">
          <el-input v-model="editForm.phone" />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="editForm.visitDate"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="二期（月数等）">
          <el-input v-model="editForm.remark" placeholder="仅数字表示月数" />
        </el-form-item>
        <el-form-item label="人员">
          <el-input v-model="editForm.staff" />
        </el-form-item>
        <el-form-item label="牙位">
          <el-input v-model="editForm.toothNo" />
        </el-form-item>
        <el-form-item label="品牌">
          <el-input v-model="editForm.implantBrand" />
        </el-form-item>
        <el-form-item label="植体">
          <el-input v-model="editForm.implantModel" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.toothRemark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue";
import type { TableColumnCtx } from "element-plus";
import {
  getPlantingRecordsApi,
  updatePlantingVisitApi,
  deletePlantingVisitRowApi,
} from "@/api/planting";

interface Row {
  patientId: number;
  patientName: string;
  phone: string;
  chartNo?: string;
  visitId: number;
  visitDate: string;
  remark: string | null;
  staff: string | null;
  toothId: number | null;
  toothNo: string | null;
  implantBrand: string | null;
  implantModel: string | null;
  toothRemark: string | null;
}

const loading = ref(false);
const rows = ref<Row[]>([]);
const selection = ref<Row[]>([]);

/** 同一患者、手机、日期的连续行：首行显示 rowspan，其余行为 0。 */
const mergeRowSpan = ref<number[]>([]);

function rowMergeKey(row: Row) {
  return `${row.patientName ?? ""}\n${row.phone ?? ""}\n${row.visitDate ?? ""}`;
}

function recomputeMergeRowSpan() {
  const list = rows.value;
  if (!list.length) {
    mergeRowSpan.value = [];
    return;
  }
  const span = Array.from({ length: list.length }, () => 1);
  let i = 0;
  while (i < list.length) {
    const key = rowMergeKey(list[i]!);
    let j = i + 1;
    while (j < list.length && rowMergeKey(list[j]!) === key) j++;
    const len = j - i;
    for (let k = i; k < j; k++) span[k] = k === i ? len : 0;
    i = j;
  }
  mergeRowSpan.value = span;
}

watch(
  rows,
  () => {
    recomputeMergeRowSpan();
  },
  { deep: true },
);

/** 需要合并的列：姓名、手机、日期、二期、人员。 */
const MERGED_COLUMN_INDEXES = new Set([1, 2, 3, 4, 9]);

function spanMethod({
  rowIndex,
  columnIndex,
}: {
  row: Row;
  column: TableColumnCtx<Row>;
  rowIndex: number;
  columnIndex: number;
}) {
  if (columnIndex === 0) return { rowspan: 1, colspan: 1 };
  if (!MERGED_COLUMN_INDEXES.has(columnIndex)) return { rowspan: 1, colspan: 1 };
  const rowspan = mergeRowSpan.value[rowIndex] ?? 1;
  if (rowspan === 0) return { rowspan: 0, colspan: 0 };
  return { rowspan, colspan: 1 };
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { start: format(start), end: format(end) };
}

const range = defaultRange();
const filters = reactive({
  name: "",
  phone: "",
  chart: "",
  /** 与患者列表筛选保持一致，默认近三个月。 */
  dateRange: [range.start, range.end] as [string, string],
});

async function load() {
  loading.value = true;
  try {
    const res: any = await getPlantingRecordsApi({
      name: filters.name || undefined,
      phone: filters.phone || undefined,
      chart: filters.chart || undefined,
      dateFrom: filters.dateRange?.[0] || undefined,
      dateTo: filters.dateRange?.[1] || undefined,
    });
    rows.value = res.data || [];
  } catch {
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

async function onDelete() {
  if (!selection.value.length) return;
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selection.value.length} 条记录吗？`, "确认删除", {
      type: "warning",
    });
  } catch {
    return;
  }
  for (const row of selection.value) {
    try {
      await deletePlantingVisitRowApi(row.visitId, row.toothId != null ? row.toothId : undefined);
    } catch {
      /* 单条失败交由拦截器提示 */
    }
  }
  ElMessage.success("已删除");
  selection.value = [];
  await load();
}

const editVisible = ref(false);
const editRow = ref<Row | null>(null);
const editForm = reactive({
  patientName: "",
  phone: "",
  visitDate: "",
  remark: "",
  staff: "",
  toothNo: "",
  implantBrand: "",
  implantModel: "",
  toothRemark: "",
});
const saving = ref(false);

function openEdit(row: Row) {
  editRow.value = row;
  editForm.patientName = row.patientName || "";
  editForm.phone = row.phone || "";
  editForm.visitDate = row.visitDate || "";
  editForm.remark = row.remark || "";
  editForm.staff = row.staff || "";
  editForm.toothNo = row.toothNo || "";
  editForm.implantBrand = row.implantBrand || "";
  editForm.implantModel = row.implantModel || "";
  editForm.toothRemark = row.toothRemark || "";
  editVisible.value = true;
}

async function saveEdit() {
  const row = editRow.value;
  if (!row) return;
  saving.value = true;
  try {
    await updatePlantingVisitApi(row.visitId, {
      toothId: row.toothId,
      patientId: row.patientId,
      patientName: editForm.patientName,
      phone: editForm.phone,
      visitDate: editForm.visitDate,
      remark: editForm.remark || null,
      staff: editForm.staff || null,
      toothNo: editForm.toothNo || null,
      implantBrand: editForm.implantBrand || null,
      implantModel: editForm.implantModel || null,
      toothRemark: editForm.toothRemark || null,
    });
    ElMessage.success("已保存");
    editVisible.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

onMounted(() => load());
</script>

<style scoped>
.planting-page {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-title {
  font-weight: 600;
  font-size: 16px;
  margin-right: 12px;
}

.page-sub {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.filter-card,
.table-card {
  border-radius: 10px;
}

.table-actions {
  margin-bottom: 12px;
}

/* 与患者列表的日期筛选宽度保持一致。 */
.planting-filter-daterange {
  width: 300px;
  max-width: 100%;
}

.planting-filter-daterange :deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
  box-sizing: border-box;
}
</style>
