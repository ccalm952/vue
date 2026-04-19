<template>
  <div class="planting-add-page">
    <el-card shadow="never">
      <template #header>
        <span class="planting-add-page__title">新增种植记录</span>
        <span class="planting-add-page__subtitle">
          保存时写入患者库与种植就诊记录，与桌面版保持一致，不包含 e看牙 自动化流程。
        </span>
      </template>

      <el-form label-position="top" class="planting-add-page__form">
        <div class="planting-add-page__form-grid">
          <el-form-item label="日期" required>
            <el-date-picker
              v-model="form.visitDate"
              type="date"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="姓名" required>
            <el-autocomplete
              v-model="form.patientName"
              :fetch-suggestions="queryPatients"
              placeholder="输入姓名搜索已有患者"
              :trigger-on-focus="false"
              :debounce="0"
              clearable
              style="width: 100%"
              @select="handleSelectPatient"
            >
              <template #default="{ item }">
                <div class="planting-add-page__autocomplete-item">
                  <span class="planting-add-page__autocomplete-name">{{ item.value }}</span>
                  <span class="planting-add-page__autocomplete-extra">
                    {{ item.phone }}{{ item.source ? " | " + item.source : "" }}
                  </span>
                </div>
              </template>
            </el-autocomplete>
          </el-form-item>
          <el-form-item label="手机" required>
            <el-input v-model="form.phone" placeholder="手机号码" />
          </el-form-item>
          <el-form-item label="病历号">
            <el-input v-model="form.chartNo" placeholder="留空则自动生成当日病历号" />
          </el-form-item>
          <el-form-item label="出生日期">
            <el-date-picker
              v-model="form.birthday"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              @change="onBirthdayChange"
            />
          </el-form-item>
          <el-form-item label="年龄">
            <el-input
              v-model.number="form.age"
              placeholder="与出生日期互算，修改任一方即可"
              @change="onAgeChange"
            />
          </el-form-item>
          <el-form-item label="人员">
            <el-input v-model="form.staff" placeholder="操作人员，多人可用 + 分隔" />
          </el-form-item>
          <el-form-item label="二期（月数）">
            <el-input v-model="form.remark" placeholder="仅填写数字表示月数" />
          </el-form-item>
        </div>

        <div class="planting-add-page__teeth-head">
          <span class="planting-add-page__teeth-title">牙位与植体</span>
          <div>
            <el-button @click="addTooth">新增一行</el-button>
            <el-button @click="removeSelected" :disabled="!teethSelection.length">
              删除选中
            </el-button>
          </div>
        </div>

        <el-table :data="teeth" border size="small" @selection-change="teethSelection = $event">
          <el-table-column type="selection" width="44" />
          <el-table-column label="牙位" min-width="100">
            <template #default="{ row }">
              <el-input v-model="row.toothNo" placeholder="如 11" />
            </template>
          </el-table-column>
          <el-table-column label="品牌" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.implantBrand" />
            </template>
          </el-table-column>
          <el-table-column label="植体" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.implantModel" />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.toothRemark" />
            </template>
          </el-table-column>
        </el-table>

        <el-button
          type="primary"
          class="planting-add-page__save-button"
          :loading="saving"
          @click="submit"
        >
          保存
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { createPlantingVisitApi } from "@/api/planting";
import { getPatientListApi } from "@/api/patient";

interface PatientSuggestion {
  value: string;
  id: number;
  phone: string;
  source: string;
  birthday?: string;
  age?: number;
}

interface ApiResponse<T> {
  data: T;
}

interface PatientListItem {
  id: number;
  name: string;
  phone?: string;
  source?: string;
  birthday?: string;
  age?: number | string;
}

interface PatientListData {
  list?: PatientListItem[];
}

let abortTimer: ReturnType<typeof setTimeout> | undefined;
async function queryPatients(qs: string, cb: (list: PatientSuggestion[]) => void) {
  clearTimeout(abortTimer);
  const kw = qs.trim();
  if (!kw) {
    cb([]);
    return;
  }
  abortTimer = setTimeout(async () => {
    try {
      const res = (await getPatientListApi({
        keyword: kw,
        page: 1,
        pageSize: 20,
      })) as ApiResponse<PatientListData>;
      const list: PatientSuggestion[] = (res.data?.list ?? []).map((patient) => ({
        value: patient.name,
        id: patient.id,
        phone: patient.phone ?? "",
        source: patient.source ?? "",
        birthday: patient.birthday ?? "",
        age: patient.age != null ? Number(patient.age) : undefined,
      }));
      cb(list);
    } catch {
      cb([]);
    }
  }, 200);
}

