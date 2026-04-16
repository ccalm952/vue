<template>
  <!-- 顶栏：左 菜单+导航 | 右 搜索+新增患者+用户 -->
  <el-container class="app-layout">
    <!-- 顶栏容器 -->
    <el-header class="app-header">
      <!-- 顶栏左：打开侧栏按钮 + 横向路由菜单 -->
      <div class="header-left">
        <el-button
          class="nav-menu-trigger"
          text
          native-type="button"
          :aria-expanded="navDrawerVisible"
          @click="navDrawerVisible = true"
        >
          <img class="nav-menu-trigger-icon" src="/favicon.png" alt="" decoding="async" />
        </el-button>
        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          :ellipsis="false"
          router
          class="header-menu"
        >
          <NavMenuItems :entries="TOP_NAV_ENTRIES" :is-admin="isAdmin" variant="header" />
        </el-menu>
      </div>

      <!-- 顶栏右：搜索+新增患者+用户 -->
      <div class="header-right">
        <!-- 搜索：按钮打开弹窗 -->
        <div class="header-search-actions">
          <el-button
            type="primary"
            text
            bg
            class="header-search-actions__trigger"
            aria-label="搜索患者"
            @click="openSearchDialog"
          >
            <svg
              class="header-search-actions__icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1024 1024"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="m795.904 750.72 124.992 124.928a32 32 0 0 1-45.248 45.248L750.656 795.904a416 416 0 1 1 45.248-45.248zM480 832a352 352 0 1 0 0-704 352 352 0 0 0 0 704"
              />
            </svg>
            搜索
          </el-button>
        </div>

        <el-dialog
          v-model="searchDialogOpen"
          title="搜索患者"
          width="min(560px, calc(100vw - 32px))"
          append-to-body
          class="patient-search-dialog"
          @opened="focusPatientSearchInput"
          @closed="closeSearchDialog"
        >
          <div
            class="patient-search-dialog__inner"
            tabindex="-1"
            @keydown.capture="onPatientSearchKeydown"
          >
            <el-input
              ref="patientSearchInputRef"
              v-model="searchKeyword"
              clearable
              class="patient-search-dialog__input"
              placeholder="搜索姓名 / 手机 / 病历号"
            />
            <div
              v-if="headerSearchDropdownVisible"
              class="patient-search-dialog__list"
              role="listbox"
              @mousedown.prevent
            >
              <div
                v-if="headerSearchLoading && !headerSearchResults.length"
                class="patient-search-dialog__loading"
              >
                搜索中…
              </div>
              <el-scrollbar v-else-if="headerSearchResults.length" max-height="min(360px, 45vh)">
                <div
                  v-for="(row, idx) in headerSearchResults"
                  :key="row.id"
                  class="patient-search-dialog__item"
                  :class="{
                    'patient-search-dialog__item--highlight': highlightedSearchIndex === idx,
                  }"
                  role="option"
                  @mousedown.prevent="openPatientDetail(row)"
                >
                  <div class="patient-search-dialog__item-name">{{ row.name || "—" }}</div>
                  <div class="patient-search-dialog__item-meta">
                    <span>病历号 {{ row.source || "—" }}</span>
                    <span class="meta-dot">·</span>
                    <span>手机 {{ row.phone || "—" }}</span>
                    <span class="meta-dot">·</span>
                    <span
                      >年龄 {{ row.age != null && row.age !== "" ? `${row.age} 岁` : "—" }}</span
                    >
                    <span class="meta-dot">·</span>
                    <span>初诊医生 {{ row.firstVisit || "—" }}</span>
                  </div>
                  <div class="patient-search-dialog__item-time">
                    创建时间：{{ formatDateYyyyMmDd(row.createdAt) }}
                  </div>
                </div>
              </el-scrollbar>
              <div v-else class="patient-search-dialog__empty">未找到患者</div>
            </div>
            <p v-else class="patient-search-dialog__placeholder">输入关键词搜索患者</p>
            <div class="patient-search-dialog__hints" aria-hidden="true">
              <span><kbd>Enter</kbd> 选择</span>
              <span class="patient-search-dialog__hints-sep">·</span>
              <span><kbd>↑</kbd><kbd>↓</kbd> 切换</span>
              <span class="patient-search-dialog__hints-sep">·</span>
              <span><kbd>Esc</kbd> 关闭</span>
              <span class="patient-search-dialog__hints-sep">·</span>
              <span><kbd>Ctrl</kbd><kbd>K</kbd> 打开</span>
            </div>
          </div>
        </el-dialog>

        <!-- 新增患者 -->
        <div class="header-patient-actions">
          <el-button
            type="success"
            text
            bg
            class="header-patient-actions__btn"
            aria-label="新增患者"
            @click="headerAddPatientOpen = true"
          >
            <svg
              class="header-patient-actions__icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1024 1024"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M480 480V128a32 32 0 0 1 64 0v352h352a32 32 0 1 1 0 64H544v352a32 32 0 1 1-64 0V544H128a32 32 0 0 1 0-64z"
              />
            </svg>
          </el-button>
        </div>

        <!-- 新增患者弹窗 -->
        <PatientAddEditDialog v-model="headerAddPatientOpen" />

        <!-- 用户 -->
        <el-dropdown trigger="hover" popper-class="user-dropdown-popper" @command="handleCommand">
          <span class="el-dropdown-link avatar-wrapper" tabindex="0">
            <el-avatar shape="circle" class="user-avatar">
              <span>{{ displayName.charAt(0) }}</span>
            </el-avatar>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <div class="dropdown-header">
                <el-avatar shape="circle" class="dropdown-avatar">
                  <span>{{ displayName.charAt(0) }}</span>
                </el-avatar>
                <div class="dropdown-user-info">
                  <div class="dropdown-user-name">{{ displayName }}</div>
                </div>
              </div>
              <el-dropdown-item divided :icon="User" command="profile"> 个人中心 </el-dropdown-item>
              <el-dropdown-item :icon="Setting" command="settings"> 系统设置 </el-dropdown-item>
              <el-dropdown-item divided :icon="SwitchButton" command="logout">
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <!-- 侧栏抽屉：小屏或点击 Logo 旁按钮时打开；与顶栏共用同一套 NavMenuItems -->
    <el-drawer
      v-model="navDrawerVisible"
      direction="ltr"
      size="280px"
      title="口腔门诊管理系统"
      append-to-body
      class="nav-side-drawer"
    >
      <el-menu
        :default-active="activeMenu"
        mode="vertical"
        router
        class="drawer-nav-menu"
        @select="closeNavDrawer"
      >
        <NavMenuItems :entries="TOP_NAV_ENTRIES" :is-admin="isAdmin" variant="drawer" />
      </el-menu>
    </el-drawer>

    <!-- 主内容区：子路由 outlet（工作台 / 患者 / 预约 / 种植 / 考勤 等页面） -->
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { User, Setting, SwitchButton } from "@element-plus/icons-vue";
import type { InputInstance } from "element-plus";
import { useAuthStore } from "@/stores/auth-store";
import { formatDateYyyyMmDd } from "@/utils/datetime";
import { TOP_NAV_ENTRIES, resolveActiveMenuPath } from "@/config/top-nav";
import { useHeaderPatientSearch } from "@/composables/useHeaderPatientSearch";
import NavMenuItems from "@/layouts/NavMenuItems.vue";
import PatientAddEditDialog from "@/components/patient/PatientAddEditDialog.vue";

