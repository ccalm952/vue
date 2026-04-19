<template>
  <div class="planting-stats-page">
    <el-card shadow="never">
      <template #header>
        <span class="planting-stats-page__title">统计</span>
        <span class="planting-stats-page__subtitle">按人员统计就诊次数，按月份统计植体数量</span>
      </template>

      <div class="planting-stats-page__month-bar">
        <span>月份</span>
        <el-select
          v-model="month"
          placeholder="选择月份"
          style="width: 140px"
          filterable
          @change="loadMonthTotal"
        >
          <el-option v-for="item in months" :key="item" :label="item" :value="item" />
        </el-select>
        <span class="planting-stats-page__month-total">植体数量：<strong>{{ monthTotal }}</strong></span>
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
      </div>

      <el-table v-loading="loading" :data="staffRows" border stripe style="margin-top: 16px">
        <el-table-column prop="name" label="人员" min-width="160" />
        <el-table-column prop="count" label="次数" width="100" align="center" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  getPlantingStatsStaffApi,
  getPlantingStatsMonthsApi,
  getPlantingStatsMonthTotalApi,
} from "@/api/planting";

interface ApiResponse<T> {
  data: T;
}

interface StaffStatRow {
  name: string;
  count: number;
}

const loading = ref(false);
const staffRows = ref<StaffStatRow[]>([]);
const months = ref<string[]>([]);
const month = ref("");
const monthTotal = ref(0);

async function loadMonthTotal() {
  if (!month.value) {
    monthTotal.value = 0;
    return;
  }
  try {
    const res = (await getPlantingStatsMonthTotalApi(month.value)) as ApiResponse<number>;
    monthTotal.value = res.data ?? 0;
  } catch {
    monthTotal.value = 0;
  }
}

async function loadAll() {
  loading.value = true;
  try {
    const [staffRes, monthsRes] = await Promise.all([
      getPlantingStatsStaffApi(),
      getPlantingStatsMonthsApi(),
    ]);
    staffRows.value = (staffRes as ApiResponse<StaffStatRow[]>).data || [];
    months.value = (monthsRes as ApiResponse<string[]>).data || [];
    if (!month.value && months.value.length) {
      month.value = months.value[0]!;
    }
    await loadMonthTotal();
  } catch {
    staffRows.value = [];
    months.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => loadAll());
</script>

<style scoped>
.planting-stats-page {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.planting-stats-page__title {
  font-weight: 600;
  font-size: 16px;
  margin-right: 12px;
}

.planting-stats-page__subtitle {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.planting-stats-page__month-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.planting-stats-page__month-total {
  margin-left: 8px;
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-regular);
}
</style>
