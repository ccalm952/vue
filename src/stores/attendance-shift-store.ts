import { defineStore } from "pinia";
import { ref } from "vue";
import {
  attendanceShiftConfig as defaultAttendanceShiftConfig,
  type AttendanceShiftFullConfig,
} from "@/config/attendance-shift";

const STORAGE_KEY = "attendance-shift-config-v1";

function cloneDefaults(): AttendanceShiftFullConfig {
  const d = defaultAttendanceShiftConfig;
  return {
    morning: { ...d.morning },
    afternoon: { ...d.afternoon },
    morningInWindowStart: d.morningInWindowStart,
    morningInWindowEnd: d.morningInWindowEnd,
    morningOutLatest: d.morningOutLatest,
    morningFirstOrderUntil: d.morningFirstOrderUntil,
    afternoonClockInEarliest: d.afternoonClockInEarliest,
    overtimeMorningNormalEnd: d.overtimeMorningNormalEnd,
    overtimeAfternoonNormalEnd: d.overtimeAfternoonNormalEnd,
  };
}

function loadFromStorage(): AttendanceShiftFullConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw) as Partial<AttendanceShiftFullConfig>;
    const base = cloneDefaults();
    const mergedMorning = { ...base.morning, ...parsed.morning };
    return {
      morning: mergedMorning,
      afternoon: { ...base.afternoon, ...parsed.afternoon },
      morningInWindowStart:
        parsed.morningInWindowStart ?? parsed.morning?.rangeStart ?? base.morningInWindowStart,
      morningInWindowEnd:
        parsed.morningInWindowEnd ?? parsed.morning?.rangeEnd ?? base.morningInWindowEnd,
      morningOutLatest: parsed.morningOutLatest ?? base.morningOutLatest,
      morningFirstOrderUntil: parsed.morningFirstOrderUntil ?? base.morningFirstOrderUntil,
      afternoonClockInEarliest:
        parsed.afternoonClockInEarliest ??
        parsed.afternoon?.rangeStart ??
        base.afternoonClockInEarliest,
      overtimeMorningNormalEnd: parsed.overtimeMorningNormalEnd ?? base.overtimeMorningNormalEnd,
      overtimeAfternoonNormalEnd:
        parsed.overtimeAfternoonNormalEnd ?? base.overtimeAfternoonNormalEnd,
    };
  } catch {
    return cloneDefaults();
  }
}

export const useAttendanceShiftStore = defineStore("attendanceShift", () => {
  const merged = ref<AttendanceShiftFullConfig>(loadFromStorage());

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.value));
  }

  function setFullConfig(next: AttendanceShiftFullConfig) {
    merged.value = next;
    persist();
  }

  function resetToDefaults() {
    merged.value = cloneDefaults();
    localStorage.removeItem(STORAGE_KEY);
  }

  return { merged, setFullConfig, resetToDefaults, cloneDefaults };
});
