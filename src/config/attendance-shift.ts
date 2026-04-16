/**
 * 考勤班次与时间规则（前端展示 + 大按钮推荐顺序 + 加班阈值）
 * 修改此处即可统一调整，无需在页面内散落魔法数字。
 */

export interface AttendanceShiftSegment {
  /** 展示用，如「上午」「下午」 */
  label: string;
  /** 班次展示时段起点 HH:mm */
  rangeStart: string;
  /** 班次展示时段终点 HH:mm */
  rangeEnd: string;
}

export type AttendanceShiftFullConfig = {
  morning: AttendanceShiftSegment;
  afternoon: AttendanceShiftSegment;
  /** 仅允许在此墙钟区间内打「上午上班」（含边界分钟） */
  morningInWindowStart: string;
  morningInWindowEnd: string;
  /** 当日墙钟晚于此时间后不能再打「上午下班」（含补打/更新） */
  morningOutLatest: string;
  morningFirstOrderUntil: string;
  /** 当日时钟不早于此时才可打「下午上班」；早于此仅可补/改「上午下班」等 */
  afternoonClockInEarliest: string;
  overtimeMorningNormalEnd: string;
  overtimeAfternoonNormalEnd: string;
};

export const attendanceShiftConfig: AttendanceShiftFullConfig = {
  morning: {
    label: "上午",
    rangeStart: "08:30",
    rangeEnd: "12:00",
  } satisfies AttendanceShiftSegment,

  afternoon: {
    label: "下午",
    rangeStart: "14:30",
    rangeEnd: "18:00",
  } satisfies AttendanceShiftSegment,

  morningInWindowStart: "08:30",
  morningInWindowEnd: "12:00",
  morningOutLatest: "14:30",

  /** 与下午班次开始常见一致；可单独改，例如展示 14:30 但允许 14:00 打下午到 */
  afternoonClockInEarliest: "14:30",

  /**
   * 大按钮「建议下一打卡」顺序：
   * - 当日时刻（分）小于本时间：按 上午上班→上午下班→下午上班→下午下班 依次补全
   * - 大于等于：按 下午链优先，再补上午漏打（与原 hour < 13 行为一致时可设为 13:00）
   */
  morningFirstOrderUntil: "13:00",

  /**
   * 加班统计：正常下班不应晚于该时刻；超过部分计入加班（与展示班次结束可一致或单独设）
   */
  overtimeMorningNormalEnd: "12:00",
  overtimeAfternoonNormalEnd: "18:00",
} as const;

export function parseHHMM(s: string): { h: number; m: number } {
  const [h = 0, m = 0] = s.split(":").map((x) => Number(x));
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

/** 自 00:00 起的分钟数 */
export function minutesFromMidnight(timeHHMM: string): number {
  const { h, m } = parseHHMM(timeHHMM);
  return h * 60 + m;
}

/** 界面「08:30 - 12:00」 */
export function formatShiftRange(segment: AttendanceShiftSegment): string {
  return `${segment.rangeStart} - ${segment.rangeEnd}`;
}

/** 当前是否采用「上午序优先」的推荐顺序 */
export function isMorningFirstPunchOrder(
  now: Date,
  boundaryHHMM: string = attendanceShiftConfig.morningFirstOrderUntil,
): boolean {
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur < minutesFromMidnight(boundaryHHMM);
}

/** 当日墙钟是否已到/晚于 HH:mm（用于「下午上班最早可打」等） */
export function isWallClockAtOrAfter(now: Date, timeHHMM: string): boolean {
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= minutesFromMidnight(timeHHMM);
}

/** 当日墙钟是否在 [startHHMM, endHHMM] 内（含两端分钟） */
export function isWallClockInInclusiveRange(
  now: Date,
  startHHMM: string,
  endHHMM: string,
): boolean {
  const cur = now.getHours() * 60 + now.getMinutes();
  const a = minutesFromMidnight(startHHMM);
  const b = minutesFromMidnight(endHHMM);
  return cur >= a && cur <= b;
}

/** 当日墙钟是否不晚于 HH:mm（含该分钟），用于「上午下班最晚可打」 */
export function isWallClockAtOrBefore(now: Date, timeHHMM: string): boolean {
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur <= minutesFromMidnight(timeHHMM);
}