function handleSelectPatient(raw: Record<string, unknown>) {
  const item = raw as unknown as PatientSuggestion;
  form.patientName = item.value;
  form.phone = item.phone;
  form.chartNo = item.source;
  form.birthday = item.birthday || "";
  form.age = item.age != null && !Number.isNaN(Number(item.age)) ? Number(item.age) : undefined;
}

function onBirthdayChange(val: string | null) {
  if (!val) {
    form.age = undefined;
    return;
  }
  const birth = new Date(val);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  form.age = age;
}

/** 按年龄反推出生日，默认回填为出生年份的 1 月 1 日。 */
function onAgeChange() {
  const raw = form.age;
  if (raw == null || Number.isNaN(Number(raw))) {
    form.birthday = "";
    return;
  }
  const ageInt = Math.min(150, Math.max(0, Math.floor(Number(raw))));
  form.age = ageInt;
  const birthYear = new Date().getFullYear() - ageInt;
  form.birthday = `${birthYear}-01-01`;
}

const form = reactive({
  visitDate: "",
  patientName: "",
  phone: "",
  chartNo: "",
  birthday: "",
  age: undefined as number | undefined,
  staff: "",
  remark: "",
});

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
form.visitDate = today();

interface ToothRow {
  toothNo: string;
  implantBrand: string;
  implantModel: string;
  toothRemark: string;
}

const teeth = ref<ToothRow[]>([
  { toothNo: "", implantBrand: "", implantModel: "", toothRemark: "" },
]);
const teethSelection = ref<ToothRow[]>([]);
const saving = ref(false);

function addTooth() {
  teeth.value.push({ toothNo: "", implantBrand: "", implantModel: "", toothRemark: "" });
}

function removeSelected() {
  const set = new Set(teethSelection.value);
  teeth.value = teeth.value.filter((row) => !set.has(row));
  if (!teeth.value.length) {
    teeth.value.push({ toothNo: "", implantBrand: "", implantModel: "", toothRemark: "" });
  }
}

async function submit() {
  const phase2 = form.remark.trim();
  if (phase2 && !/^\d+$/.test(phase2)) {
    ElMessage.warning("二期只能填写数字（月数）");
    return;
  }
  const payloadTeeth = teeth.value.filter((tooth) => tooth.toothNo.trim() || tooth.implantModel.trim());
  if (!payloadTeeth.length) {
    ElMessage.warning("请至少填写一条牙位或植体信息");
    return;
  }
  if (!form.patientName.trim()) {
    ElMessage.warning("请输入姓名");
    return;
  }
  if (!form.phone.trim()) {
    ElMessage.warning("请输入手机号");
    return;
  }
  saving.value = true;
  try {
    await createPlantingVisitApi({
      phone: form.phone,
      patientName: form.patientName.trim(),
      chartNo: form.chartNo.trim() || null,
      birthday: form.birthday || null,
      age: form.age != null && !Number.isNaN(Number(form.age)) ? Number(form.age) : null,
      visitDate: form.visitDate,
      remark: phase2 || null,
      staff: form.staff.trim() || null,
      followUp: null,
      teeth: payloadTeeth.map((tooth) => ({
        toothNo: tooth.toothNo.trim() || undefined,
        implantBrand: tooth.implantBrand.trim() || undefined,
        implantModel: tooth.implantModel.trim() || undefined,
        toothRemark: tooth.toothRemark.trim() || undefined,
      })),
    });
    ElMessage.success("已保存");
    teeth.value = [{ toothNo: "", implantBrand: "", implantModel: "", toothRemark: "" }];
    form.patientName = "";
    form.phone = "";
    form.chartNo = "";
    form.birthday = "";
    form.age = undefined;
    form.staff = "";
    form.remark = "";
    form.visitDate = today();
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.planting-add-page {
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
}

.planting-add-page__title {
  font-weight: 600;
  font-size: 16px;
  margin-right: 12px;
}

.planting-add-page__subtitle {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.planting-add-page__form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0 16px;
}

.planting-add-page__teeth-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 12px;
}

.planting-add-page__teeth-title {
  font-weight: 600;
}

.planting-add-page__save-button {
  margin-top: 20px;
}

.planting-add-page__autocomplete-item {
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 1.4;
}

.planting-add-page__autocomplete-name {
  font-weight: 600;
}

.planting-add-page__autocomplete-extra {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
