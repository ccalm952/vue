<template>
  <el-dialog
    :model-value="modelValue"
    :title="editRow ? '编辑患者' : '新增患者'"
    width="600px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @closed="onDialogClosed"
  >
    <el-form ref="addFormRef" :model="addForm" :rules="addRules" label-position="top">
      <div class="patient-add-edit-dialog__row">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="addForm.name" />
        </el-form-item>
        <el-form-item label="手机" prop="phone">
          <el-input v-model="addForm.phone" />
        </el-form-item>
      </div>
      <div class="patient-add-edit-dialog__row">
        <el-form-item label="性别" prop="gender">
          <el-select v-model="addForm.gender" placeholder="" style="width: 100%">
            <el-option label="男" value="男" />
            <el-option label="女" value="女" />
          </el-select>
        </el-form-item>
        <el-form-item label="病历号">
          <el-input v-model="addForm.source" />
        </el-form-item>
      </div>
      <div class="patient-add-edit-dialog__row">
        <el-form-item label="出生日期" prop="birthday">
          <el-date-picker
            v-model="addForm.birthday"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            @change="onBirthdayChange"
          />
        </el-form-item>
        <el-form-item label="年龄" prop="age">
          <el-input v-model.number="addForm.age" @change="onAgeChange" />
        </el-form-item>
      </div>
      <el-form-item label="标签">
        <el-select
          v-model="addForm.tags"
          multiple
          filterable
          placeholder="从「设置 → 患者标签」中已配置的标签里选择（不可在此新增）"
          style="width: 100%"
        >
          <el-option v-for="t in patientTagOptions" :key="t" :label="t" :value="t" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="patientSaveLoading" @click="handlePatientSubmit">
        保存患者
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { createPatientApi, updatePatientApi } from "@/api/patient";
import { patientTagOptions, loadPatientTagOptions } from "@/utils/patient-tags";

/** 与患者列表行一致，用于编辑回填 */
export interface PatientEditRow {
  id: number;
  name: string;
  phone: string;
  gender: string;
  source: string;
  birthday: string;
  age: number;
  /** 患者标签，列表接口有则回填 */
  tags?: string[];
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    /** 非空为编辑模式 */
    editRow?: PatientEditRow | null;
  }>(),
  { editRow: null },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [];
  closed: [];
}>();

const addFormRef = ref<FormInstance>();
const patientSaveLoading = ref(false);

const addForm = reactive({
  name: "",
  phone: "",
  gender: "男",
  source: "",
  birthday: "",
  age: undefined as number | undefined,
  tags: [] as string[],
});

const addRules: FormRules = {
  name: [{ required: true, message: "请输入姓名", trigger: "blur" }],
  phone: [{ required: true, message: "请输入手机", trigger: "blur" }],
  gender: [{ required: true, message: "请选择性别", trigger: "change" }],
  birthday: [{ required: true, message: "请选择出生日期", trigger: "change" }],
  age: [{ required: true, message: "请输入年龄", trigger: "blur" }],
};

function onBirthdayChange(val: string) {
  if (!val) {
    addForm.age = undefined;
    return;
  }
  const birth = new Date(val);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  addForm.age = age;
}

function onAgeChange() {
  const raw = addForm.age;
  const n = Number(raw);
  if (raw === undefined || raw === null || Number.isNaN(n)) {
    addForm.birthday = "";
    return;
  }
  const ageInt = Math.min(150, Math.max(0, Math.floor(n)));
  addForm.age = ageInt;
  const birthYear = new Date().getFullYear() - ageInt;
  addForm.birthday = `${birthYear}-01-01`;
}

function resetAddForm() {
  addForm.name = "";
  addForm.phone = "";
  addForm.gender = "男";
  addForm.source = "";
  addForm.birthday = "";
  addForm.age = undefined;
  addForm.tags = [];
  addFormRef.value?.clearValidate();
}

function tagsAllowedOnly(selected: string[]) {
  const allowed = new Set(patientTagOptions.value);
  return selected.filter((t) => allowed.has(t));
}

function fillFormFromPatient(row: PatientEditRow) {
  addForm.name = row.name ?? "";
  addForm.phone = row.phone ?? "";
  addForm.gender = row.gender ?? "";
  addForm.source = row.source ?? "";
  addForm.birthday = row.birthday ?? "";
  addForm.age = row.age != null ? Number(row.age) : undefined;
  const rawTags = row.tags;
  const fromRow = Array.isArray(rawTags) ? [...rawTags] : [];
  addForm.tags = tagsAllowedOnly(fromRow);
}

function syncFormWhenOpened() {
  if (!props.modelValue) return;
  if (props.editRow) {
    fillFormFromPatient(props.editRow);
    nextTick(() => addFormRef.value?.clearValidate());
  } else {
    resetAddForm();
  }
}

watch(
  () => [props.modelValue, props.editRow] as const,
  () => {
    if (props.modelValue) loadPatientTagOptions();
    syncFormWhenOpened();
  },
);

const patientPayload = () => ({
  name: addForm.name,
  phone: addForm.phone,
  gender: addForm.gender,
  source: addForm.source,
  birthday: addForm.birthday,
  age: addForm.age,
  tags: tagsAllowedOnly(addForm.tags),
});

async function handlePatientSubmit() {
  const valid = await addFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  patientSaveLoading.value = true;
  try {
    const payload = patientPayload();
    const id = props.editRow?.id;
    if (id != null) {
      await updatePatientApi(id, payload);
    } else {
      await createPatientApi(payload);
    }
    emit("update:modelValue", false);
    emit("saved");
  } catch {
    // 错误已在拦截器处理
  } finally {
    patientSaveLoading.value = false;
  }
}

function onDialogClosed() {
  emit("closed");
}
</script>

<style scoped>
.patient-add-edit-dialog__row {
  display: flex;
  gap: 16px;
}

.patient-add-edit-dialog__row > .el-form-item {
  flex: 1;
}
</style>
