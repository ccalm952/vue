<template>
  <div class="planting-inventory-page">
    <el-card
      shadow="never"
      class="planting-inventory-page__card planting-inventory-page__card--add"
    >
      <template #header>补货</template>
      <el-form inline>
        <el-form-item label="品牌">
          <el-input v-model="addForm.brand" placeholder="必填" style="width: 160px" />
        </el-form-item>
        <el-form-item label="植体型号">
          <el-input v-model="addForm.modelCode" placeholder="必填" style="width: 160px" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input
            v-model.number="addForm.supplement"
            type="number"
            min="1"
            style="width: 100px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="adding" @click="addStock">添加</el-button>
        </el-form-item>
      </el-form>
      <el-form inline class="planting-inventory-page__query-form">
        <el-form-item label="查库存">
          <el-input v-model="leftForm.brand" placeholder="品牌" style="width: 140px" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="leftForm.model" placeholder="型号" style="width: 140px" />
        </el-form-item>
        <el-form-item>
          <el-button @click="queryLeft">查询</el-button>
        </el-form-item>
        <el-form-item v-if="leftResult">
          <span class="planting-inventory-page__left-text">{{ leftResult }}</span>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="planting-inventory-page__card-header">
          <span>库存列表</span>
          <div>
            <el-button :loading="loading" @click="load">刷新</el-button>
            <el-button type="danger" plain :disabled="!selection.length" @click="removeSel">
              删除选中
            </el-button>
            <el-button type="danger" plain @click="removeAll">全部删除</el-button>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="list"
        border
        stripe
        @selection-change="selection = $event"
        @row-dblclick="openEdit"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="brand" label="品牌" min-width="120" />
        <el-table-column prop="model" label="植体" min-width="120" />
        <el-table-column prop="supplement" label="补货" width="90" align="center" />
        <el-table-column prop="used" label="已用" width="90" align="center" />
        <el-table-column prop="left" label="库存" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.left <= 0 ? 'danger' : 'success'" size="small">{{
              row.left
            }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editVisible" title="修改库存" width="440px">
      <el-form v-if="editRow" label-position="top">
        <el-form-item label="品牌">
          <el-input v-model="editForm.brand" />
        </el-form-item>
        <el-form-item label="植体">
          <el-input v-model="editForm.model" />
        </el-form-item>
        <el-form-item label="补货数量">
          <el-input v-model.number="editForm.supplement" type="number" min="0" />
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
import { ref, reactive, onMounted } from "vue";
import {
  getPlantingInventoryApi,
  addPlantingInventoryApi,
  updatePlantingInventoryApi,
  deletePlantingInventoryApi,
  deleteAllPlantingInventoryApi,
  queryPlantingLeftStockApi,
} from "@/api/planting";

interface InvRow {
  id: number;
  brand: string;
  model: string;
  supplement: number;
  used: number;
  left: number;
}

interface ApiResponse<T> {
  data: T;
}

interface PlantingLeftStock {
  left: number;
  supplement: number;
  used: number;
}

const loading = ref(false);
const list = ref<InvRow[]>([]);
const selection = ref<InvRow[]>([]);
const adding = ref(false);

const addForm = reactive({ brand: "", modelCode: "", supplement: 1 });
const leftForm = reactive({ brand: "", model: "" });
const leftResult = ref("");

async function load() {
  loading.value = true;
  try {
    const res = (await getPlantingInventoryApi()) as ApiResponse<InvRow[]>;
    list.value = res.data || [];
  } catch {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

async function addStock() {
  adding.value = true;
  try {
    await addPlantingInventoryApi({
      brand: addForm.brand,
      modelCode: addForm.modelCode,
      supplement: Number(addForm.supplement) || 0,
    });
    ElMessage.success("已保存");
    addForm.modelCode = "";
    addForm.supplement = 1;
    await load();
  } finally {
    adding.value = false;
  }
}

async function queryLeft() {
  leftResult.value = "";
  try {
    const res = (await queryPlantingLeftStockApi(
      leftForm.brand,
      leftForm.model,
    )) as ApiResponse<PlantingLeftStock>;
    const data = res.data;
    leftResult.value = `剩余 ${data.left}（补货 ${data.supplement}，已用 ${data.used}）`;
  } catch {
    leftResult.value = "";
  }
}

async function removeSel() {
  try {
    await ElMessageBox.confirm(`删除选中的 ${selection.value.length} 条记录吗？`, "确认", {
      type: "warning",
    });
  } catch {
    return;
  }
  for (const row of selection.value) {
    try {
      await deletePlantingInventoryApi(row.id);
    } catch {
      /* */
    }
  }
  ElMessage.success("已删除");
  selection.value = [];
  await load();
}

async function removeAll() {
  try {
    await ElMessageBox.confirm("确定清空全部库存型号吗？", "危险操作", { type: "warning" });
  } catch {
    return;
  }
  try {
    await deleteAllPlantingInventoryApi();
    ElMessage.success("已清空");
    await load();
  } catch {
    /* */
  }
}

const editVisible = ref(false);
const editRow = ref<InvRow | null>(null);
const editForm = reactive({ brand: "", model: "", supplement: 0 });
const saving = ref(false);

function openEdit(row: InvRow) {
  editRow.value = row;
  editForm.brand = row.brand;
  editForm.model = row.model;
  editForm.supplement = row.supplement;
  editVisible.value = true;
}

async function saveEdit() {
  const row = editRow.value;
  if (!row) return;
  saving.value = true;
  try {
    await updatePlantingInventoryApi(row.id, {
      brand: editForm.brand,
      modelCode: editForm.model,
      supplement: Number(editForm.supplement),
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
.planting-inventory-page {
  padding: 16px;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.planting-inventory-page__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.planting-inventory-page__query-form {
  margin-top: 8px;
}

.planting-inventory-page__left-text {
  color: var(--el-color-primary);
  font-size: var(--el-font-size-small);
}
</style>
