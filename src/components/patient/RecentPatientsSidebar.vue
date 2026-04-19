<template>
  <div class="patient-sidebar">
    <div class="patient-sidebar__tabs">
      <button
        type="button"
        class="patient-sidebar__tab"
        :class="{ active: sidebarTab === 'group' }"
        @click="onClickGroupTab"
      >
        分组
      </button>
      <button
        type="button"
        class="patient-sidebar__tab"
        :class="{ active: sidebarTab === 'recent' }"
        @click="onClickRecentTab"
      >
        最近
      </button>
    </div>

    <!-- 分组 -->
    <div v-show="sidebarTab === 'group'" class="patient-sidebar__panel patient-sidebar__panel--group">
      <div
        class="patient-sidebar__group-row patient-sidebar__group-row--top"
        :class="{ active: isScopeActive('all') }"
        @click="goPatientList('all')"
      >
        <el-icon class="patient-sidebar__group-icon patient-sidebar__group-icon--primary"><UserFilled /></el-icon>
        <span class="patient-sidebar__group-label">全部患者</span>
        <span class="patient-sidebar__group-count">({{ fmtCount(counts.total) }})</span>
      </div>
      <div
        class="patient-sidebar__group-row patient-sidebar__group-row--top"
        :class="{ active: isScopeActive('mine') }"
        @click="goPatientList('mine')"
      >
        <el-icon class="patient-sidebar__group-icon patient-sidebar__group-icon--muted"><User /></el-icon>
        <span class="patient-sidebar__group-label">我的患者</span>
        <span class="patient-sidebar__group-count">({{ fmtCount(counts.myPatients) }})</span>
      </div>

      <!-- 自动分组：保存患者查询条件，患者列表数量随条件变化而变化 -->
      <div class="patient-sidebar__section">
        <div class="patient-sidebar__section-head" @click="autoOpen = !autoOpen">
          <span class="patient-sidebar__section-accent" />
          <span class="patient-sidebar__section-title">自动分组</span>
          <span class="patient-sidebar__section-head-actions" @click.stop>
            <el-tooltip
              content="自动分组：保存患者查询条件，患者列表数量随条件变化而变化"
              placement="top"
            >
              <el-icon class="patient-sidebar__section-action-icon"><InfoFilled /></el-icon>
            </el-tooltip>
            <el-tooltip content="添加规则分组（敬请期待）" placement="top">
              <el-icon class="patient-sidebar__section-action-icon" @click.stop="onAddAutoGroupClick"
                ><CirclePlus
              /></el-icon>
            </el-tooltip>
            <el-icon class="patient-sidebar__section-chevron">
              <ArrowUp v-if="autoOpen" />
              <ArrowDown v-else />
            </el-icon>
          </span>
        </div>
        <div v-show="autoOpen" class="patient-sidebar__section-body">
          <div
            class="patient-sidebar__group-row patient-sidebar__group-row--sub"
            :class="{ active: isScopeActive('notVisitedYear') }"
            @click="goPatientList('notVisitedYear')"
          >
            <el-icon class="patient-sidebar__group-icon patient-sidebar__group-icon--sub"><User /></el-icon>
            <span class="patient-sidebar__group-label patient-sidebar__group-label--ellipsis">一年以上未到店患者</span>
            <span class="patient-sidebar__group-count">({{ fmtCount(counts.auto.notVisitedOverYear) }})</span>
            <el-dropdown
              class="patient-sidebar__group-dropdown"
              trigger="click"
              @command="onAutoSubGroupCommand"
              @click.stop
            >
              <span class="patient-sidebar__group-more" @click.stop>
                <el-icon :size="16"><MoreFilled /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <!-- 手动分组：保存患者查询结果，患者列表支持批量操作增减患者 -->
      <div class="patient-sidebar__section patient-sidebar__section--manual">
        <div class="patient-sidebar__section-head patient-sidebar__section-head--muted" @click="manualOpen = !manualOpen">
          <span class="patient-sidebar__section-accent" />
          <span class="patient-sidebar__section-title">手动分组</span>
          <span class="patient-sidebar__section-head-actions" @click.stop>
            <el-tooltip
              content="手动分组：保存患者查询结果，患者列表支持批量操作增减患者"
              placement="top"
            >
              <el-icon class="patient-sidebar__section-action-icon"><InfoFilled /></el-icon>
            </el-tooltip>
            <el-tooltip content="新增自定义分组" placement="top">
              <el-icon class="patient-sidebar__section-action-icon" @click.stop="openManualGroupDialog('add')"
                ><CirclePlus
              /></el-icon>
            </el-tooltip>
            <el-icon class="patient-sidebar__section-chevron">
              <ArrowUp v-if="manualOpen" />
              <ArrowDown v-else />
            </el-icon>
          </span>
        </div>
        <div v-show="manualOpen" class="patient-sidebar__section-body">
          <div v-if="!manualLabels.length" class="patient-sidebar__manual-group-empty">
            暂无分组，点击右上角 + 新增
          </div>
          <div
            v-for="label in manualLabels"
            :key="label"
            class="patient-sidebar__group-row patient-sidebar__group-row--sub"
            :class="{ active: isManualKeywordActive(label) }"
            @click="goManualGroup(label)"
          >
            <el-icon class="patient-sidebar__group-icon patient-sidebar__group-icon--sub"><User /></el-icon>
            <span class="patient-sidebar__group-label patient-sidebar__group-label--ellipsis">{{ label }}</span>
            <span class="patient-sidebar__group-manual-spacer" />
            <el-dropdown
              class="patient-sidebar__group-dropdown"
              trigger="click"
              @command="handleManualDropdownCommand(label)"
              @click.stop
            >
              <span class="patient-sidebar__group-more" @click.stop>
                <el-icon :size="16"><MoreFilled /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近 -->
    <div v-show="sidebarTab === 'recent'" class="patient-sidebar__panel patient-sidebar__panel--recent">
      <div v-if="recentPatients.length" class="patient-sidebar__recent-list">
        <div
          v-for="rp in recentPatients"
          :key="rp.id"
          class="patient-sidebar__recent-item"
          :class="{ active: activeId != null && rp.id === activeId }"
          @click="goPatient(rp.id)"
        >
          <el-avatar :size="32" class="patient-sidebar__recent-avatar">
            {{ (rp.name || "?").charAt(0) }}
          </el-avatar>
          <span class="patient-sidebar__recent-name">{{ rp.name || "—" }}</span>
        </div>
      </div>
      <el-empty v-else :image-size="60" description="暂无最近患者" />
    </div>

    <!-- 手动分组：仅分组名称，无共享设置；删除分组在侧栏行菜单中操作 -->
    <el-dialog
      v-model="manualGroupDialogVisible"
      :title="manualGroupDialogMode === 'add' ? '新增分组' : '编辑分组'"
      width="420px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
      @closed="onManualGroupDialogClosed"
    >
      <el-form
        ref="manualGroupFormRef"
        :model="manualGroupForm"
        :rules="manualGroupRules"
        label-position="top"
        @submit.prevent
      >
        <el-form-item label="分组名称" prop="name">
          <el-input
            v-model="manualGroupForm.name"
            placeholder="请输入分组名称"
            maxlength="32"
            show-word-limit
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualGroupDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="manualGroupSaving" @click="submitManualGroupDialog">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import type { LocationQuery } from "vue-router";
import type { FormInstance, FormRules } from "element-plus";
import {
  User,
  UserFilled,
  InfoFilled,
  CirclePlus,
  ArrowDown,
  ArrowUp,
  MoreFilled,
} from "@element-plus/icons-vue";
import {
  recentPatients,
  syncRecentPatientsFromStorage,
  RECENT_PATIENTS_STORAGE_KEY,
} from "@/utils/recent-patients";
import { getPatientSidebarCountsApi, type PatientSidebarCounts } from "@/api/patient";
import { lastPatientListQuery } from "@/utils/patient-list-query-snapshot";