const route = useRoute();
const authStore = useAuthStore();
const navDrawerVisible = ref(false);
const headerAddPatientOpen = ref(false);

const {
  searchDialogOpen,
  searchKeyword,
  headerSearchResults,
  headerSearchLoading,
  headerSearchDropdownVisible,
  highlightedSearchIndex,
  openSearchDialog,
  closeSearchDialog,
  openPatientDetail,
  moveHighlight,
  openHighlightedPatient,
} = useHeaderPatientSearch();

const patientSearchInputRef = ref<InputInstance>();

function focusPatientSearchInput() {
  nextTick(() => {
    patientSearchInputRef.value?.focus();
    requestAnimationFrame(() => {
      patientSearchInputRef.value?.focus();
    });
  });
}

function onPatientSearchKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") return;
  if (!headerSearchDropdownVisible.value || !headerSearchResults.value.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    moveHighlight(1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    moveHighlight(-1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    openHighlightedPatient();
  }
}

function onGlobalSearchShortcut(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openSearchDialog();
  }
}

function closeNavDrawer() {
  navDrawerVisible.value = false;
}

const displayName = computed(() => authStore.userInfo?.realName || "用户");
const isAdmin = computed(() => authStore.userInfo?.role === "管理员");
const activeMenu = computed(() => resolveActiveMenuPath(route.path));

function scheduleIdlePrefetch() {
  const run = () => {
    void import("@/views/workspace/appointments.vue");
  };
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 2500);
  }
}

onMounted(() => {
  window.addEventListener("keydown", onGlobalSearchShortcut);
  if (!authStore.userInfo) {
    authStore.fetchUserInfo().catch(() => {});
  }
  scheduleIdlePrefetch();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onGlobalSearchShortcut);
});

async function handleCommand(command: string) {
  switch (command) {
    case "profile":
      break;
    case "settings":
      break;
    case "logout":
      try {
        await ElMessageBox.confirm("确定要退出登录吗？", "提示", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
        });
        await authStore.logout();
      } catch {
        // 取消
      }
      break;
  }
}
</script>

<style scoped>
.app-header.el-header {
  height: 64px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
}

/* 左侧：汉堡按钮与横向菜单同一行 */
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 72px;
}

.nav-menu-trigger.el-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px;
}

