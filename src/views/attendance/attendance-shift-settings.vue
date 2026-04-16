<template>
  <div class="shift-settings-page">
    <div class="settings-toolbar">
      <el-button text bg type="primary" @click="router.push('/attendance')">
        <el-icon><ArrowLeft /></el-icon> 返回考勤打卡
      </el-button>
    </div>

    <el-card shadow="hover">
      <template #header>
        <span class="card-title">
          <el-icon><Clock /></el-icon> 班次与时间规则
        </span>
      </template>

      <el-alert type="info" :closable="false" show-icon class="shift-tip">
        配置保存在本机浏览器（localStorage），用于考勤页展示、大按钮推荐顺序与加班统计。
        更换设备或清除站点数据后需重新配置。
      </el-alert>

      <el-form label-position="top" class="shift-form" @submit.prevent>
        <div class="shift-section-title">上午班次</div>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="8">
            <el-form-item label="标签">
              <el-input v-model="form.morning.label" maxlength="8" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="开始时间 (HH:mm)">
              <el-input v-model="form.morning.rangeStart" placeholder="08:30" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="结束时间 (HH:mm)">
              <el-input v-model="form.morning.rangeEnd" placeholder="12:00" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="8">
            <el-form-item label="上午上班可打卡开始 (HH:mm)">
              <el-input v-model="form.morningInWindowStart" placeholder="08:30" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="上午上班可打卡结束 (HH:mm)">
              <el-input v-model="form.morningInWindowEnd" placeholder="12:00" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="上午下班最晚可打 (HH:mm)">
              <el-input v-model="form.morningOutLatest" placeholder="14:30" />
              <div class="field-hint">
                含该分钟内仍可打/改上午下班；未打上午上班则不可打上午下班；未打下午上班则不可打下午下班。
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="shift-section-title">下午班次</div>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="8">
            <el-form-item label="标签">
              <el-input v-model="form.afternoon.label" maxlength="8" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="开始时间 (HH:mm)">
              <el-input v-model="form.afternoon.rangeStart" placeholder="14:30" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="结束时间 (HH:mm)">
              <el-input v-model="form.afternoon.rangeEnd" placeholder="18:00" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <el-form-item label="下午上班最早可打 (HH:mm)">
              <el-input v-model="form.afternoonClockInEarliest" placeholder="14:30" />
              <div class="field-hint">
                当日时钟早于此时间不能打「下午上班」；可先补「上午上班/下班」，已打上午下班时大按钮会引导更新上午下班，直到此时之后才可打下午上班。
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="shift-section-title">推荐顺序与加班</div>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="8">
            <el-form-item label="上午优先推荐截止">
              <el-input v-model="form.morningFirstOrderUntil" placeholder="13:00">
                <template #append>前</template>
              </el-input>
              <div class="field-hint">早于此时大按钮按上午链→下午链；晚于等于则下午链优先</div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="上午正常下班（加班起算）">
              <el-input v-model="form.overtimeMorningNormalEnd" placeholder="12:00" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="下午正常下班（加班起算）">
              <el-input v-model="form.overtimeAfternoonNormalEnd" placeholder="18:00" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="shift-actions">
          <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
          <el-button @click="handleReset">恢复默认</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, Clock } from "@element-plus/icons-vue";
import { useAttendanceShiftStore } from "@/stores/attendance-shift-store";
import { minutesFromMidnight, type AttendanceShiftFullConfig } from "@/config/attendance-shift";

const router = useRouter();
const shiftStore = useAttendanceShiftStore();

const form = reactive<AttendanceShiftFullConfig>(
  JSON.parse(JSON.stringify(shiftStore.merged)) as AttendanceShiftFullConfig,
);

watch(
  () => shiftStore.merged,
  (m) => {
    form.morning = { ...m.morning };
    form.afternoon = { ...m.afternoon };
    form.morningInWindowStart = m.morningInWindowStart;
    form.morningInWindowEnd = m.morningInWindowEnd;
    form.morningOutLatest = m.morningOutLatest;
    form.morningFirstOrderUntil = m.morningFirstOrderUntil;
    form.afternoonClockInEarliest = m.afternoonClockInEarliest;
    form.overtimeMorningNormalEnd = m.overtimeMorningNormalEnd;
    form.overtimeAfternoonNormalEnd = m.overtimeAfternoonNormalEnd;
  },
  { deep: true, immediate: true },
);

