<template>
  <el-dialog
    :model-value="modelValue"
    title="修改预约"
    width="900px"
    :close-on-click-modal="false"
    class="modify-appt-dialog"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="appointment" class="appt-body">
      <div class="appt-left">
        <div class="appt-section">
          <div class="appt-section-title">患者信息</div>
          <div class="appt-info-row">
            <span class="appt-info-label">姓名</span>
            <span class="appt-info-value">{{ patient.name || "—" }}</span>
          </div>
          <div class="appt-info-row">
            <span class="appt-info-label">手机</span>
            <span class="appt-info-value">{{ patient.phone || "—" }}</span>
          </div>
          <div class="appt-info-row">
            <span class="appt-info-label">病历号</span>
            <span class="appt-info-value">{{ patient.source || "—" }}</span>
          </div>
        </div>

        <div class="appt-section">
          <div class="appt-section-title">预约信息</div>
          <el-form ref="apptFormRef" :model="apptForm" :rules="apptRules" label-position="top">
            <div class="appt-form-row">
              <el-form-item label="就诊类型" prop="visitType">
                <el-select v-model="apptForm.visitType" placeholder="选择类型" style="width: 100%">
                  <el-option label="初诊" value="初诊" />
                  <el-option label="复诊" value="复诊" />
                </el-select>
              </el-form-item>
              <el-form-item label="预约时间" prop="appointmentTime">
                <el-date-picker
                  v-model="apptForm.appointmentTime"
                  type="datetime"
                  placeholder="选择日期时间"
                  value-format="YYYY-MM-DD HH:mm"
                  format="YYYY-MM-DD HH:mm"
                  style="width: 100%"
                />
              </el-form-item>
            </div>
            <div class="appt-form-row">
              <el-form-item label="持续时间" prop="duration">
                <el-select v-model="apptForm.duration" placeholder="选择时长" style="width: 100%">
                  <el-option v-for="d in durationOptions" :key="d" :label="d + '分钟'" :value="d" />
                </el-select>
              </el-form-item>
              <el-form-item label="医生" prop="doctorId" required>
                <el-select
                  v-model="apptForm.doctorId"
                  placeholder="选择医生"
                  style="width: 100%"
                  @change="onDoctorChange"
                >
                  <el-option
                    v-for="doc in doctors"
                    :key="doc.id"
                    :label="doc.name"
                    :value="doc.id"
                  />
                </el-select>
              </el-form-item>
            </div>
            <el-form-item label="备注">
              <el-input
                v-model="apptForm.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入备注"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <div class="appt-right">
        <div class="appt-section-title">预约项目</div>
        <el-input
          v-model="itemSearchKeyword"
          placeholder="搜索预约项目"
          :suffix-icon="SearchIcon"
          clearable
          style="margin-bottom: 12px"
        />
        <div class="appt-items-list">
          <div
            v-for="category in filteredItemCategories"
            :key="category.name"
            class="appt-category"
          >
            <div class="appt-category-header" @click="toggleCategory(category.name)">
              <span class="appt-category-name">{{ category.name }}</span>
              <el-icon
                class="appt-category-arrow"
                :class="{ collapsed: collapsedCategories.has(category.name) }"
              >
                <ArrowDown />
              </el-icon>
            </div>
            <div v-show="!collapsedCategories.has(category.name)" class="appt-category-body">
              <el-checkbox
                v-for="item in category.items"
                :key="item"
                :model-value="apptForm.items.includes(item)"
                @change="onItemCheckedChange(item, $event)"
              >
                {{ item }}
              </el-checkbox>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!appointment" @click="handleSubmit">
        保存修改
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { Search as SearchIcon, ArrowDown } from "@element-plus/icons-vue";
import type { FormInstance, FormRules } from "element-plus";
import { getDoctorListApi, updateAppointmentApi } from "@/api/appointment";

const APPOINTMENT_CATEGORIES = [
  { name: "定期复诊", items: ["洁治", "常规检查"] },
  { name: "口腔检查", items: ["初诊", "口腔检查", "拍片"] },
  { name: "牙体", items: ["打桩", "换药", "补牙", "根充", "根管治疗", "根管预备"] },
  { name: "口外", items: ["拔牙", "拆线", "冲洗上药"] },
  { name: "修复", items: ["戴牙", "试内冠", "试戴义齿", "试支架", "备牙", "修义齿", "印模"] },
  { name: "种植", items: ["拆线", "种植一期", "种植二期", "种植三期", "种植印模"] },
  { name: "正畸", items: ["粘托槽", "加力", "评估", "戴保持器", "打种植钉", "换弓丝"] },
  { name: "牙周", items: ["牙周上药", "牙周刮治", "龈上洁治", "龈下洁治"] },
  { name: "洁牙费", items: ["洁牙"] },
  {
    name: "治疗费",
    items: ["树脂充填", "玻璃离子充填", "金属桩", "纤维桩", "窝沟封闭", "根管治疗"],
  },
  { name: "拔牙费", items: ["前牙", "后牙", "残根", "阻生牙", "乳牙", "松动牙", "胶原膜"] },
];

const durationOptions = [15, 30, 45, 60, 75, 90, 105, 120];

export interface ModifyApptPayload {
  id: number;
  patientId: number;
  patientName: string;
  visitType: string;
  appointmentTime: string;
  duration: number;
  doctorId: string;
  doctorName: string;
  items: string;
  remark: string;
}

const props = defineProps<{
  modelValue: boolean;
  appointment: ModifyApptPayload | null;
  patient: { name: string; phone: string; source: string };
}>();

