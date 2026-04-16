<script setup lang="ts">
import type { TopNavEntry } from "@/config/top-nav";
import { navEntryKey } from "@/config/top-nav";

const props = defineProps<{
  entries: TopNavEntry[];
  isAdmin: boolean;
  variant: "header" | "drawer";
}>();

function rowKey(entry: TopNavEntry): string {
  return props.variant === "drawer" ? `d-${navEntryKey(entry)}` : navEntryKey(entry);
}

function submenuIndex(key: string): string {
  return props.variant === "header" ? `sub-${key}` : `d-sub-${key}`;
}

function attendanceIndex(): string {
  return props.variant === "header" ? "sub-attendance" : "d-sub-attendance";
}
</script>

<template>
  <template v-for="entry in entries" :key="rowKey(entry)">
    <el-menu-item v-if="entry.type === 'item'" :index="entry.path">
      {{ entry.label }}
    </el-menu-item>

    <el-sub-menu
      v-else-if="entry.type === 'submenu'"
      :index="submenuIndex(entry.key)"
      :popper-class="variant === 'header' ? 'header-submenu-popper' : undefined"
    >
      <template #title>{{ entry.title }}</template>
      <el-menu-item v-for="c in entry.children" :key="c.path" :index="c.path">
        {{ c.label }}
      </el-menu-item>
    </el-sub-menu>

    <template v-else-if="entry.type === 'attendance'">
      <el-sub-menu
        v-if="isAdmin"
        :index="attendanceIndex()"
        :popper-class="variant === 'header' ? 'header-submenu-popper' : undefined"
      >
        <template #title>{{ entry.title }}</template>
        <el-menu-item v-for="c in entry.children" :key="c.path" :index="c.path">
          {{ c.label }}
        </el-menu-item>
      </el-sub-menu>
      <el-menu-item v-else :index="entry.singlePath">{{ entry.title }}</el-menu-item>
    </template>
  </template>
</template>
