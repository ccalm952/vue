<template>
  <div class="patient-page">
    <RecentPatientsSidebar />
    <div class="patient-page-main">
      <!-- 筛选区（样式见 styles/filter-section.css） -->
      <el-card class="filter-section">
        <div>筛选</div>
        <el-form :model="searchForm" inline>
          <el-form-item>
            <el-input
              v-model="searchForm.keyword"
              placeholder="姓名 / 手机"
              clearable
              style="width: 300px"
              :prefix-icon="Search"
            />
          </el-form-item>
          <el-form-item>
            <div class="patient-filter-daterange">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                :id="['patient-list-date-range-start', 'patient-list-date-range-end']"
                :name="['patient_list_date_range_start', 'patient_list_date_range_end']"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
              />
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="success" text bg :icon="Plus" @click="handleAdd">新增患者</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 患者列表区 -->
      <el-card class="table-card">
        <div class="table-header">
          <div>患者列表</div>
          <div class="table-header-right">
            <el-button :icon="Close" :disabled="!selectedRows.length" @click="handleClearSelection">
              清空勾选
            </el-button>
            <el-button :icon="Delete" :disabled="!selectedRows.length" @click="handleBatchDelete">
              批量删除
            </el-button>
          </div>
        </div>

        <div class="table-scroll-wrap">
          <el-table
            ref="tableRef"
            v-loading="loading"
            class="patient-table-nowrap"
            :data="patients"
            stripe
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="48" align="center" />
            <el-table-column prop="name" label="姓名" align="center">
              <template #default="{ row }">
                <el-button type="primary" text bg @click="openPatientDetail(row)">
                  {{ row.name }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="phone" label="手机" align="center" />
            <el-table-column prop="gender" label="性别" align="center" />
            <el-table-column prop="source" label="病历号" align="center" />
            <el-table-column prop="birthday" label="出生日期" align="center" />
            <el-table-column prop="age" label="年龄" align="center">
              <template #default="{ row }">
                {{ row.age ? row.age + " 岁" : "-" }}
              </template>
            </el-table-column>
            <el-table-column
              label="标签"
              align="center"
              min-width="160"
              class-name="patient-tags-col"
            >
              <template #default="{ row }">
                <div v-if="patientTagList(row).length" class="patient-tags-wrap">
                  <el-tag
                    v-for="t in patientTagList(row)"
                    :key="t"
                    type="info"
                    effect="plain"
                    size="small"
                    class="patient-tag-chip"
                  >
                    {{ t }}
                  </el-tag>
                </div>
                <span v-else>—</span>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" align="center">
              <template #default="{ row }">
                {{ formatDateYyyyMmDd(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="firstVisit" label="初诊医生" align="center" />
            <el-table-column label="上次就诊时间" align="center">
              <template #default="{ row }">
                {{ formatDateYyyyMmDd(row.lastVisitTime) }}
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              align="center"
              min-width="220"
              fixed="right"
              class-name="patient-actions-col"
            >
              <template #default="{ row }">
                <div class="patient-actions-wrap">
                  <el-button type="primary" @click="handleView(row)">详情</el-button>
                  <el-button type="warning" @click="handleEdit(row)">编辑</el-button>
                  <el-popconfirm
                    title="确定删除该患者吗？"
                    confirm-button-text="确定"
                    cancel-button-text="取消"
                    @confirm="handleDelete(row)"
                  >
                    <template #reference>
                      <el-button type="danger">删除</el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            background
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="fetchList"
          />
        </div>
      </el-card>
      <PatientAddEditDialog
        v-model="patientDialogVisible"
        :edit-row="editingRow"
        @saved="fetchList"
        @closed="onPatientDialogClosed"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Search, Refresh, Plus, Delete, Close } from "@element-plus/icons-vue";
import type { TableInstance } from "element-plus";
import { getPatientListApi, removePatientApi, batchRemovePatientApi } from "@/api/patient";
import { formatDateYyyyMmDd } from "@/utils/datetime";
import { addRecentPatient } from "@/utils/recent-patients";
import RecentPatientsSidebar from "@/components/patient/RecentPatientsSidebar.vue";
import PatientAddEditDialog from "@/components/patient/PatientAddEditDialog.vue";

const router = useRouter();
const route = useRoute();

interface Patient {
  id: number;
  name: string;
  phone: string;
  gender: string;
  source: string;
  birthday: string;
  age: number;
  createdAt: string;
  firstVisit: string;
  lastVisitTime: string;
  tags?: string[];
}

interface ApiResponse<T> {
  data: T;
}

interface PatientListData {
  list: Patient[];
  total: number;
}

const searchForm = reactive({
  keyword: "",
  dateRange: null as [string, string] | null,
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
});

const loading = ref(false);
const total = ref(0);
const selectedRows = ref<Patient[]>([]);
const tableRef = ref<TableInstance>();
const patients = ref<Patient[]>([]);

/**
 * 拉取患者列表。
 * - 自动分组：保存患者查询条件，患者列表数量随条件变化而变化（`route.query.scope` 等传给接口）。
 * - 手动分组：保存患者查询结果，患者列表支持批量操作增减患者（`route.query.keyword` 与列表勾选批量删除等）。
 */
async function fetchList() {
  loading.value = true;
  try {
    const scopeRaw = route.query.scope;
    const scope = typeof scopeRaw === "string" && scopeRaw.trim() ? scopeRaw.trim() : undefined;
    const res = (await getPatientListApi({
      keyword: searchForm.keyword,
      startDate: searchForm.dateRange?.[0],
      endDate: searchForm.dateRange?.[1],
      page: pagination.page,
      pageSize: pagination.pageSize,
      scope,
    })) as ApiResponse<PatientListData>;
    patients.value = res.data.list;
    total.value = res.data.total;
  } catch {
    // 错误已在拦截器处理
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  fetchList();
}

function handleSizeChange() {
  pagination.page = 1;
  fetchList();
}

function handleReset() {
  searchForm.keyword = "";
  searchForm.dateRange = null;
  pagination.page = 1;
  router.replace({ path: "/patient" });
}

const patientDialogVisible = ref(false);
/** 非空表示编辑该患者；新增时为 null */
const editingRow = ref<Patient | null>(null);

function onPatientDialogClosed() {
  editingRow.value = null;
}

function handleAdd() {
  editingRow.value = null;
  patientDialogVisible.value = true;
}

function handleEdit(row: Patient) {
  editingRow.value = row;
  patientDialogVisible.value = true;
}

function openPatientDetail(row: Patient) {
  addRecentPatient({ id: row.id, name: row.name });
  router.push(`/patient/${row.id}`);
}

function handleView(row: Patient) {
  openPatientDetail(row);
}

async function handleDelete(row: Patient) {
  try {
    await removePatientApi(row.id);
    fetchList();
  } catch {
    // 错误已在拦截器处理
  }
}

async function handleBatchDelete() {
  const ids = selectedRows.value.map((r) => r.id);
  try {
    await batchRemovePatientApi(ids);
    selectedRows.value = [];
    fetchList();
  } catch {
    // 错误已在拦截器处理
  }
}

function handleClearSelection() {
  tableRef.value?.clearSelection();
}

function handleSelectionChange(rows: Patient[]) {
  selectedRows.value = rows;
}

function patientTagList(row: Patient): string[] {
  const raw = row.tags;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter((x) => x.length > 0);
}

function applyKeywordFromRoute() {
  const q = route.query.keyword;
  searchForm.keyword = typeof q === "string" ? q : "";
}

onMounted(() => {
  applyKeywordFromRoute();
  fetchList();
});

watch(
  () => [route.query.keyword, route.query.scope],
  () => {
    if (route.name !== "patient") return;
    applyKeywordFromRoute();
    pagination.page = 1;
    fetchList();
  },
);
</script>

<style scoped>
.patient-page {
  padding: 16px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
  box-sizing: border-box;
}

.patient-page-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.patient-filter-daterange {
  width: 300px;
  max-width: 100%;
}

.patient-filter-daterange :deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
  box-sizing: border-box;
}

.table-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.table-header-right :deep(.el-button + .el-button) {
  margin-left: 0;
}

.table-scroll-wrap {
  width: 100%;
  overflow-x: auto;
}

.patient-table-nowrap {
  min-width: 1240px;
}

.patient-table-nowrap :deep(.el-table__header .cell),
.patient-table-nowrap :deep(.el-table__body .cell) {
  white-space: nowrap;
}

.patient-table-nowrap :deep(.patient-tags-col .cell) {
  white-space: normal;
}

.patient-table-nowrap :deep(.patient-actions-col .cell) {
  white-space: normal;
}

.patient-actions-wrap {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.patient-actions-wrap :deep(.el-button + .el-button) {
  margin-left: 0;
}

.patient-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  align-items: center;
}

.patient-tag-chip {
  margin: 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
}
</style>
