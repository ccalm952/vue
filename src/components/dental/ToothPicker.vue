<template>
  <el-dialog
    :model-value="visible"
    :show-close="true"
    width="fit-content"
    class="tooth-picker-dialog"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="tooth-picker">
      <div class="tooth-picker__actions">
        <el-button @click="clearAll">清空</el-button>
        <el-button @click="fillTeeth(allPrimaryUpper.concat(allPrimaryLower))">全口-乳</el-button>
        <el-button @click="fillTeeth(allPrimaryUpper)">上半口-乳</el-button>
        <el-button @click="fillTeeth(allPrimaryLower)">下半口-乳</el-button>
        <el-button @click="fillTeeth(allPermanentUpper.concat(allPermanentLower))"
          >全口-恒</el-button
        >
        <el-button @click="fillTeeth(allPermanentUpper)">上半口-恒</el-button>
        <el-button @click="fillTeeth(allPermanentLower)">下半口-恒</el-button>
      </div>

      <div class="tooth-picker__arch">
        <!-- 左半区 -->
        <div class="tooth-arch__half">
          <div class="tooth-row tooth-row--letters tooth-row--upper tooth-row--align-end">
            <button
              v-for="(t, i) in leftUpperLetters"
              :key="'lul' + i"
              type="button"
              class="tooth-cell tooth-cell--ghost"
              :class="{ 'tooth-cell--active': isSelected(leftUpperPrimary[i]) }"
              @click="toggle(leftUpperPrimary[i])"
            >
              {{ t }}
            </button>
          </div>
          <div class="tooth-row tooth-row--upper tooth-row--align-end">
            <button
              v-for="t in leftUpperPermanent"
              :key="'lup' + t"
              type="button"
              class="tooth-cell"
              :class="{ 'tooth-cell--active': isSelected(t) }"
              @click="toggle(t)"
            >
              {{ t }}
            </button>
          </div>
          <div class="tooth-row tooth-row--lower tooth-row--align-end">
            <button
              v-for="t in leftLowerPermanent"
              :key="'llp' + t"
              type="button"
              class="tooth-cell"
              :class="{ 'tooth-cell--active': isSelected(t) }"
              @click="toggle(t)"
            >
              {{ t }}
            </button>
          </div>
          <div class="tooth-row tooth-row--letters tooth-row--lower tooth-row--align-end">
            <button
              v-for="(t, i) in leftLowerLetters"
              :key="'lll' + i"
              type="button"
              class="tooth-cell tooth-cell--ghost"
              :class="{ 'tooth-cell--active': isSelected(leftLowerPrimary[i]) }"
              @click="toggle(leftLowerPrimary[i])"
            >
              {{ t }}
            </button>
          </div>
        </div>

        <!-- 右半区 -->
        <div class="tooth-arch__half">
          <div class="tooth-row tooth-row--letters tooth-row--upper tooth-row--align-start">
            <button
              v-for="(t, i) in rightUpperLetters"
              :key="'rul' + i"
              type="button"
              class="tooth-cell tooth-cell--ghost"
              :class="{ 'tooth-cell--active': isSelected(rightUpperPrimary[i]) }"
              @click="toggle(rightUpperPrimary[i])"
            >
              {{ t }}
            </button>
          </div>
          <div class="tooth-row tooth-row--upper tooth-row--align-start">
            <button
              v-for="t in rightUpperPermanent"
              :key="'rup' + t"
              type="button"
              class="tooth-cell"
              :class="{ 'tooth-cell--active': isSelected(t) }"
              @click="toggle(t)"
            >
              {{ t }}
            </button>
          </div>
          <div class="tooth-row tooth-row--lower tooth-row--align-start">
            <button
              v-for="t in rightLowerPermanent"
              :key="'rlp' + t"
              type="button"
              class="tooth-cell"
              :class="{ 'tooth-cell--active': isSelected(t) }"
              @click="toggle(t)"
            >
              {{ t }}
            </button>
          </div>
          <div class="tooth-row tooth-row--letters tooth-row--lower tooth-row--align-start">
            <button
              v-for="(t, i) in rightLowerLetters"
              :key="'rll' + i"
              type="button"
              class="tooth-cell tooth-cell--ghost"
              :class="{ 'tooth-cell--active': isSelected(rightLowerPrimary[i]) }"
              @click="toggle(rightLowerPrimary[i])"
            >
              {{ t }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean;
  modelValue: string[];
}>();