.nav-menu-trigger-icon {
  display: block;
  height: 32px;
  width: 32px;
  object-fit: contain;
  pointer-events: none;
}

/* ── el-menu 导航（顶栏横向） ── */
.header-menu {
  border-bottom: none;
  background: transparent;
  align-items: center;
  gap: 16px;
  overflow: hidden;
}

.header-menu :deep(.el-menu-item) {
  height: 32px;
  padding: 0 8px;
}

.header-menu :deep(.el-sub-menu__title) {
  height: 32px;
  padding: 0 8px;
}

.header-menu :deep(.el-sub-menu__icon-arrow) {
  display: none;
}

/* 顶栏：搜索入口 */
.header-search-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.header-search-actions__trigger {
  flex-shrink: 0;
  padding: 8px;
}

.header-search-actions__icon {
  display: block;
  flex-shrink: 0;
  height: 16px;
  width: 16px;
  padding: 0 8px 0 0;
}

/* 患者搜索弹窗（内容在 .patient-search-dialog 上需 :deep 穿透 el-dialog） */
.patient-search-dialog__inner {
  outline: none;
}

.patient-search-dialog__input {
  width: 100%;
}

.patient-search-dialog__input :deep(.el-input__wrapper) {
  align-items: center;
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--el-border-color-lighter) inset;
  transition:
    box-shadow 0.15s,
    background 0.15s;
}

.patient-search-dialog__input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary-light-5) inset;
}

.patient-search-dialog__input :deep(.el-input__wrapper:hover),
.patient-search-dialog__input :deep(.el-input__wrapper.is-focus) {
  background: var(--el-color-primary-light-8);
}

.patient-search-dialog__placeholder {
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-small);
  margin: 12px 0 0;
}

.patient-search-dialog__list {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  margin-top: 12px;
  overflow: hidden;
  text-align: left;
}

.patient-search-dialog__loading {
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-small);
  padding: 16px 14px;
  text-align: center;
}

.patient-search-dialog__item {
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  padding: 12px 14px;
  transition: background 0.12s;
}

.patient-search-dialog__item:last-child {
  border-bottom: none;
}

.patient-search-dialog__item:hover,
.patient-search-dialog__item--highlight {
  background: var(--el-color-primary-light-9);
}

.patient-search-dialog__item-name {
  color: var(--el-text-color-primary);
  font-size: var(--el-font-size-base);
  font-weight: 600;
  margin-bottom: 6px;
}

.patient-search-dialog__item-meta {
  align-items: center;
  color: var(--el-text-color-regular);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--el-font-size-extra-small);
  gap: 4px 0;
  line-height: 1.6;
}

.patient-search-dialog__item-meta .meta-dot {
  color: var(--el-text-color-placeholder);
  padding: 0 6px;
  user-select: none;
}

.patient-search-dialog__item-time {
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-extra-small);
  margin-top: 6px;
}

.patient-search-dialog__empty {
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-small);
  padding: 24px 14px;
  text-align: center;
}

.patient-search-dialog__hints {
  align-items: center;
  border-top: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  gap: 4px 8px;
  margin-top: 14px;
  padding-top: 12px;
}

.patient-search-dialog__hints kbd {
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
  padding: 2px 6px;
}

.patient-search-dialog__hints-sep {
  color: var(--el-text-color-placeholder);
  user-select: none;
}

/* 顶栏：新增患者 */
.header-patient-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.header-patient-actions__btn {
  flex-shrink: 0;
  padding: 8px;
}

.header-patient-actions__icon {
  display: block;
  height: 16px;
  width: 16px;
}

/* 右侧：搜索 + 头像，整体贴右 */
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  width: 32px;
  height: 32px;
}
.avatar-wrapper.el-dropdown-link {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* 下拉菜单头部 */
.dropdown-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 16px;
}

.dropdown-avatar {
  flex-shrink: 0;
}

.dropdown-user-info {
  flex: 1;
  min-width: 120px;
}

.dropdown-user-name {
  font-size: var(--el-font-size-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 内容区：占满顶栏下方剩余高度，子页面可用 flex:1 铺满；与文档示例一致去掉 el-main 默认内边距 */
.app-main.el-main {
  --el-main-padding: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

/* ≤1366px：隐藏顶栏横向菜单，用左侧按钮打开抽屉导航；搜索框 16px 避免 iOS 聚焦自动缩放 */
@media (max-width: 730px) {
  .header-menu {
    display: none;
  }

  .patient-search-dialog__input :deep(input) {
    font-size: 16px;
  }
}
</style>

<!-- 下拉层 teleport 到 body，需非 scoped -->
<style>
.user-dropdown-popper.el-popper {
  min-width: 220px;
  box-sizing: border-box;
}

.nav-side-drawer.el-drawer .el-drawer__body {
  padding: 0;
}

.nav-side-drawer .drawer-nav-menu.el-menu {
  border-right: none;
}
</style>
