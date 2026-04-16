/**
 * 预约项目展示：接口/表单常存为 JSON 数组字符串（如 []、["洁治"]），空选时应显示为空而非 []。
 */
export function formatAppointmentItemsDisplay(raw: unknown): string {
  if (raw == null) return "";
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean).join("、") || "";
  }
  const s = String(raw).trim();
  if (!s || s === "[]") return "";
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean).join("、") || "";
      }
    } catch {
      /* 非合法 JSON 数组则原样展示 */
    }
  }
  return s;
}