defineProps<{
  /** 当前详情页患者 id，用于「最近」高亮 */
  activeId?: number | null;
}>();

const router = useRouter();
const route = useRoute();

function parseQueryRecord(q: LocationQuery): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(q)) {
    const v = q[k];
    if (typeof v === "string" && v !== "") {
      out[k] = v;
    } else if (Array.isArray(v)) {
      const s = v.find((x) => typeof x === "string" && x !== "");
      if (typeof s === "string") out[k] = s;
    }
  }
  return out;
}

watch(
  () => route.fullPath,
  () => {
    if (route.name === "patient") {
      lastPatientListQuery.value = parseQueryRecord(route.query);
    }
  },
  { immediate: true },
);

const MANUAL_LABELS_STORAGE_KEY = "patient-manual-group-labels";

const manualGroupDialogVisible = ref(false);
const manualGroupDialogMode = ref<"add" | "edit">("add");
/** 编辑时的原名称 */
const manualGroupEditOriginal = ref<string | null>(null);
const manualGroupFormRef = ref<FormInstance>();
const manualGroupSaving = ref(false);
const manualGroupForm = reactive({ name: "" });
const manualGroupRules: FormRules = {
  name: [{ required: true, message: "请输入分组名称", trigger: "blur" }],
};

const sidebarTab = ref<"group" | "recent">("group");
const autoOpen = ref(true);
const manualOpen = ref(true);

