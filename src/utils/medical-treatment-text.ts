function parseTableLinesToRows(lines: string[]): { tooth: string; disposal: string }[] {
  const rows: { tooth: string; disposal: string }[] = [];
  const flat = lines.map((l) => l.trim()).filter(Boolean);
  if (!flat.length) return rows;

  for (const s of flat) {
    if (s.includes("\t")) {
      const i = s.indexOf("\t");
      rows.push({ tooth: s.slice(0, i).trim(), disposal: s.slice(i + 1).trim() });
    }
  }
  if (rows.length) return rows;

  for (const s of flat) {
    const m = /^(.*?)([：:])(.+)$/.exec(s);
    if (m && m[1]!.trim() && m[3]!.trim()) {
      rows.push({ tooth: m[1]!.trim(), disposal: m[3]!.trim() });
    } else {
      const tokens = s.split(/\s+/).filter(Boolean);
      if (tokens.length >= 2 && tokens.length % 2 === 0) {
        for (let k = 0; k < tokens.length; k += 2) {
          rows.push({ tooth: tokens[k]!, disposal: tokens[k + 1]! });
        }
      } else if (tokens.length >= 2) {
        const pair = /^(\S+)\s+(.+)$/.exec(s);
        if (pair) rows.push({ tooth: pair[1]!.trim(), disposal: pair[2]!.trim() });
        else rows.push({ tooth: "", disposal: s });
      } else {
        rows.push({ tooth: "", disposal: s });
      }
    }
  }
  return rows;
}

/** 解析处置：多行文本，一行一条；可解析为「牙位 + 处置」表格行时放入 rows，否则整段作 notes。 */
export function parseMedicalTreatmentParts(full: string): {
  rows: { tooth: string; disposal: string }[];
  notes: string;
  plain: string;
} {
  const t = (full || "").trim();
  if (!t) return { rows: [], notes: "", plain: "" };

  const rows = parseTableLinesToRows(t.split(/\r?\n/));
  if (rows.length) return { rows, notes: "", plain: t };
  return { rows: [], notes: t, plain: t };
}

const MR_SUMMARY_GROUP_GAP = "\u00A0\u00A0\u00A0";

/** 病历卡片折叠行：多行压成一行展示 */
export function treatmentSummaryLine(full: string): string {
  const parts = parseMedicalTreatmentParts(full || "");
  if (parts.rows.length) {
    const rowStr = parts.rows
      .map((r) => {
        const a = r.tooth.trim();
        const b = r.disposal.trim();
        if (a && b) return `${a}：${b}`;
        return a || b;
      })
      .filter(Boolean)
      .join(MR_SUMMARY_GROUP_GAP);
    if (parts.notes.trim()) {
      return rowStr ? `${rowStr} ｜ ${parts.notes.trim()}` : parts.notes.trim();
    }
    return rowStr;
  }
  return (parts.notes || parts.plain || "").trim();
}

export function treatmentPlanSummaryLine(plan: string): string {
  const s = (plan || "").trim();
  if (!s) return "";
  const first = (s.split(/\r?\n/).find((x) => x.trim()) ?? s).trim();
  return first.length > 160 ? `${first.slice(0, 160)}…` : first;
}
