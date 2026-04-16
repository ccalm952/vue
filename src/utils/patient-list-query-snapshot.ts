import { ref } from "vue";

/**
 * 最近一次患者列表 URL 的 query（scope / keyword 等）。
 * 列表与详情是不同路由、侧栏组件会随列表卸载，故不能放在组件内 ref，否则进详情后快照丢失。
 */
export const lastPatientListQuery = ref<Record<string, string>>({});