const emit = defineEmits<{
  "update:modelValue": [v: boolean];
  saved: [];
}>();

const apptFormRef = ref<FormInstance>();
const saving = ref(false);
const itemSearchKeyword = ref("");
const collapsedCategories = ref(new Set<string>());
const doctors = ref<{ id: number; name: string; role: string }[]>([]);

const apptForm = reactive({
  visitType: "复诊",
  appointmentTime: "",
  duration: 30,
  doctorId: "" as number | string,
  doctorName: "",
  items: [] as string[],
  remark: "",
});

const apptRules: FormRules = {
  visitType: [{ required: true, message: "请选择就诊类型", trigger: "change" }],
  appointmentTime: [{ required: true, message: "请选择预约时间", trigger: "change" }],
  duration: [{ required: true, message: "请选择持续时间", trigger: "change" }],
  doctorId: [{ required: true, message: "请选择医生", trigger: "change" }],
};

const filteredItemCategories = computed(() => {
  const kw = itemSearchKeyword.value.trim().toLowerCase();
  if (!kw) return APPOINTMENT_CATEGORIES;
  return APPOINTMENT_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => item.toLowerCase().includes(kw)),
  })).filter((cat) => cat.items.length > 0);
});

function toggleCategory(name: string) {
  const s = new Set(collapsedCategories.value);
  if (s.has(name)) s.delete(name);
  else s.add(name);
  collapsedCategories.value = s;
}

function toggleItem(item: string, checked: boolean) {
  if (checked) {
    if (!apptForm.items.includes(item)) apptForm.items.push(item);
  } else {
    apptForm.items = apptForm.items.filter((i) => i !== item);
  }
}

function onItemCheckedChange(item: string, value: unknown) {
  toggleItem(item, value === true);
}

function onDoctorChange(id: number) {
  const doc = doctors.value.find((d) => d.id === id);
  apptForm.doctorName = doc?.name || "";
}

function formatDatetimeForForm(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function syncFormFromAppointment(a: ModifyApptPayload) {
  apptForm.visitType = a.visitType || "复诊";
  apptForm.appointmentTime = formatDatetimeForForm(a.appointmentTime);
  apptForm.duration = a.duration || 30;
  apptForm.remark = a.remark || "";
  try {
    const raw = a.items;
    const arr = typeof raw === "string" ? JSON.parse(raw || "[]") : [];
    apptForm.items = Array.isArray(arr) ? [...arr] : [];
  } catch {
    apptForm.items = [];
  }
  const did = Number(a.doctorId);
  if (!Number.isNaN(did) && did !== 0) {
    apptForm.doctorId = did;
  } else {
    apptForm.doctorId = "";
  }
  const doc = doctors.value.find((d) => d.id === apptForm.doctorId);
  if (doc) apptForm.doctorName = doc.name;
  else if (a.doctorName) apptForm.doctorName = a.doctorName;
  else apptForm.doctorName = "";
  if (!apptForm.doctorId && a.doctorName) {
    const byName = doctors.value.find((d) => d.name === a.doctorName);
    if (byName) {
      apptForm.doctorId = byName.id;
      apptForm.doctorName = byName.name;
    }
  }
}

async function fetchDoctors() {
  try {
    const res: any = await getDoctorListApi();
    doctors.value = res.data || [];
  } catch {
    /* */
  }
}

watch(
  () => [props.modelValue, props.appointment] as const,
  async ([open, appt]) => {
    if (!open || !appt) return;
    itemSearchKeyword.value = "";
    collapsedCategories.value = new Set();
    apptFormRef.value?.clearValidate();
    if (!doctors.value.length) await fetchDoctors();
    syncFormFromAppointment(appt);
  },
);

async function handleSubmit() {
  const a = props.appointment;
  if (!a) return;
  const valid = await apptFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    await updateAppointmentApi(a.id, {
      patientId: a.patientId,
      patientName: props.patient.name || a.patientName,
      visitType: apptForm.visitType,
      appointmentTime: apptForm.appointmentTime,
      duration: apptForm.duration,
      doctorId: String(apptForm.doctorId),
      doctorName: apptForm.doctorName,
      items: JSON.stringify(apptForm.items),
      remark: apptForm.remark,
    });
    emit("update:modelValue", false);
    emit("saved");
  } catch {
    /* 拦截器已处理 */
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.appt-body {
  display: flex;
  gap: 16px;
  min-height: 420px;
}

.appt-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.appt-right {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.appt-section {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
}

.appt-section-title {
  font-size: var(--el-font-size-base);
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.appt-info-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.appt-info-row:last-child {
  margin-bottom: 0;
}

.appt-info-label {
  font-size: var(--el-font-size-small);
  color: #303133;
  font-weight: 500;
  min-width: 50px;
}

.appt-info-value {
  font-size: var(--el-font-size-small);
  color: #606266;
}

.appt-form-row {
  display: flex;
  gap: 16px;
}

.appt-form-row > :deep(.el-form-item) {
  flex: 1;
}

.appt-items-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 4px 0;
}

.appt-category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.appt-category-header:hover {
  background: #f5f7fa;
}

.appt-category-name {
  font-size: var(--el-font-size-small);
  font-weight: 500;
  color: #303133;
}

.appt-category-arrow {
  transition: transform 0.2s;
}

.appt-category-arrow.collapsed {
  transform: rotate(-90deg);
}

.appt-category-body {
  padding: 0 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.appt-category-body :deep(.el-checkbox) {
  margin-right: 0;
  height: auto;
}
</style>

<style>
.modify-appt-dialog .el-dialog__body {
  padding: 16px 20px;
}
</style>
