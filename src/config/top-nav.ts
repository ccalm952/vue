/** 顶栏与侧栏抽屉共用；数组顺序即展示顺序 */

export type NavMenuChild = { label: string; path: string };

export type TopNavEntry =
  | { type: "item"; label: string; path: string }
  | { type: "submenu"; key: string; title: string; children: NavMenuChild[] }
  | { type: "attendance"; title: string; singlePath: string; children: NavMenuChild[] };

export const TOP_NAV_ENTRIES: TopNavEntry[] = [
  { type: "item", label: "工作台", path: "/dashboard" },
  { type: "item", label: "患者", path: "/patient" },
  { type: "item", label: "预约", path: "/appointments" },
  {
    type: "submenu",
    key: "reports",
    title: "报表",
    children: [{ label: "营收分析", path: "/reports/revenue" }],
  },
  {
    type: "submenu",
    key: "planting",
    title: "种植",
    children: [
      { label: "查询", path: "/planting/query" },
      { label: "新增种植记录", path: "/planting/add" },
      { label: "库存", path: "/planting/inventory" },
      { label: "种植患者", path: "/planting/patient" },
      { label: "统计", path: "/planting/stats" },
    ],
  },
  {
    type: "attendance",
    title: "考勤",
    singlePath: "/attendance",
    children: [
      { label: "打卡", path: "/attendance" },
      { label: "统计", path: "/attendance/stats" },
    ],
  },
  {
    type: "submenu",
    key: "management",
    title: "管理",
    children: [{ label: "人员管理", path: "/management/staff" }],
  },
  {
    type: "submenu",
    key: "settings",
    title: "设置",
    children: [{ label: "患者标签", path: "/settings/patient-tags" }],
  },
];

export function navEntryKey(entry: TopNavEntry): string {
  if (entry.type === "item") return entry.path;
  if (entry.type === "submenu") return `sub-${entry.key}`;
  return "attendance";
}

/** 与 el-menu default-active 一致：子路由高亮具体 path，平级 tab 用前缀匹配 */
export function resolveActiveMenuPath(
  routePath: string,
  entries: TopNavEntry[] = TOP_NAV_ENTRIES,
): string {
  const p = routePath;
  if (p.startsWith("/management")) return p;
  if (p.startsWith("/attendance")) return p;
  if (p.startsWith("/reports")) return p;
  if (p.startsWith("/planting")) return p;
  if (p.startsWith("/settings")) return p;
  const item = entries.find(
    (e) => e.type === "item" && (p === e.path || p.startsWith(e.path + "/")),
  );
  return item?.type === "item" ? item.path : p;
}
