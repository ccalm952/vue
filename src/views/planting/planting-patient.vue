<template>
  <div class="planting-patient-page">
    <el-card class="planting-patient-page__filter-card">
      <div>筛选</div>
      <el-form inline>
        <el-form-item>
          <el-input
            v-model="keyword"
            placeholder="按姓名搜索"
            clearable
            style="width: 260px"
            :prefix-icon="Search"
            @keyup.enter="fetchList"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="fetchList">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="planting-patient-page__table-card">
      <div class="planting-patient-page__table-header">
        <div class="planting-patient-page__table-title">
          <span>种植患者</span>
          <el-tag type="info" size="small" effect="plain">共 {{ patients.length }} 人</el-tag>
        </div>
      </div>

      <el-table :data="patients" v-loading="loading" border stripe style="width: 100%">
        <el-table-column prop="name" label="姓名" min-width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" text bg @click="router.push(`/patient/${row.id}`)">
              {{ row.name }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机" min-width="130" align="center" />
        <el-table-column prop="gender" label="性别" width="70" align="center" />
        <el-table-column prop="source" label="病历号" min-width="110" align="center" />
        <el-table-column prop="birthday" label="出生日期" min-width="120" align="center" />
        <el-table-column prop="age" label="年龄" width="70" align="center">
          <template #default="{ row }">
            {{ row.age ? row.age + " 岁" : "-" }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="120" align="center">
          <template #default="{ row }">
            {{ formatDateYyyyMmDd(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Search, Refresh } from "@element-plus/icons-vue";
import { getPlantingPatientListApi } from "@/api/planting";
import { formatDateYyyyMmDd } from "@/utils/datetime";

const router = useRouter();
const keyword = ref("");
const loading = ref(false);

interface PlantingPatient {
  id: number;
  name: string;
  phone: string;
  gender: string;
  source: string;
  birthday: string;
  age: number;
  createdAt: string;
}

interface ApiResponse<T> {
  data: T;
}

const patients = ref<PlantingPatient[]>([]);

async function fetchList() {
  loading.value = true;
  try {
    const res = (await getPlantingPatientListApi(
      keyword.value.trim() || undefined,
    )) as ApiResponse<PlantingPatient[]>;
    patients.value = res.data ?? [];
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  keyword.value = "";
  fetchList();
}

onMounted(fetchList);
</script>

<style scoped>
.planting-patient-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.planting-patient-page__table-card {
  border-radius: 8px;
}

.planting-patient-page__table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.planting-patient-page__table-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
