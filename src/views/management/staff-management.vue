<template>
  <div class="staff-page">
    <p class="page-hint">用于维护员工信息与员工登录账号，数据会写入 MySQL。</p>

    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <el-input
          v-model="keyword"
          class="search-input"
          placeholder="搜索员工姓名 / 手机号 / 岗位 / 登录账号"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="openCreate">新增员工</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="list" border stripe style="width: 100%">
        <el-table-column prop="name" label="员工姓名" min-width="100" />
        <el-table-column prop="phone" label="手机号" min-width="120" show-overflow-tooltip />
        <el-table-column prop="role" label="岗位/角色" min-width="100" />
        <el-table-column
          prop="loginAccount"
          label="登录账号"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? "启用" : "停用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="160">
          <template #default="{ row }">
            {{ formatCreatedAt(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text bg @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" text bg @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="prev, pager, next, sizes, total"
          background
          @current-change="fetchList"
          @size-change="onPageSizeChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑员工' : '新增员工'"
      width="480px"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="96px">
        <el-form-item label="员工姓名" prop="name">
          <el-input v-model="form.name" maxlength="50" show-word-limit placeholder="姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" maxlength="20" placeholder="选填" />
        </el-form-item>
        <el-form-item label="岗位/角色" prop="role">
          <el-select v-model="form.role" placeholder="选择角色" style="width: 100%">
            <el-option v-for="item in roleOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="登录账号" prop="loginAccount">
          <el-input v-model="form.loginAccount" maxlength="40" placeholder="登录账号" />
        </el-form-item>
        <el-form-item label="登录密码" prop="loginPassword">
          <el-input
            v-model="form.loginPassword"
            type="password"
            show-password
            maxlength="64"
            :placeholder="isEdit ? '不修改请留空' : '初始密码（必填）'"
          />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { getStaffListApi, createStaffApi, updateStaffApi, deleteStaffApi } from "@/api/staff";

interface StaffRow {
  id: number;
  name: string;
  phone: string;
  role: string;
  loginAccount: string;
  enabled: boolean;
  createdAt: string;
}

const roleOptions = ["管理员", "医生", "护士", "前台", "其他"];

const loading = ref(false);
const list = ref<StaffRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref("");

const dialogVisible = ref(false);
const saving = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const form = reactive({
  name: "",
  phone: "",
  role: "医生",
  loginAccount: "",
  loginPassword: "",
  enabled: true,
});

const formRules = computed<FormRules>(() => ({
  name: [{ required: true, message: "请输入员工姓名", trigger: "blur" }],
  role: [{ required: true, message: "请选择岗位", trigger: "change" }],
  loginAccount: [{ required: true, message: "请输入登录账号", trigger: "blur" }],
  loginPassword: isEdit.value ? [] : [{ required: true, message: "请输入登录密码", trigger: "blur" }],
}));

function pad(num: number) {
  return String(num).padStart(2, "0");
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function fetchList() {
  loading.value = true;
  try {
    const res: any = await getStaffListApi({
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    const data = res.data || {};
    list.value = data.list || [];
    total.value = data.total ?? 0;
  } catch {
    list.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  fetchList();
}

function onPageSizeChange() {
  page.value = 1;
  fetchList();
}

function resetForm() {
  form.name = "";
  form.phone = "";
  form.role = "医生";
  form.loginAccount = "";
  form.loginPassword = "";
  form.enabled = true;
  editingId.value = null;
  isEdit.value = false;
  formRef.value?.clearValidate();
}

async function openCreate() {
  resetForm();
  isEdit.value = false;
  dialogVisible.value = true;
  await nextTick();
  formRef.value?.clearValidate();
}

async function openEdit(row: StaffRow) {
  resetForm();
  isEdit.value = true;
  editingId.value = row.id;
  form.name = row.name;
  form.phone = row.phone || "";
  form.role = row.role;
  form.loginAccount = row.loginAccount;
  form.loginPassword = "";
  form.enabled = row.enabled;
  dialogVisible.value = true;
  await nextTick();
  formRef.value?.clearValidate();
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    if (isEdit.value && editingId.value != null) {
      const payload: Record<string, any> = {
        name: form.name,
        phone: form.phone,
        role: form.role,
        loginAccount: form.loginAccount,
        enabled: form.enabled,
      };
      if (form.loginPassword) payload.loginPassword = form.loginPassword;
      await updateStaffApi(editingId.value, payload);
      ElMessage.success("已保存");
    } else {
      await createStaffApi({
        name: form.name,
        phone: form.phone,
        role: form.role,
        loginAccount: form.loginAccount,
        loginPassword: form.loginPassword,
        enabled: form.enabled,
      });
      ElMessage.success("已保存");
    }
    dialogVisible.value = false;
    fetchList();
  } catch {
    /* 由拦截器统一提示 */
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: StaffRow) {
  try {
    await ElMessageBox.confirm(`确定删除员工“${row.name}”吗？此操作不可恢复。`, "提示", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await deleteStaffApi(row.id);
    ElMessage.success("已删除");
    fetchList();
  } catch {
    /* */
  }
}

onMounted(() => fetchList());
</script>

<style scoped>
.staff-page {
  padding: 16px;
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-hint {
  margin: 0;
  font-size: var(--el-font-size-small);
  color: #909399;
  line-height: 1.5;
}

.toolbar-card :deep(.el-card__body) {
  padding: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 280px;
  max-width: 560px;
}

.table-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.table-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