const emit = defineEmits<{
  "update:visible": [val: boolean];
  "update:modelValue": [val: string[]];
}>();

const leftUpperLetters = ["E", "D", "C", "B", "A"];
const leftUpperPrimary = ["55", "54", "53", "52", "51"];
const leftUpperPermanent = ["18", "17", "16", "15", "14", "13", "12", "11"];

const rightUpperLetters = ["A", "B", "C", "D", "E"];
const rightUpperPrimary = ["61", "62", "63", "64", "65"];
const rightUpperPermanent = ["21", "22", "23", "24", "25", "26", "27", "28"];

const leftLowerPermanent = ["48", "47", "46", "45", "44", "43", "42", "41"];
const leftLowerLetters = ["E", "D", "C", "B", "A"];
const leftLowerPrimary = ["85", "84", "83", "82", "81"];

const rightLowerPermanent = ["31", "32", "33", "34", "35", "36", "37", "38"];
const rightLowerLetters = ["A", "B", "C", "D", "E"];
const rightLowerPrimary = ["71", "72", "73", "74", "75"];

const allPermanentUpper = [...leftUpperPermanent, ...rightUpperPermanent];
const allPermanentLower = [...leftLowerPermanent, ...rightLowerPermanent];
const allPrimaryUpper = [...leftUpperPrimary, ...rightUpperPrimary];
const allPrimaryLower = [...leftLowerPrimary, ...rightLowerPrimary];

function isSelected(code: string | undefined) {
  if (code == null) return false;
  return props.modelValue.includes(code);
}

function toggle(code: string | undefined) {
  if (code == null) return;
  const list = [...props.modelValue];
  const idx = list.indexOf(code);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(code);
  emit("update:modelValue", list);
}

function fillTeeth(codes: string[]) {
  const set = new Set(props.modelValue);
  for (const c of codes) set.add(c);
  emit("update:modelValue", [...set]);
}

function clearAll() {
  emit("update:modelValue", []);
}
</script>

<style scoped>
.tooth-picker {
  display: inline-grid;
  gap: 16px;
}

.tooth-picker__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tooth-picker__arch {
  display: inline-grid;
  grid-template-columns: auto auto;
  gap: 0;
  justify-items: start;
  align-items: start;
}

.tooth-arch__half {
  display: grid;
  grid-template-rows: auto auto auto auto;
  gap: 0;
}

.tooth-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
}

.tooth-row--align-end {
  justify-content: flex-end;
}

.tooth-row--align-start {
  justify-content: flex-start;
}

.tooth-row--upper {
  align-self: end;
}

.tooth-row--lower {
  align-self: start;
}

.tooth-row--letters.tooth-row--upper {
  margin-bottom: 6px;
}

.tooth-row--letters.tooth-row--lower {
  margin-top: 6px;
}

.tooth-row--upper:not(.tooth-row--letters) {
  margin-bottom: 3px;
}

.tooth-row--lower:not(.tooth-row--letters) {
  margin-top: 3px;
}

.tooth-cell {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  font-size: var(--el-font-size-small);
  color: #303133;
  cursor: pointer;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    background 0.15s,
    color 0.15s;
}

.tooth-cell:hover {
  border-color: #409eff;
}

.tooth-cell--active {
  color: #fff;
  background: #409eff;
  border-color: #409eff;
}

.tooth-cell--ghost {
  border-color: transparent;
  background: transparent;
}

.tooth-cell--ghost:hover {
  background: #f5f7fa;
}

.tooth-cell--ghost.tooth-cell--active {
  color: #409eff;
  background: #ecf5ff;
  border-color: transparent;
  font-weight: 700;
}
</style>

<style>
.tooth-picker-dialog .el-dialog__body {
  padding: 16px 20px;
}
</style>