/** 点击「分组」：切到分组面板并进入患者列表（恢复上次列表的 scope/keyword） */
function onClickGroupTab() {
  sidebarTab.value = "group";
  if (route.name === "patient-detail" || route.name !== "patient") {
    router.push({ name: "patient", query: { ...lastPatientListQuery.value } });
  }
}

/** 点击「最近」：切到最近面板；若有最近记录则打开首位患者详情 */
function onClickRecentTab() {
  sidebarTab.value = "recent";
  syncRecentPatientsFromStorage();
  const top = recentPatients.value[0];
  if (top != null) {
    goPatient(top.id);
  }
}

/** 手动分组标签（无内置默认项；可编辑/删除，持久化到 localStorage） */
const manualLabels = ref<string[]>([]);

function loadManualLabelsFromStorage() {
  try {
    const raw = localStorage.getItem(MANUAL_LABELS_STORAGE_KEY);
    if (raw == null || raw === "") {
      manualLabels.value = [];
      return;
    }
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) {
      manualLabels.value = [];
      return;
    }
    const next = arr
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((x) => x.length > 0);
    manualLabels.value = next;
  } catch {
    manualLabels.value = [];
  }
}

function persistManualLabels() {
  try {
    localStorage.setItem(MANUAL_LABELS_STORAGE_KEY, JSON.stringify(manualLabels.value));
  } catch {
    /* ignore */
  }
}

const counts = ref<PatientSidebarCounts>({
  total: 0,
  myPatients: 0,
  auto: { notVisitedOverYear: 0 },
});

function fmtCount(n: number) {
  return Number.isFinite(n) ? String(n) : "—";
}

async function loadCounts() {
  try {
    const res: any = await getPatientSidebarCountsApi();
    if (res?.data) counts.value = res.data as PatientSidebarCounts;
  } catch {
    /* 拦截器已提示 */
  }
}

/** 列表页用当前 URL；详情页用离开列表前保存的快照，避免切到「最近」后分组高亮被清空 */
function effectiveListQuery(): Record<string, string> | null {
  if (route.name === "patient") return parseQueryRecord(route.query);
  if (route.name === "patient-detail") return { ...lastPatientListQuery.value };
  return null;
}

function isScopeActive(scope: string) {
  const q = effectiveListQuery();
  if (!q) return false;
  const kw = typeof q.keyword === "string" ? q.keyword.trim() : "";
  if (kw) return false;
  const s = q.scope;
  const cur = typeof s === "string" && s.trim() ? s.trim() : "all";
  return cur === scope;
}

function isManualKeywordActive(label: string) {
  const q = effectiveListQuery();
  if (!q) return false;
  const kw = typeof q.keyword === "string" ? q.keyword.trim() : "";
  return kw === label;
}

/** 系统规则自动分组：编辑/删除占位（与产品示意一致，规则由后端定义） */
function onAutoSubGroupCommand(cmd: string) {
  if (cmd === "edit") {
    return;
  }
  if (cmd === "delete") {
    ElMessage.warning("系统默认分组不可删除");
  }
}

