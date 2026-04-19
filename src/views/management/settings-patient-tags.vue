<template>
  <div class="settings-patient-tags-page">
    <el-card shadow="never" class="settings-patient-tags-page__card">
      <template #header>
        <div class="settings-patient-tags-page__card-header">
          <span class="settings-patient-tags-page__card-title">患者标签</span>
          <span class="settings-patient-tags-page__card-description">
            保存后，新增和编辑患者时只允许选择这里的标签；同时会从全部患者档案中移除已不在列表里的历史标签。
          </span>
        </div>
      </template>

      <div class="settings-patient-tags-page__tag-cloud">
        <el-tag
          v-for="tag in tags"
          :key="tag"
          class="settings-patient-tags-page__tag"
          closable
          type="info"
          effect="plain"
          @close="removeTag(tag)"
        >
          {{ tag }}
        </el-tag>
        <span v-if="!tags.length" class="settings-patient-tags-page__empty-hint">
          暂无标签，请在下方添加
        </span>
      </div>

      <div class="settings-patient-tags-page__add-row">
        <el-input
          v-model="newTagInput"
          placeholder="输入标签名称后点击添加或按回车"
          maxlength="20"
          show-word-limit
          clearable
          style="max-width: 320px"
          @keyup.enter="addTag"
        />
        <el-button type="primary" :disabled="!canAdd" @click="addTag">添加</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  PATIENT_TAGS_STORAGE_KEY,
  patientTagOptions,
  loadPatientTagOptions,
  savePatientTagOptions,
} from "@/utils/patient-tags";
import { prunePatientTagsApi } from "@/api/patient";

const tags = ref<string[]>([]);
const newTagInput = ref("");

const canAdd = computed(() => newTagInput.value.trim().length > 0);

function syncFromStore() {
  loadPatientTagOptions();
  tags.value = [...patientTagOptions.value];
}

/** 写入本地白名单后，同步裁剪服务端患者身上的历史标签。 */
async function persist(nextTags: string[]) {
  savePatientTagOptions(nextTags);
  await prunePatientTagsApi(nextTags);
}

async function addTag() {
  const raw = newTagInput.value.trim();
  if (!raw) return;
  if (tags.value.includes(raw)) {
    ElMessage.warning("已存在相同标签");
    return;
  }
  const prev = [...tags.value];
  const next = [...tags.value, raw];
  tags.value = next;
  newTagInput.value = "";
  try {
    await persist(next);
    ElMessage.success("已保存");
  } catch {
    tags.value = prev;
    savePatientTagOptions(prev);
    loadPatientTagOptions();
  }
}

async function removeTag(tag: string) {
  const prev = [...tags.value];
  const next = tags.value.filter((item) => item !== tag);
  tags.value = next;
  try {
    await persist(next);
    ElMessage.success("已删除");
  } catch {
    tags.value = prev;
    savePatientTagOptions(prev);
    loadPatientTagOptions();
  }
}

async function onStorage(event: StorageEvent) {
  if (event.key !== PATIENT_TAGS_STORAGE_KEY && event.key !== null) return;
  syncFromStore();
  try {
    await prunePatientTagsApi([...patientTagOptions.value]);
  } catch {
    /* 其他标签页更新本地配置时，尽量同步服务端。 */
  }
}

onMounted(() => {
  syncFromStore();
  window.addEventListener("storage", onStorage);
});

onUnmounted(() => {
  window.removeEventListener("storage", onStorage);
});
</script>

<style scoped>
.settings-patient-tags-page {
  padding: 16px;
  box-sizing: border-box;
}

.settings-patient-tags-page__card {
  max-width: 800px;
}

.settings-patient-tags-page__card-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.settings-patient-tags-page__card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.settings-patient-tags-page__card-description {
  font-size: 13px;
  color: #909399;
  font-weight: normal;
}

.settings-patient-tags-page__tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  min-height: 48px;
  margin-bottom: 20px;
}

.settings-patient-tags-page__tag {
  font-size: 13px;
}

.settings-patient-tags-page__empty-hint {
  font-size: 13px;
  color: #c0c4cc;
}

.settings-patient-tags-page__add-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
</style>
