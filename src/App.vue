<template>
  <el-config-provider :locale="zhCn" :card="cardConfig">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import zhCn from "element-plus/es/locale/lang/zh-cn";

const cardConfig = reactive({
  shadow: "hover" as const,
});
</script>