function handleManualDropdownCommand(label: string) {
  return (cmd: string) => onManualSubGroupCommand(cmd, label);
}

async function onManualSubGroupCommand(cmd: string, label: string) {
  if (cmd === "edit") {
    openManualGroupDialog("edit", label);
    return;
  }
  if (cmd === "delete") {
    try {
      await ElMessageBox.confirm(`确定删除分组「${label}」？删除后不可恢复。`, "删除分组", {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
      });
    } catch {
      return;
    }
    manualLabels.value = manualLabels.value.filter((x) => x !== label);
    persistManualLabels();
    const kw = typeof route.query.keyword === "string" ? route.query.keyword.trim() : "";
    if (route.name === "patient" && kw === label) {
      router.replace({ name: "patient", query: {} });
    }
    ElMessage.success("已删除");
  }
}

/** 自动分组：保存患者查询条件，患者列表数量随条件变化而变化（点击子项携带 `scope` 跳转列表） */
function goPatientList(scope: string) {
  const q: Record<string, string> = {};
  if (scope !== "all") q.scope = scope;
  router.push({ name: "patient", query: q });
}

/** 手动分组：保存患者查询结果，患者列表支持批量操作增减患者（当前以治疗类目关键词筛列表） */
function goManualGroup(label: string) {
  router.push({ name: "patient", query: { keyword: label } });
}

function goPatient(id: number) {
  router.push(`/patient/${id}`);
}

function onAddAutoGroupClick() {}

function openManualGroupDialog(mode: "add" | "edit", editLabel?: string) {
  manualGroupDialogMode.value = mode;
  if (mode === "edit" && editLabel != null) {
    manualGroupEditOriginal.value = editLabel;
    manualGroupForm.name = editLabel;
  } else {
    manualGroupEditOriginal.value = null;
    manualGroupForm.name = "";
  }
  manualGroupDialogVisible.value = true;
  nextTick(() => manualGroupFormRef.value?.clearValidate());
}

function onManualGroupDialogClosed() {
  manualGroupEditOriginal.value = null;
  manualGroupForm.name = "";
}

async function submitManualGroupDialog() {
  const valid = await manualGroupFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  const name = String(manualGroupForm.name ?? "").trim();
  if (!name) return;

  const original = manualGroupEditOriginal.value;
  if (manualGroupDialogMode.value === "edit" && original != null && name === original) {
    manualGroupDialogVisible.value = false;
    return;
  }

  const duplicate = manualLabels.value.some((x) => x === name && x !== original);
  if (duplicate) {
    ElMessage.warning("已存在同名分组");
    return;
  }

  manualGroupSaving.value = true;
  try {
    if (manualGroupDialogMode.value === "add") {
      manualLabels.value = [...manualLabels.value, name];
      persistManualLabels();
    } else {
      if (original == null) return;
      const idx = manualLabels.value.indexOf(original);
      if (idx === -1) return;
      manualLabels.value[idx] = name;
      manualLabels.value = [...manualLabels.value];
      persistManualLabels();
      const kw = typeof route.query.keyword === "string" ? route.query.keyword.trim() : "";
      if (route.name === "patient" && kw === original) {
        router.replace({ name: "patient", query: { ...route.query, keyword: name } });
      }
    }
    ElMessage.success("已保存");
    manualGroupDialogVisible.value = false;
  } finally {
    manualGroupSaving.value = false;
  }
}

function onStorage(e: StorageEvent) {
  if (e.key === RECENT_PATIENTS_STORAGE_KEY || e.key == null) {
    syncRecentPatientsFromStorage();
  }
  if (e.key === MANUAL_LABELS_STORAGE_KEY || e.key == null) {
    loadManualLabelsFromStorage();
  }
}

watch(sidebarTab, (t) => {
  if (t === "group") loadCounts();
});

watch(
  () => route.name,
  (name) => {
    if (name === "patient-detail") {
      sidebarTab.value = "recent";
    }
  },
  { immediate: true },
);

onMounted(() => {
  syncRecentPatientsFromStorage();
  loadManualLabelsFromStorage();
  window.addEventListener("storage", onStorage);
  loadCounts();
});