const HHMM = /^\d{1,2}:\d{2}$/;

function validateHHMM(label: string, s: string): boolean {
  if (!HHMM.test(s.trim())) {
    ElMessage.error(`${label} 须为 HH:mm，如 08:30`);
    return false;
  }
  return true;
}

const saving = ref(false);

function handleSave() {
  const m = form.morning;
  const a = form.afternoon;
  if (
    !validateHHMM("上午开始", m.rangeStart) ||
    !validateHHMM("上午结束", m.rangeEnd) ||
    !validateHHMM("下午开始", a.rangeStart) ||
    !validateHHMM("下午结束", a.rangeEnd) ||
    !validateHHMM("上午优先截止", form.morningFirstOrderUntil) ||
    !validateHHMM("上午加班起算", form.overtimeMorningNormalEnd) ||
    !validateHHMM("下午加班起算", form.overtimeAfternoonNormalEnd) ||
    !validateHHMM("下午上班最早可打", form.afternoonClockInEarliest) ||
    !validateHHMM("上午上班可打卡开始", form.morningInWindowStart) ||
    !validateHHMM("上午上班可打卡结束", form.morningInWindowEnd) ||
    !validateHHMM("上午下班最晚可打", form.morningOutLatest)
  ) {
    return;
  }
  const wStart = minutesFromMidnight(form.morningInWindowStart.trim());
  const wEnd = minutesFromMidnight(form.morningInWindowEnd.trim());
  if (wStart > wEnd) {
    ElMessage.error("上午上班可打卡开始须早于或等于结束时间");
    return;
  }
  if (minutesFromMidnight(form.morningOutLatest.trim()) < wEnd) {
    ElMessage.error("上午下班最晚可打须不早于「上午上班可打卡结束」");
    return;
  }
  saving.value = true;
  try {
    shiftStore.setFullConfig({
      morning: { ...form.morning },
      afternoon: { ...form.afternoon },
      morningInWindowStart: form.morningInWindowStart.trim(),
      morningInWindowEnd: form.morningInWindowEnd.trim(),
      morningOutLatest: form.morningOutLatest.trim(),
      morningFirstOrderUntil: form.morningFirstOrderUntil.trim(),
      afternoonClockInEarliest: form.afternoonClockInEarliest.trim(),
      overtimeMorningNormalEnd: form.overtimeMorningNormalEnd.trim(),
      overtimeAfternoonNormalEnd: form.overtimeAfternoonNormalEnd.trim(),
    });
    ElMessage.success("已保存");
  } finally {
    saving.value = false;
  }
}

async function handleReset() {
  try {
    await ElMessageBox.confirm("确定恢复为系统默认班次时间？", "恢复默认", {
      type: "warning",
      confirmButtonText: "恢复",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  shiftStore.resetToDefaults();
  const d = shiftStore.merged;
  form.morning = { ...d.morning };
  form.afternoon = { ...d.afternoon };
  form.morningInWindowStart = d.morningInWindowStart;
  form.morningInWindowEnd = d.morningInWindowEnd;
  form.morningOutLatest = d.morningOutLatest;
  form.morningFirstOrderUntil = d.morningFirstOrderUntil;
  form.afternoonClockInEarliest = d.afternoonClockInEarliest;
  form.overtimeMorningNormalEnd = d.overtimeMorningNormalEnd;
  form.overtimeAfternoonNormalEnd = d.overtimeAfternoonNormalEnd;
  ElMessage.success("已恢复默认");
}
</script>

<style scoped>
.shift-settings-page {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
  box-sizing: border-box;
}

.settings-toolbar {
  margin-bottom: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
}

.shift-tip {
  margin-bottom: 20px;
}

.shift-section-title {
  font-size: var(--el-font-size-small);
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin: 8px 0 4px;
}

.shift-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.field-hint {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  margin-top: 4px;
}

.shift-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

@media (max-width: 640px) {
  .shift-settings-page {
    padding: 12px;
  }
}
</style>
