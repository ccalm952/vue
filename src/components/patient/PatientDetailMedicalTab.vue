<template>
  <div class="patient-detail-medical-tab">
    <!-- 新建病历模式 -->
    <div v-if="mrEditorVisible" class="mr-editor">
      <div class="mr-editor-header">
        <span class="mr-editor-title">电子病历</span>
        <el-button @click="closeMrEditor">返回电子病历</el-button>
      </div>

      <div class="mr-row-top">
        <el-form-item label="医生" class="mr-field-doctor">
          <el-select
            v-model="mrForm.doctorId"
            placeholder="选择医生"
            style="width: 100%"
            @change="onMrDoctorChange"
          >
            <el-option
              v-for="doc in mrDoctorList"
              :key="doc.id"
              :label="doc.name"
              :value="doc.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="就诊时间" class="mr-field-time">
          <el-date-picker
            v-model="mrForm.visitTime"
            type="datetime"
            placeholder="选择就诊时间"
            value-format="YYYY-MM-DD HH:mm"
            format="YYYY-MM-DD HH:mm"
            style="width: 200px"
          />
          <el-checkbox v-model="mrCurrentTime" @change="onMrCurrentTimeChange"
            >当前时间</el-checkbox
          >
        </el-form-item>
      </div>

      <div class="mr-type-switch">
        <span class="mr-type-label">类型</span>
        <el-radio-group v-model="mrForm.type">
          <el-radio-button value="初诊病历">初诊病历</el-radio-button>
          <el-radio-button value="复诊病历">复诊病历</el-radio-button>
        </el-radio-group>
      </div>

      <div class="mr-fields">
        <template v-for="field in mrEditorLoopFields" :key="field.key">
          <div
            v-if="field.key === 'treatment'"
            class="mr-field-block mr-field-block--treatment-editor"
          >
            <div class="mr-field-label mr-field-label--required">{{ field.label }}</div>
            <div class="disposal-editor-wrap">
              <div class="disposal-layout disposal-layout--editor-stack">
                <button
                  type="button"
                  class="tooth-cross"
                  :style="toothCrossStyle"
                  @click="mrToothPickerVisible = true"
                >
                  <span class="tooth-cross__grid">
                    <span
                      v-for="cell in crossQuadrantCells"
                      :key="cell.className"
                      class="tooth-cross__cell"
                      :class="[cell.className]"
                    >
                      <span
                        v-for="item in getCrossQuadrantEntries(cell.index)"
                        :key="item.code"
                        class="tooth-cross__entry"
                        >{{ item.display }}</span
                      >
                    </span>
                  </span>
                </button>
                <div class="disposal-layout__stack">
                  <div
                    v-for="(dRow, dIdx) in mrDisposalRows"
                    :key="'mr-disposal-' + dIdx"
                    class="mr-edit-disposal-line"
                  >
                    <el-input
                      v-model="dRow.line"
                      size="small"
                      clearable
                      class="mr-edit-line-input"
                      placeholder="请输入处置内容"
                    />
                    <el-button
                      v-if="mrDisposalRows.length > 1"
                      type="danger"
                      link
                      @click="removeMrDisposalRow(dIdx)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
              </div>
              <div class="mr-disposal-add-row-wrap">
                <el-button type="primary" text bg @click="addMrDisposalRow">添加一行</el-button>
              </div>
            </div>
          </div>
          <div v-else class="mr-field-block">
            <div class="mr-field-label">{{ field.label }}</div>
            <el-input
              v-model="(mrForm as any)[field.key]"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 6 }"
              placeholder="请输入"
            />
          </div>
        </template>
      </div>

      <ToothPicker v-model="mrSelectedTeeth" v-model:visible="mrToothPickerVisible" />

      <div class="mr-footer">
        <el-button @click="closeMrEditor">取消</el-button>
        <el-button type="primary" :loading="mrSaving" @click="handleMrSave">保存病历</el-button>
      </div>
    </div>

    <!-- 病历列表模式 -->
    <div v-else class="medical-tab">
      <div class="medical-tab-header">
        <span class="medical-tab-title">病历记录</span>
        <el-button type="primary" text bg @click="openMrEditor">新建病历</el-button>
      </div>
      <div v-if="medicalRecords.length" class="medical-list">
        <div class="medical-records-inner">
          <el-timeline class="medical-ep-timeline">
            <el-timeline-item
              v-for="mr in medicalRecords"
              :key="mr.id"
              type="primary"
              placement="top"
              center
              hollow
              :timestamp="mrTimelineTimestamp(mr)"
            >
              <div
                class="medical-record-card"
                :class="{ 'medical-record-card--rows-compact': !isMedicalExpanded(mr.id) }"
              >
                <div class="medical-record-card__panel medical-record-card__panel--left">
                  <div class="medical-record-card__head">
                    <div class="medical-record-card__head-main">
                      <span class="medical-record-card__title">{{ mr.type }}</span>
                      <el-button
                        type="primary"
                        link
                        class="medical-record-expand-btn"
                        @click="toggleMedicalExpand(mr.id)"
                      >
                        {{ isMedicalExpanded(mr.id) ? "收起详情" : "展开详情" }}
                        <el-icon
                          class="medical-record-expand-icon"
                          :class="{ 'is-expanded': isMedicalExpanded(mr.id) }"
                        >
                          <ArrowDown />
                        </el-icon>
                      </el-button>
                    </div>
                  </div>
                  <div class="medical-record-card__main">
                    <div v-show="!isMedicalExpanded(mr.id)" class="medical-record-card__body">
                      <template v-if="mr.type === '初诊病历'">
                        <div v-if="mr.treatmentPlan" class="medical-record-summary-line">
                          <span class="medical-record-summary-label">治疗计划：</span>
                          <span class="medical-record-summary-value">{{
                            treatmentPlanSummaryLine(mr.treatmentPlan)
                          }}</span>
                        </div>
                        <div v-if="mr.treatment" class="medical-record-summary-line">
                          <span class="medical-record-summary-label">处置：</span>
                          <span class="medical-record-summary-value">{{
                            treatmentSummaryLine(mr.treatment)
                          }}</span>
                        </div>
                      </template>
                      <template v-else>
                        <div v-if="mr.treatment" class="medical-record-summary-line">
                          <span class="medical-record-summary-label">处置：</span>
                          <span class="medical-record-summary-value">{{
                            treatmentSummaryLine(mr.treatment)
                          }}</span>
                        </div>
                      </template>
                    </div>
                    <div v-show="isMedicalExpanded(mr.id)" class="medical-record-card__detail">
                      <table class="medical-detail-table">
                        <tbody>
                          <template v-if="mr.type === '初诊病历'">
                            <tr v-if="mr.chiefComplaint">
                              <th scope="row" class="medical-detail-table__label">主诉</th>
                              <td class="medical-detail-table__value">{{ mr.chiefComplaint }}</td>
                            </tr>
                            <tr v-if="mr.presentIllness">
                              <th scope="row" class="medical-detail-table__label">现病史</th>
                              <td class="medical-detail-table__value">{{ mr.presentIllness }}</td>
                            </tr>
                            <tr v-if="mr.pastHistory">
                              <th scope="row" class="medical-detail-table__label">既往史</th>
                              <td class="medical-detail-table__value">{{ mr.pastHistory }}</td>
                            </tr>
                            <tr v-if="mr.oralExam">
                              <th scope="row" class="medical-detail-table__label">口腔检查</th>
                              <td class="medical-detail-table__value">{{ mr.oralExam }}</td>
                            </tr>
                            <tr v-if="mr.auxExam">
                              <th scope="row" class="medical-detail-table__label">辅助检查</th>
                              <td class="medical-detail-table__value">{{ mr.auxExam }}</td>
                            </tr>
                            <tr v-if="mr.diagnosis">
                              <th scope="row" class="medical-detail-table__label">诊断</th>
                              <td class="medical-detail-table__value">{{ mr.diagnosis }}</td>
                            </tr>
                            <tr v-if="mr.treatmentPlan">
                              <th scope="row" class="medical-detail-table__label">治疗计划</th>
                              <td
                                class="medical-detail-table__value medical-detail-table__value--pre"
                              >
                                {{ mr.treatmentPlan }}
                              </td>
                            </tr>
                            <template v-if="mr.treatment">
                              <template
                                v-for="(p, tpxIdx) in [treatmentExpandedParts(mr.treatment)]"
                                :key="'tpx-' + mr.id + '-' + tpxIdx"
                              >
                                <template v-if="p.rows.length">
                                  <tr v-for="(r, i) in p.rows" :key="'tr-' + mr.id + '-' + i">
                                    <th
                                      v-if="i === 0"
                                      scope="row"
                                      class="medical-detail-table__label"
                                      :rowspan="p.rows.length + (p.notes.trim() ? 1 : 0)"
                                    >
                                      处置
                                    </th>
                                    <td class="medical-detail-table__value">
                                      {{ treatmentRowLineText(r) }}
                                    </td>
                                  </tr>
                                  <tr v-if="p.notes.trim()" :key="'trn-' + mr.id">
                                    <td class="medical-detail-table__value">{{ p.notes }}</td>
                                  </tr>
                                </template>
                                <tr v-else>
                                  <th scope="row" class="medical-detail-table__label">处置</th>
                                  <td class="medical-detail-table__value">{{ mr.treatment }}</td>
                                </tr>
                              </template>
                            </template>
                          </template>
                          <template v-else>
                            <template v-if="mr.treatment">
                              <template
                                v-for="(p, tpxIdx) in [treatmentExpandedParts(mr.treatment)]"
                                :key="'tpx-fz-' + mr.id + '-' + tpxIdx"
                              >
                                <template v-if="p.rows.length">
                                  <tr v-for="(r, i) in p.rows" :key="'tr-fz-' + mr.id + '-' + i">
                                    <th
                                      v-if="i === 0"
                                      scope="row"
                                      class="medical-detail-table__label"
                                      :rowspan="p.rows.length + (p.notes.trim() ? 1 : 0)"
                                    >
                                      处置
                                    </th>
                                    <td class="medical-detail-table__value">
                                      {{ treatmentRowLineText(r) }}
                                    </td>
                                  </tr>
                                  <tr v-if="p.notes.trim()" :key="'trn-fz-' + mr.id">
                                    <td class="medical-detail-table__value">{{ p.notes }}</td>
                                  </tr>
                                </template>
                                <tr v-else>
                                  <th scope="row" class="medical-detail-table__label">处置</th>
                                  <td class="medical-detail-table__value">{{ mr.treatment }}</td>
                                </tr>
                              </template>
                            </template>
                          </template>
                          <tr v-if="mr.advice">
                            <th scope="row" class="medical-detail-table__label">医嘱</th>
                            <td class="medical-detail-table__value">{{ mr.advice }}</td>
                          </tr>
                          <tr v-if="mr.remark">
                            <th scope="row" class="medical-detail-table__label">备注</th>
                            <td class="medical-detail-table__value">{{ mr.remark }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div class="medical-record-card__panel medical-record-card__panel--right">
                  <div class="medical-record-card__meta-head">
                    <div class="medical-record-card__head-actions">
                      <el-button type="primary" link @click="openMrEditorForEdit(mr)">
                        编辑
                      </el-button>
                      <el-button type="danger" link @click="onDeleteMedicalRecord(mr)">
                        删除
                      </el-button>
                    </div>
                  </div>
                  <div class="medical-record-card__meta-body">
                    <div class="medical-record-card__body-doctor">
                      医生：{{ (mr.doctorName || "—").trim() || "—" }}
                    </div>
                  </div>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
      <el-empty v-else description="暂无电子病历" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { ArrowDown } from "@element-plus/icons-vue";
import { getDoctorListApi } from "@/api/appointment";
import {
  getMedicalRecordListApi,
  createMedicalRecordApi,
  updateMedicalRecordApi,
  deleteMedicalRecordApi,
} from "@/api/medical-record";
import ToothPicker from "@/components/dental/ToothPicker.vue";
import { formatDateYyyyMmDd } from "@/utils/datetime";
import {
  parseMedicalTreatmentParts,
  treatmentSummaryLine,
  treatmentPlanSummaryLine,
} from "@/utils/medical-treatment-text";

const props = defineProps<{
  patientId: number | null;
}>();

const medicalRecords = ref<any[]>([]);

const expandedMedicalIds = ref<Set<number>>(new Set());

function isMedicalExpanded(id: number) {
  return expandedMedicalIds.value.has(id);
}

function toggleMedicalExpand(id: number) {
  const next = new Set(expandedMedicalIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedMedicalIds.value = next;
}

function treatmentExpandedParts(full: unknown) {
  return parseMedicalTreatmentParts(typeof full === "string" ? full : "");
}

function mrTimelineTimestamp(mr: Record<string, unknown>): string {
  const raw = String(mr.visitTime ?? mr.createdAt ?? "").trim();
  if (!raw) return "—";
  const s = raw.replace("T", " ");
  const m = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/.exec(s);
  if (m) return `${m[1]} ${m[2]}`;
  const m2 = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (m2) return m2[1]!;
  return formatDateYyyyMmDd(raw) || "—";
}

async function fetchMedicalRecords(pid: number) {
  try {
    const res: any = await getMedicalRecordListApi(pid);
    medicalRecords.value = res.data;
  } catch {
    /* 拦截器已提示 */
  }
}

const mrEditorVisible = ref(false);
const mrSaving = ref(false);
const mrCurrentTime = ref(true);
const mrToothPickerVisible = ref(false);
const mrSelectedTeeth = ref<string[]>([]);
const mrDoctorList = ref<{ id: number; name: string; role: string }[]>([]);
const mrEditingId = ref<number | null>(null);

const mrDisposalRows = ref<{ line: string }[]>([{ line: "" }]);

function addMrDisposalRow() {
  mrDisposalRows.value.push({ line: "" });
}

function removeMrDisposalRow(index: number) {
  if (mrDisposalRows.value.length <= 1) return;
  mrDisposalRows.value.splice(index, 1);
}

/** 列表展示：兼容旧数据（牙位+处置）与新数据（整行） */
function treatmentRowLineText(r: { tooth: string; disposal: string }) {
  const t = (r.tooth || "").trim();
  const d = (r.disposal || "").trim();
  if (t && d) return `${t}：${d}`;
  return d || t;
}

function buildMrTreatmentForSave(): string {
  const lines = mrDisposalRows.value.map((r) => r.line.trim()).filter(Boolean);
  return lines.length ? lines.join("\n") : "";
}

function mrFormatNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const mrForm = reactive({
  type: "初诊病历",
  doctorId: "" as number | string,
  doctorName: "",
  visitTime: mrFormatNow(),
  chiefComplaint: "",
  presentIllness: "",
  pastHistory: "",
  oralExam: "",
  auxExam: "",
  diagnosis: "",
  treatmentPlan: "",
  treatment: "",
  advice: "",
  remark: "",
});

const mrFirstVisitFields = [
  { key: "chiefComplaint", label: "主诉" },
  { key: "presentIllness", label: "现病史" },
  { key: "pastHistory", label: "既往史" },
  { key: "oralExam", label: "口腔检查" },
  { key: "auxExam", label: "辅助检查" },
  { key: "diagnosis", label: "诊断" },
  { key: "treatmentPlan", label: "治疗计划" },
  { key: "treatment", label: "处置" },
  { key: "advice", label: "医嘱" },
  { key: "remark", label: "备注" },
];

const mrFollowUpFields = [
  { key: "treatment", label: "处置" },
  { key: "advice", label: "医嘱" },
  { key: "remark", label: "备注" },
];

const mrEditorLoopFields = computed(() =>
  mrForm.type === "初诊病历" ? mrFirstVisitFields : mrFollowUpFields,
);

watch(
  () => mrForm.type,
  (t) => {
    if (t === "复诊病历") mrForm.chiefComplaint = "";
  },
);

const toothChartRows = [
  ["18", "17", "16", "15", "14", "13", "12", "11"],
  ["21", "22", "23", "24", "25", "26", "27", "28"],
  ["48", "47", "46", "45", "44", "43", "42", "41"],
  ["31", "32", "33", "34", "35", "36", "37", "38"],
] as const;

const primaryToothChartRows = [
  ["55", "54", "53", "52", "51"],
  ["61", "62", "63", "64", "65"],
  ["85", "84", "83", "82", "81"],
  ["71", "72", "73", "74", "75"],
] as const;

const primaryLetterRows = [
  ["E", "D", "C", "B", "A"],
  ["A", "B", "C", "D", "E"],
  ["E", "D", "C", "B", "A"],
  ["A", "B", "C", "D", "E"],
];

const primaryCodeDisplayMap = new Map<string, string>();
primaryToothChartRows.forEach((row, ri) => {
  row.forEach((code, ci) => {
    const letter = primaryLetterRows[ri]?.[ci];
    if (letter) primaryCodeDisplayMap.set(code, letter);
  });
});

interface ToothEntry {
  code: string;
  display: string;
}

const crossQuadrantCells = [
  { className: "tooth-cross__cell--top-left", index: 0 as const },
  { className: "tooth-cross__cell--top-right", index: 1 as const },
  { className: "tooth-cross__cell--bottom-left", index: 2 as const },
  { className: "tooth-cross__cell--bottom-right", index: 3 as const },
];

function getCrossQuadrantEntries(index: 0 | 1 | 2 | 3): ToothEntry[] {
  const source = [...(primaryToothChartRows[index] ?? []), ...(toothChartRows[index] ?? [])];
  return source
    .filter((t) => mrSelectedTeeth.value.includes(t))
    .map((t) => ({
      code: t,
      display: primaryCodeDisplayMap.get(t) ?? t.slice(-1),
    }));
}

const quadrantDisplayTexts = computed(() =>
  [0, 1, 2, 3].map((i) =>
    getCrossQuadrantEntries(i as 0 | 1 | 2 | 3)
      .map((e) => e.display)
      .join(""),
  ),
);

const toothCrossStyle = computed(() => {
  const texts = quadrantDisplayTexts.value;
  const leftChars = Math.max(texts[0]?.length ?? 0, texts[2]?.length ?? 0, 2);
  const rightChars = Math.max(texts[1]?.length ?? 0, texts[3]?.length ?? 0, 2);
  const armX = Math.min(320, Math.max(78, Math.max(leftChars, rightChars) * 12));
  return { "--cross-arm-x": `${armX}px`, "--cross-arm-y": "26px" };
});

function resetMrForm() {
  mrForm.type = "初诊病历";
  mrForm.doctorId = "";
  mrForm.doctorName = "";
  mrForm.visitTime = mrFormatNow();
  mrForm.chiefComplaint = "";
  mrForm.presentIllness = "";
  mrForm.pastHistory = "";
  mrForm.oralExam = "";
  mrForm.auxExam = "";
  mrForm.diagnosis = "";
  mrForm.treatmentPlan = "";
  mrForm.treatment = "";
  mrForm.advice = "";
  mrForm.remark = "";
  mrDisposalRows.value = [{ line: "" }];
  mrSelectedTeeth.value = [];
  mrCurrentTime.value = true;
}

async function openMrEditor() {
  mrEditingId.value = null;
  resetMrForm();
  mrEditorVisible.value = true;
  if (!mrDoctorList.value.length) {
    try {
      const res: any = await getDoctorListApi();
      mrDoctorList.value = res.data;
    } catch {
      /* */
    }
  }
}

function closeMrEditor() {
  mrEditorVisible.value = false;
  mrEditingId.value = null;
}

async function openMrEditorForEdit(mr: Record<string, unknown>) {
  mrEditingId.value = null;
  resetMrForm();
  mrEditingId.value = Number(mr.id);
  mrEditorVisible.value = true;
  if (!mrDoctorList.value.length) {
    try {
      const res: any = await getDoctorListApi();
      mrDoctorList.value = res.data;
    } catch {
      /* */
    }
  }
  const mrType = (mr.type as string) || "初诊病历";
  mrForm.type = mrType;
  const didRaw = mr.doctorId;
  const didStr = didRaw != null ? String(didRaw).trim() : "";
  const didNum = didStr !== "" ? Number(didStr) : NaN;
  mrForm.doctorId = didStr !== "" && !Number.isNaN(didNum) ? didNum : "";
  mrForm.doctorName = (mr.doctorName as string) || "";
  mrForm.visitTime = (mr.visitTime as string) || "";
  mrForm.chiefComplaint = mrType === "初诊病历" ? (mr.chiefComplaint as string) || "" : "";
  mrForm.presentIllness = (mr.presentIllness as string) || "";
  mrForm.pastHistory = (mr.pastHistory as string) || "";
  mrForm.oralExam = (mr.oralExam as string) || "";
  mrForm.auxExam = (mr.auxExam as string) || "";
  mrForm.diagnosis = (mr.diagnosis as string) || "";
  mrForm.treatmentPlan = (mr.treatmentPlan as string) || "";
  mrForm.advice = (mr.advice as string) || "";
  mrForm.remark = (mr.remark as string) || "";
  const rawTreatment = (mr.treatment as string) || "";
  const parts = parseMedicalTreatmentParts(rawTreatment);
  if (parts.rows.length) {
    mrDisposalRows.value = parts.rows.map((r) => ({
      line: treatmentRowLineText(r),
    }));
    if (parts.notes.trim()) {
      mrDisposalRows.value.push({ line: parts.notes.trim() });
    }
  } else {
    const t = (parts.notes || parts.plain || "").trim();
    mrDisposalRows.value = t ? [{ line: t }] : [{ line: "" }];
  }
  mrForm.treatment = "";
  const tn = (mr.toothNote as string) || "";
  mrSelectedTeeth.value = tn
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  mrCurrentTime.value = false;
}

async function onDeleteMedicalRecord(mr: Record<string, unknown>) {
  try {
    await ElMessageBox.confirm("确定删除该条病历吗？删除后不可恢复。", "删除病历", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await deleteMedicalRecordApi(Number(mr.id));
    const pid = props.patientId;
    if (pid != null) await fetchMedicalRecords(pid);
  } catch {
    /* 拦截器已提示 */
  }
}

function onMrDoctorChange(id: number) {
  const doc = mrDoctorList.value.find((d) => d.id === id);
  mrForm.doctorName = doc?.name || "";
}

function onMrCurrentTimeChange(checked: boolean | string | number) {
  if (checked) mrForm.visitTime = mrFormatNow();
}

async function handleMrSave() {
  if (!mrForm.doctorId) {
    ElMessage.warning("请选择医生");
    return;
  }
  if (!mrForm.visitTime) {
    ElMessage.warning("请选择就诊时间");
    return;
  }

  const pid = props.patientId;
  if (pid == null) {
    ElMessage.warning("患者信息未加载");
    return;
  }

  mrSaving.value = true;
  try {
    const body = {
      type: mrForm.type,
      doctorId: String(mrForm.doctorId),
      doctorName: mrForm.doctorName,
      visitTime: mrForm.visitTime,
      chiefComplaint: mrForm.type === "复诊病历" ? "" : mrForm.chiefComplaint,
      presentIllness: mrForm.presentIllness,
      pastHistory: mrForm.pastHistory,
      oralExam: mrForm.oralExam,
      auxExam: mrForm.auxExam,
      diagnosis: mrForm.diagnosis,
      treatmentPlan: mrForm.treatmentPlan,
      treatment: buildMrTreatmentForSave(),
      advice: mrForm.advice,
      remark: mrForm.remark,
      toothNote: mrSelectedTeeth.value.join(","),
    };
    if (mrEditingId.value != null) {
      await updateMedicalRecordApi(mrEditingId.value, body);
    } else {
      await createMedicalRecordApi({ patientId: pid, ...body });
    }
    mrEditorVisible.value = false;
    mrEditingId.value = null;
    await fetchMedicalRecords(pid);
  } catch {
    /* 拦截器已提示 */
  } finally {
    mrSaving.value = false;
  }
}

watch(
  () => props.patientId,
  (id) => {
    if (id == null) {
      medicalRecords.value = [];
      closeMrEditor();
      expandedMedicalIds.value = new Set();
      return;
    }
    void fetchMedicalRecords(id);
  },
  { immediate: true },
);
</script>

<style scoped>
.patient-detail-medical-tab {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.mr-editor {
  height: 100%;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.mr-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.mr-editor-title {
  font-size: var(--el-font-size-medium);
  font-weight: 700;
  color: #303133;
}

.mr-row-top {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 16px;
}

.mr-field-doctor {
  min-width: 200px;
}

.mr-field-time {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mr-field-time :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mr-type-switch {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.mr-type-label {
  font-size: var(--el-font-size-base);
  font-weight: 500;
  color: #303133;
}

.mr-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mr-field-block {
  margin-bottom: 8px;
}

.mr-field-label {
  font-size: var(--el-font-size-base);
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.mr-field-label--required::before {
  content: "* ";
  color: #f56c6c;
}

.mr-field-block--treatment-editor {
  margin-bottom: 8px;
}

.disposal-editor-wrap {
  width: 100%;
}

.disposal-layout {
  display: flex;
  align-items: stretch;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.disposal-layout--editor-stack {
  align-items: stretch;
}

.disposal-layout__stack {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 6px 10px;
  gap: 0;
  background: #fff;
}

.mr-disposal-add-row-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
  padding: 0 2px;
}

.mr-edit-disposal-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
  padding: 2px 0;
}

.mr-edit-line-input {
  flex: 1;
  min-width: 0;
}

.mr-edit-line-input :deep(.el-input__wrapper) {
  min-height: 30px;
  height: 30px;
  box-shadow: none !important;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0 4px;
}

.mr-edit-line-input :deep(.el-input__inner) {
  height: 30px;
  line-height: 30px;
  font-size: 14px;
  text-align: left;
}

.tooth-cross {
  --cross-arm-x: 78px;
  --cross-arm-y: 26px;
  display: inline-block;
  min-width: calc(var(--cross-arm-x) * 2);
  padding: 6px;
  cursor: pointer;
  background: #fafafa;
  border: none;
  border-right: 1px solid #dcdfe6;
  flex-shrink: 0;
}

.tooth-cross:hover {
  background: #f0f5ff;
}

.tooth-cross__grid {
  display: grid;
  grid-template-rows: var(--cross-arm-y) var(--cross-arm-y);
  grid-template-columns: var(--cross-arm-x) var(--cross-arm-x);
}

.tooth-cross__cell {
  display: flex;
  flex-wrap: nowrap;
  gap: 2px;
  min-height: 14px;
  padding: 4px 6px;
  font-size: var(--el-font-size-base);
  font-weight: 500;
  line-height: 1;
  color: #303133;
}

.tooth-cross__entry {
  display: inline-flex;
  align-items: flex-start;
}

.tooth-cross__cell--top-left {
  align-items: flex-start;
  justify-content: flex-end;
  text-align: right;
  border-right: 2px solid #909399;
  border-bottom: 2px solid #909399;
}

.tooth-cross__cell--top-right {
  align-items: flex-start;
  justify-content: flex-start;
  border-bottom: 2px solid #909399;
}

.tooth-cross__cell--bottom-left {
  align-items: flex-start;
  justify-content: flex-end;
  text-align: right;
  border-right: 2px solid #909399;
}

.tooth-cross__cell--bottom-right {
  align-items: flex-start;
  justify-content: flex-start;
}

.mr-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e8e8e8;
}

.medical-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.medical-tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.medical-tab-title {
  font-size: 16px;
  font-weight: 500;
}

.medical-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.medical-records-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.medical-ep-timeline {
  margin-top: 4px;
}

.medical-ep-timeline :deep(.el-timeline-item__timestamp) {
  font-weight: 600;
  font-size: 14px;
  line-height: 30px;
  color: #303133;
  font-variant-numeric: tabular-nums;
}

.medical-ep-timeline :deep(.el-timeline-item__wrapper) {
  padding-right: 0;
}

.medical-record-card {
  --mr-line-h: 30px;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 16px;
  font-size: 14px;
  background: transparent;
  border: none;
  box-shadow: none;
  overflow: visible;
}

.medical-record-card__panel {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.medical-record-card__panel--left {
  flex: 1;
  min-width: 0;
}

.medical-record-card__panel--right {
  width: 180px;
  flex-shrink: 0;
}

/* 收起：表头、摘要行、侧栏与正文区统一 30px 行高 */
.medical-record-card--rows-compact .medical-record-card__head {
  min-height: var(--mr-line-h);
}

.medical-record-card--rows-compact .medical-record-card__meta-head {
  min-height: var(--mr-line-h);
}

.medical-record-card--rows-compact .medical-record-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: var(--mr-line-h);
  padding-top: 0;
  padding-bottom: 0;
  box-sizing: border-box;
}

.medical-record-card--rows-compact .medical-record-summary-line {
  min-height: var(--mr-line-h);
  display: flex;
  align-items: center;
  line-height: var(--mr-line-h);
  margin-bottom: 0;
  box-sizing: border-box;
}

.medical-record-card--rows-compact .medical-record-card__panel--left .medical-record-card__main {
  min-height: var(--mr-line-h);
}

.medical-record-card--rows-compact .medical-record-card__meta-body {
  min-height: var(--mr-line-h);
  display: flex;
  align-items: center;
  padding-top: 0;
  padding-bottom: 0;
  box-sizing: border-box;
}

.medical-record-card--rows-compact .medical-record-card__body-doctor {
  line-height: var(--mr-line-h);
}

.medical-record-card__head {
  display: flex;
  align-items: stretch;
  min-height: var(--mr-line-h);
  background: #e6f4ff;
  border-bottom: 1px solid #d6e4ff;
}

.medical-record-card__head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: var(--mr-line-h);
  padding: 0 14px;
  box-sizing: border-box;
}

.medical-record-card__meta-head {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--mr-line-h);
  padding: 0 14px;
  box-sizing: border-box;
  background: #e6f4ff;
  border-bottom: 1px solid #d6e4ff;
}

.medical-record-card__meta-body {
  flex: 1;
  min-height: 0;
  padding: 0 14px;
  box-sizing: border-box;
  background: #fff;
}

.medical-record-card__head-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-width: 0;
}

.medical-record-card :deep(.medical-record-card__head-actions .el-button) {
  font-size: 14px;
  height: var(--mr-line-h);
  line-height: var(--mr-line-h);
  padding-top: 0;
  padding-bottom: 0;
}

.medical-record-card__title {
  flex-shrink: 0;
  font-weight: 600;
  font-size: 14px;
  line-height: var(--mr-line-h);
  color: #303133;
}

.medical-record-expand-btn {
  padding: 0;
  font-size: 14px;
}

.medical-record-card :deep(.medical-record-expand-btn.el-button) {
  height: var(--mr-line-h);
  line-height: var(--mr-line-h);
  padding-top: 0;
  padding-bottom: 0;
}

.medical-record-divider.el-divider--vertical {
  margin: 0 10px;
  height: 14px;
  align-self: center;
  border-color: var(--el-border-color);
}

/* 与右侧块同高拉伸时，正文区垂直居中（收起摘要 / 展开表格），避免仅 30px 行高时贴顶留白不匀 */
.medical-record-card__main {
  flex: 1;
  min-width: 0;
  min-height: var(--mr-line-h);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.medical-record-card__body {
  padding: 0 14px;
}

.medical-record-card__body-doctor {
  font-size: 14px;
  color: #606266;
  line-height: var(--mr-line-h);
  white-space: normal;
  word-break: break-word;
}

.medical-record-expand-icon {
  margin-left: 4px;
  vertical-align: middle;
  transition: transform 0.2s;
}

.medical-record-expand-icon.is-expanded {
  transform: rotate(180deg);
}

.medical-record-summary-line {
  font-size: 14px;
  color: #303133;
  line-height: var(--mr-line-h);
  min-height: var(--mr-line-h);
  margin-bottom: 8px;
  box-sizing: border-box;
}

.medical-record-summary-line:last-child {
  margin-bottom: 0;
}

.medical-record-summary-label {
  font-weight: 600;
  margin-right: 4px;
}

.medical-record-summary-value {
  white-space: pre-wrap;
  word-break: break-word;
}

.medical-record-card__detail {
  /* 不另加顶边：与收起时 body 一致，仅依赖表头已有 border-bottom，避免多 1px */
  background: #fafafa;
  padding: 0 14px;
  width: 100%;
  box-sizing: border-box;
}

.medical-detail-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
  line-height: var(--mr-line-h);
  border: none;
  background: transparent;
  box-sizing: border-box;
}

.medical-detail-table tbody tr {
  min-height: var(--mr-line-h);
}

.medical-detail-table th,
.medical-detail-table td {
  border: none;
  padding: 0;
  vertical-align: middle;
  box-sizing: border-box;
}

.medical-detail-table__label {
  width: 5.5em;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  text-align: left;
  background: transparent;
  padding-right: 12px;
  line-height: var(--mr-line-h);
  min-height: var(--mr-line-h);
}

.medical-detail-table__value {
  color: #606266;
  text-align: left;
  word-break: break-word;
  white-space: pre-wrap;
  line-height: var(--mr-line-h);
}

.medical-detail-table__value--pre {
  white-space: pre-wrap;
  text-align: left;
}
</style>