onUnmounted(() => {
  window.removeEventListener("storage", onStorage);
});
</script>

<style scoped>
.patient-sidebar {
  width: 256px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  box-sizing: border-box;
  align-self: flex-start;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.patient-sidebar__tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.patient-sidebar__tab {
  flex: 1;
  padding: 12px 8px 10px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.patient-sidebar__tab:hover {
  color: #303133;
}

.patient-sidebar__tab.active {
  color: #13c2c2;
  font-weight: 600;
}

.patient-sidebar__tab.active::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  top: 0;
  height: 3px;
  border-radius: 0 0 2px 2px;
  background: linear-gradient(90deg, #36cfc9, #1890ff);
}

.patient-sidebar__panel {
  padding: 8px 0 12px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.patient-sidebar__panel--group {
  padding-left: 0;
  padding-right: 0;
}

.patient-sidebar__group-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 10px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #303133;
  transition: background 0.15s;
}

.patient-sidebar__group-row:hover {
  background: #fafafa;
}

.patient-sidebar__group-row.active {
  background: #e6f7ff;
}

.patient-sidebar__group-row--top {
  border-bottom: 1px solid #f5f5f5;
}

.patient-sidebar__group-row--sub {
  padding-left: 20px;
}

.patient-sidebar__group-icon {
  flex-shrink: 0;
  font-size: 16px;
}

.patient-sidebar__group-icon--primary {
  color: #1890ff;
}

.patient-sidebar__group-icon--muted {
  color: #595959;
}

.patient-sidebar__group-icon--sub {
  color: #bfbfbf;
  font-size: 15px;
}

.patient-sidebar__group-label {
  flex: 1;
  min-width: 0;
}

.patient-sidebar__group-label--ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patient-sidebar__group-count {
  flex-shrink: 0;
  color: #8c8c8c;
  font-variant-numeric: tabular-nums;
}

.patient-sidebar__group-manual-spacer {
  flex: 1;
  min-width: 0;
}

.patient-sidebar__group-dropdown {
  flex-shrink: 0;
  line-height: 1;
}

.patient-sidebar__group-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  margin-left: 2px;
  border-radius: 4px;
  color: #8c8c8c;
  opacity: 0.75;
}

.patient-sidebar__group-more:hover {
  color: #1890ff;
  background: rgba(24, 144, 255, 0.08);
  opacity: 1;
}

.patient-sidebar__group-row--sub:hover .patient-sidebar__group-more {
  opacity: 1;
}

.patient-sidebar__section {
  border-bottom: 1px solid #f0f0f0;
}

.patient-sidebar__section--manual .patient-sidebar__section-head--muted {
  background: #fafafa;
}

.patient-sidebar__section-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 10px 10px 0;
  cursor: pointer;
  user-select: none;
}

.patient-sidebar__section-accent {
  width: 3px;
  align-self: stretch;
  min-height: 18px;
  background: #1890ff;
  border-radius: 0 2px 2px 0;
  flex-shrink: 0;
}

.patient-sidebar__section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.patient-sidebar__section-head-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.patient-sidebar__section-action-icon {
  font-size: 15px;
  color: #8c8c8c;
  cursor: pointer;
}

.patient-sidebar__section-action-icon:hover {
  color: #1890ff;
}

.patient-sidebar__section-chevron {
  font-size: 12px;
  color: #bfbfbf;
}

.patient-sidebar__section-body {
  padding-bottom: 4px;
}

.patient-sidebar__manual-group-empty {
  padding: 10px 20px 14px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.patient-sidebar__panel--recent {
  padding: 8px 12px 12px;
}

.patient-sidebar__recent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.patient-sidebar__recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.patient-sidebar__recent-item:hover {
  background: #f5f7fa;
}

.patient-sidebar__recent-item.active {
  background: #ecf5ff;
}

.patient-sidebar__recent-avatar {
  background: linear-gradient(135deg, #667eea, #764ba2);
  font-weight: 600;
  flex-shrink: 0;
}

.patient-sidebar__recent-name {
  font-size: var(--el-font-size-small);
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
