import { ref } from "vue";

export const RECENT_PATIENTS_STORAGE_KEY = "recentPatients";

export interface RecentPatient {
  id: number;
  name: string;
}

/** 与患者详情、列表侧栏共享，保证写入后各处同步更新 */
export const recentPatients = ref<RecentPatient[]>([]);

export function syncRecentPatientsFromStorage() {
  try {
    const raw = localStorage.getItem(RECENT_PATIENTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    recentPatients.value = Array.isArray(parsed) ? parsed : [];
  } catch {
    recentPatients.value = [];
  }
}

/** 将患者置顶到「最近打开」，最多保留 20 条 */
export function addRecentPatient(p: { id: number; name: string }) {
  syncRecentPatientsFromStorage();
  const list = recentPatients.value.filter((r) => r.id !== p.id);
  list.unshift({ id: p.id, name: p.name });
  if (list.length > 20) list.length = 20;
  localStorage.setItem(RECENT_PATIENTS_STORAGE_KEY, JSON.stringify(list));
  recentPatients.value = list;
}
