import { ref } from "vue";

export const PATIENT_TAGS_STORAGE_KEY = "patient-custom-tags";

/** 与「设置 → 患者标签」页共用；新增/编辑患者时下拉选项来自此列表 */
export const patientTagOptions = ref<string[]>([]);

export function loadPatientTagOptions() {
  try {
    const raw = localStorage.getItem(PATIENT_TAGS_STORAGE_KEY);
    if (raw == null || raw === "") {
      patientTagOptions.value = [];
      return;
    }
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) {
      patientTagOptions.value = [];
      return;
    }
    const next = arr
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((x) => x.length > 0);
    patientTagOptions.value = [...new Set(next)];
  } catch {
    patientTagOptions.value = [];
  }
}

/** 去重、去空后写入 localStorage 并更新内存 */
export function savePatientTagOptions(tags: string[]) {
  const next = [...new Set(tags.map((t) => String(t).trim()).filter((t) => t.length > 0))];
  patientTagOptions.value = next;
  try {
    localStorage.setItem(PATIENT_TAGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function ensurePatientTagOptionsLoaded() {
  loadPatientTagOptions();
}
