<template>
  <div v-loading="loading" class="patient-detail-page">
    <el-container class="patient-detail-page__body">
      <el-aside width="256px" class="patient-detail-page__aside">
        <RecentPatientsSidebar :active-id="patient?.id ?? null" />
      </el-aside>
      <el-main class="patient-detail-page__main">
        <!-- 顶部信息栏 -->
        <div class="patient-detail-page__top">
          <div class="patient-detail-page__identity">
            <el-avatar :size="48" class="patient-detail-page__avatar">
              {{ patient?.name?.charAt(0) || "?" }}
            </el-avatar>
            <div class="patient-detail-page__name-area">
              <span class="patient-detail-page__name">{{ patient?.name || "-" }}</span>
              <div class="patient-detail-page__meta">
                <span>手机：{{ patient?.phone || "-" }}</span>
                <span>病历号：{{ patient?.source || "-" }}</span>
                <span
                  >创建时间：{{
                    patient?.createdAt ? formatDateYyyyMmDd(patient.createdAt) : "-"
                  }}</span
                >
                <span>初诊医生：{{ patient?.firstVisit || "-" }}</span>
                <span
                  >上次就诊：{{
                    patient?.lastVisitTime ? formatDateYyyyMmDd(patient.lastVisitTime) : "-"
                  }}</span
                >
              </div>
            </div>
          </div>
          <div class="patient-detail-page__top-actions">
            <el-button type="primary" text bg @click="openAppointmentDialog">创建预约</el-button>
            <el-button @click="backToPatientList">返回列表</el-button>
          </div>
        </div>

        <!-- 标签页 -->
        <el-tabs v-model="activeTab" class="patient-detail-page__tabs">
          <el-tab-pane label="患者信息" name="info">
            <div class="patient-detail-page__info-grid">
              <div class="patient-detail-page__info-item">
                <span class="patient-detail-page__info-label">性别</span>
                <span class="patient-detail-page__info-value">{{ patient?.gender || "-" }}</span>
              </div>
              <div class="patient-detail-page__info-item">
                <span class="patient-detail-page__info-label">出生日期</span>
                <span class="patient-detail-page__info-value">{{ patient?.birthday || "-" }}</span>
              </div>
              <div class="patient-detail-page__info-item">
                <span class="patient-detail-page__info-label">年龄</span>
                <span class="patient-detail-page__info-value">{{ patient?.age ? patient.age + " 岁" : "-" }}</span>
              </div>
              <div class="patient-detail-page__info-item">
                <span class="patient-detail-page__info-label">既往史</span>
                <span class="patient-detail-page__info-value">暂无</span>
              </div>
              <div class="patient-detail-page__info-item">
                <span class="patient-detail-page__info-label">过敏源</span>
                <span class="patient-detail-page__info-value">暂无</span>
              </div>
              <div class="patient-detail-page__info-item">
                <span class="patient-detail-page__info-label">用药史</span>
                <span class="patient-detail-page__info-value">暂无</span>
              </div>
              <div class="patient-detail-page__info-item">
                <span class="patient-detail-page__info-label">特殊疾病</span>
                <span class="patient-detail-page__info-value">暂无</span>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="就诊记录" name="records">
            <div v-loading="visitRecordsLoading" class="patient-detail-page__visit-records">
              <div v-if="visitRecords.length" class="patient-detail-page__visit-records-inner">
                <div class="patient-detail-page__visit-records-title">就诊记录</div>
                <el-timeline class="patient-detail-page__visit-timeline">
                  <el-timeline-item
                    v-for="ap in visitRecords"
                    :key="ap.id"
                    type="primary"
                    placement="top"
                    center
                    hollow
                    :timestamp="visitTimelineTimestamp(ap)"
                  >
                    <div class="patient-detail-page__visit-card">
                      <div class="patient-detail-page__visit-card-head">
                        <div class="patient-detail-page__visit-card-head-left">
                          <span class="patient-detail-page__visit-time-range">{{ visitTimeRange(ap) }}</span>
                          <span class="patient-detail-page__visit-type-text"
                            >{{ (ap.visitType || "复诊").trim() }}预约</span
                          >
                          <el-tag size="small" type="success" effect="plain">到店</el-tag>
                          <span class="patient-detail-page__visit-clinic-tag">[本诊所]</span>
                        </div>
                        <el-button text bg type="primary" disabled>
                          <el-icon><View /></el-icon>
                          日志
                        </el-button>
                      </div>
                      <div class="patient-detail-page__visit-card-body">
                        <div class="patient-detail-page__visit-field">
                          <span class="patient-detail-page__visit-field-label">医生</span>
                          <span class="patient-detail-page__visit-field-value">{{
                            (ap.doctorName || "—").trim() || "—"
                          }}</span>
                        </div>
                        <div class="patient-detail-page__visit-field">
                          <span class="patient-detail-page__visit-field-label">预约状态</span>
                          <span class="patient-detail-page__visit-field-value">已预约</span>
                        </div>
                        <div v-if="visitItemsLine(ap)" class="patient-detail-page__visit-items-line">
                          {{ visitItemsLine(ap) }}
                        </div>
                      </div>
                      <div class="patient-detail-page__visit-card-foot">
                        <div class="patient-detail-page__visit-card-actions">
                          <el-button @click="activeTab = 'medical'">电子病历</el-button>
                          <el-button @click="activeTab = 'billing'">收费</el-button>
                        </div>
                        <div class="patient-detail-page__visit-card-meta">
                          {{ visitCreatorLine(ap) }}
                        </div>
                      </div>
                    </div>
                  </el-timeline-item>
                </el-timeline>
              </div>
              <el-empty v-else description="暂无就诊记录（数据来自预约）" />
            </div>
          </el-tab-pane>
          <el-tab-pane label="电子病历" name="medical">
            <PatientDetailMedicalTab :patient-id="patient?.id ?? null" />
          </el-tab-pane>
          <el-tab-pane label="收费" name="billing">
            <!-- 新建收费模式 -->
            <div v-if="billingEditorVisible" class="patient-detail-page__billing-editor">
              <div class="patient-detail-page__billing-editor-body">
                <!-- 左侧：收费项目分类列表 -->
                <div class="patient-detail-page__billing-fee-panel">
                  <div class="patient-detail-page__billing-fee-panel-title">收费项目列表</div>
                  <el-select
                    v-model="billingCategoryFilter"
                    placeholder="全部"
                    clearable
                    style="width: 100%; margin-bottom: 10px"
                  >
                    <el-option label="全部" value="" />
                    <el-option v-for="cat in feeCategories" :key="cat" :label="cat" :value="cat" />
                  </el-select>

                  <div class="patient-detail-page__billing-fee-list">
                    <div
                      v-for="group in filteredFeeGroups"
                      :key="group.category"
                      class="patient-detail-page__billing-fee-group"
                    >
                      <div
                        class="patient-detail-page__billing-fee-group-header"
                        @click="toggleBillingCategory(group.category)"
                      >
                        <span class="patient-detail-page__billing-fee-group-name">{{ group.category }}</span>
                        <el-icon
                          class="patient-detail-page__billing-fee-group-arrow"
                          :class="{ collapsed: collapsedBillingCategories.has(group.category) }"
                        >
                          <ArrowDown />
                        </el-icon>
                      </div>
                      <div
                        v-show="!collapsedBillingCategories.has(group.category)"
                        class="patient-detail-page__billing-fee-group-body"
                      >
                        <div
                          v-for="item in group.items"
                          :key="item.id"
                          class="patient-detail-page__billing-fee-item"
                          @click="addFeeItemToCart(item)"
                        >
                          <span class="patient-detail-page__billing-fee-item-name">{{ item.name }}</span>
                          <span class="patient-detail-page__billing-fee-item-price">{{ item.price }}元</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 右侧：收费录入 -->
                <div class="patient-detail-page__billing-form-panel">
                  <div class="patient-detail-page__billing-form-panel-header">
                    <span class="patient-detail-page__billing-form-panel-title">收费录入</span>
                    <el-button @click="closeBillingEditor">返回收费列表</el-button>
                  </div>

                  <div v-if="billingCart.length" class="patient-detail-page__billing-cart">
                    <el-table :data="billingCart" class="patient-detail-page__billing-table-left">
                      <el-table-column label="项目" prop="itemName" min-width="140" />
                      <el-table-column label="单价" width="128">
                        <template #default="{ row }">
                          <el-input
                            :model-value="billingUnitPriceInputDisplay(row as CartItem)"
                            inputmode="numeric"
                            size="small"
                            class="patient-detail-page__billing-price-input"
                            @focus="onBillingUnitPriceFocus(row as CartItem)"
                            @blur="onBillingUnitPriceBlur(row as CartItem)"
                            @input="(v: unknown) => onBillingUnitPriceInput(row as CartItem, v)"
                          />
                        </template>
                      </el-table-column>
                      <el-table-column label="数量" width="90">
                        <template #default="{ row }">
                          <el-input
                            v-model.number="row.quantity"
                            size="small"
                            style="width: 60px"
                          />
                        </template>
                      </el-table-column>
                      <el-table-column label="小计" width="100">
                        <template #default="{ row }">
                          ¥{{ (Number(row.price) * row.quantity).toFixed(2) }}
                        </template>
                      </el-table-column>
                      <el-table-column label="操作" width="60">
                        <template #default="{ $index }">
                          <el-button type="danger" link @click="removeBillingCartRow($index)">
                            删除
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                  <el-empty v-else :image-size="48" description="请从左侧选择收费项目" />

                  <div class="patient-detail-page__billing-cart-footer">
                    <span class="patient-detail-page__billing-cart-total">
                      合计：<b>¥{{ billingCartTotal.toFixed(2) }}</b>
                    </span>
                  </div>

                  <div class="patient-detail-page__billing-bottom-fields">
                    <div class="patient-detail-page__billing-form-row">
                      <el-form-item label="支付方式">
                        <el-select
                          v-model="billingForm.payMethod"
                          placeholder="选择支付方式"
                          style="width: 100%"
                        >
                          <el-option label="现金" value="现金" />
                          <el-option label="微信" value="微信" />
                          <el-option label="支付宝" value="支付宝" />
                          <el-option label="银行卡" value="银行卡" />
                          <el-option label="医保" value="医保" />
                        </el-select>
                      </el-form-item>
                      <el-form-item label="收费时间">
                        <el-date-picker
                          v-model="billingForm.chargeTime"
                          type="datetime"
                          placeholder="选择时间"
                          value-format="YYYY-MM-DD HH:mm"
                          format="YYYY-MM-DD HH:mm"
                          style="width: 100%"
                        />
                      </el-form-item>
                      <el-form-item label="收费人">
                        <el-select
                          v-model="billingForm.operatorName"
                          filterable
                          clearable
                          placeholder="选择收费人（员工）"
                          style="width: 100%"
                        >
                          <el-option
                            v-for="s in billingStaffOptions"
                            :key="s.id"
                            :label="s.name"
                            :value="s.name"
                          />
                        </el-select>
                      </el-form-item>
                      <el-form-item label="医生">
                        <el-select
                          v-model="billingForm.doctorName"
                          filterable
                          clearable
                          placeholder="选择医生（员工）"
                          style="width: 100%"
                        >
                          <el-option
                            v-for="s in billingStaffOptions"
                            :key="'d-' + s.id"
                            :label="s.name"
                            :value="s.name"
                          />
                        </el-select>
                      </el-form-item>
                    </div>
                    <el-form-item label="备注">
                      <el-input
                        v-model="billingForm.note"
                        type="textarea"
                        :rows="2"
                        placeholder="输入开方理由"
                      />
                    </el-form-item>
                  </div>

                  <div class="patient-detail-page__billing-form-footer">
                    <el-button @click="closeBillingEditor">取消</el-button>
                    <el-button type="primary" :loading="billingSaving" @click="handleBillingSave">
                      创建收费
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 收费列表模式 -->
            <div v-else class="patient-detail-page__billing-tab">
              <div class="patient-detail-page__billing-tab-header">
                <span class="patient-detail-page__billing-tab-title">收费记录</span>
                <el-button type="primary" text bg @click="openBillingEditor"> 新建收费 </el-button>
              </div>

              <!-- 统计卡片 -->
              <div class="patient-detail-page__billing-stats-row">
                <div class="patient-detail-page__billing-stat-card">
                  <div class="patient-detail-page__billing-stat-label">累计应收</div>
                  <div class="patient-detail-page__billing-stat-value">
                    ¥{{ billingStats.totalReceivable.toFixed(2) }}
                  </div>
                </div>
                <div class="patient-detail-page__billing-stat-card">
                  <div class="patient-detail-page__billing-stat-label">累计实付</div>
                  <div class="patient-detail-page__billing-stat-value">
                    ¥{{ billingStats.totalActualPaid.toFixed(2) }}
                  </div>
                </div>
                <div class="patient-detail-page__billing-stat-card">
                  <div class="patient-detail-page__billing-stat-label">欠费</div>
                  <div class="patient-detail-page__billing-stat-value patient-detail-page__billing-stat-arrears">
                    ¥{{ billingStats.totalArrears.toFixed(2) }}
                  </div>
                </div>
                <div class="patient-detail-page__billing-stat-card">
                  <div class="patient-detail-page__billing-stat-label">收费笔数</div>
                  <div class="patient-detail-page__billing-stat-value">{{ billingStats.billingCount }}笔</div>
                </div>
              </div>

              <div v-if="billingRecords.length" class="patient-detail-page__billing-list">
                <div v-for="b in billingRecords" :key="b.id" class="patient-detail-page__billing-record-card">
                  <div class="patient-detail-page__billing-record-header">
                    <el-tag type="success" size="small">{{ b.payMethod || "未指定" }}</el-tag>
                    <span class="patient-detail-page__billing-record-time">{{ formatDateYyMmDd(b.chargeTime) }}</span>
                    <span class="patient-detail-page__billing-record-operator">{{ b.operatorName }}</span>
                    <span v-if="b.doctorName" class="patient-detail-page__billing-record-doctor"
                      >医生 {{ b.doctorName }}</span
                    >
                    <span class="patient-detail-page__billing-record-amount"
                      >¥{{ Number(b.totalAmount).toFixed(2) }}</span
                    >
                  </div>
                  <div v-if="b.items?.length" class="patient-detail-page__billing-record-items">
                    <span v-for="it in b.items" :key="it.id" class="patient-detail-page__billing-record-item-tag">
                      {{ it.itemName }} ×{{ it.quantity }}
                    </span>
                  </div>
                  <div class="patient-detail-page__billing-record-pay-row">
                    <span
                      >实付 ¥{{
                        (b.actualPaid != null && !Number.isNaN(Number(b.actualPaid))
                          ? Number(b.actualPaid)
                          : Number(b.totalAmount)
                        ).toFixed(2)
                      }}</span
                    >
                    <span class="patient-detail-page__billing-record-arrears-line"
                      >欠费 ¥{{ Number(b.arrears ?? 0).toFixed(2) }}</span
                    >
                  </div>
                </div>
              </div>
              <el-empty v-else :image-size="60" description="暂无收费记录">
                <template #default>
                  <div style="text-align: center">
                    <el-empty :image-size="60" description="暂无收费记录" />
                    <el-button type="primary" text bg @click="openBillingEditor">
                      去新建收费记录
                    </el-button>
                  </div>
                </template>
              </el-empty>
            </div>
          </el-tab-pane>
          <el-tab-pane label="影像" name="images">
            <el-empty description="暂无影像资料" />
          </el-tab-pane>
        </el-tabs>
      </el-main>
    </el-container>
    <!-- 创建预约弹窗 -->
    <el-dialog
      v-model="apptDialogVisible"
      title="创建预约"
      width="900px"
      :close-on-click-modal="false"
      class="patient-detail-page__appointment-dialog"
    >
      <div class="patient-detail-page__appointment-body">
        <!-- 左侧 -->
        <div class="patient-detail-page__appointment-left">
          <!-- 患者信息 -->
          <div class="patient-detail-page__appointment-section">
            <div class="patient-detail-page__appointment-section-title">患者信息</div>
            <div class="patient-detail-page__appointment-info-row">
              <span class="patient-detail-page__appointment-info-label">姓名</span>
              <span class="patient-detail-page__appointment-info-value">{{ patient?.name || "-" }}</span>
            </div>
            <div class="patient-detail-page__appointment-info-row">
              <span class="patient-detail-page__appointment-info-label">手机</span>
              <span class="patient-detail-page__appointment-info-value">{{ patient?.phone || "-" }}</span>
            </div>
            <div class="patient-detail-page__appointment-info-row">
              <span class="patient-detail-page__appointment-info-label">病历号</span>
              <span class="patient-detail-page__appointment-info-value">{{ patient?.source || "-" }}</span>
            </div>
          </div>

          <!-- 预约信息 -->
          <div class="patient-detail-page__appointment-section">
            <div class="patient-detail-page__appointment-section-title">预约信息</div>
            <el-form ref="apptFormRef" :model="apptForm" :rules="apptRules" label-position="top">
              <div class="patient-detail-page__appointment-form-row">
                <el-form-item label="就诊类型" prop="visitType">
                  <el-select
                    v-model="apptForm.visitType"
                    placeholder="选择类型"
                    style="width: 100%"
                  >
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
              <div class="patient-detail-page__appointment-form-row">
                <el-form-item label="持续时间" prop="duration">
                  <el-select v-model="apptForm.duration" placeholder="选择时长" style="width: 100%">
                    <el-option
                      v-for="d in durationOptions"
                      :key="d"
                      :label="d + '分钟'"
                      :value="d"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="医生" prop="doctorId">
                  <el-select
                    v-model="apptForm.doctorId"
                    placeholder="选择医生"
                    style="width: 100%"
                    @change="onDoctorChange"
                  >
                    <el-option
                      v-for="doc in doctorList"
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

        <!-- 右侧：预约项目 -->
        <div class="patient-detail-page__appointment-right">
          <div class="patient-detail-page__appointment-section-title">预约项目</div>
          <el-input
            v-model="itemSearchKeyword"
            placeholder="搜索预约项目"
            :suffix-icon="SearchIcon"
            clearable
            style="margin-bottom: 12px"
          />
          <div class="patient-detail-page__appointment-items-list">
            <div
              v-for="category in filteredItemCategories"
              :key="category.name"
              class="patient-detail-page__appointment-category"
            >
              <div class="patient-detail-page__appointment-category-header" @click="toggleCategory(category.name)">
                <span class="patient-detail-page__appointment-category-name">{{ category.name }}</span>
                <el-icon
                  class="patient-detail-page__appointment-category-arrow"
                  :class="{ collapsed: collapsedCategories.has(category.name) }"
                >
                  <ArrowDown />
                </el-icon>
              </div>
              <div v-show="!collapsedCategories.has(category.name)" class="patient-detail-page__appointment-category-body">
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
        <el-button @click="apptDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="apptLoading" @click="handleApptSubmit">
          保存预约
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Search as SearchIcon, ArrowDown, View } from "@element-plus/icons-vue";
import type { FormInstance, FormRules } from "element-plus";
import { getPatientDetailApi } from "@/api/patient";
import { createAppointmentApi, getDoctorListApi, getAppointmentListApi } from "@/api/appointment";
import {
  getFeeItemsApi,
  createBillingApi,
  getBillingListApi,
  getBillingStatsApi,
} from "@/api/billing";
import { getStaffListApi } from "@/api/staff";
import RecentPatientsSidebar from "@/components/patient/RecentPatientsSidebar.vue";
import PatientDetailMedicalTab from "@/components/patient/PatientDetailMedicalTab.vue";
import { addRecentPatient } from "@/utils/recent-patients";
import { lastPatientListQuery } from "@/utils/patient-list-query-snapshot";
import { formatDateYyyyMmDd, formatDateYyMmDd } from "@/utils/datetime";
import { formatAppointmentItemsDisplay } from "@/utils/appointment-items";

interface PatientDetail {
  id: number;
  name: string;
  phone: string;
  gender: string;
  source: string;
  birthday: string;
  age: number;
  createdAt: string;
  firstVisit: string;
  lastVisitTime: string;
}

interface ApiResponse<T> {
  data: T;
}

const route = useRoute();
const router = useRouter();

function backToPatientList() {
  router.push({ name: "patient", query: { ...lastPatientListQuery.value } });
}

const loading = ref(false);
const activeTab = ref("info");
const patient = ref<PatientDetail | null>(null);

/** 就诊记录：与预约一一对应，数据来自预约接口 */
interface VisitAppointmentRow {
  id: number;
  patientId: number;
  patientName?: string;
  visitType: string;
  appointmentTime: string;
  duration: number;
  doctorId?: string;
  doctorName?: string;
  items?: string;
  remark?: string;
  createdAt?: string;
}

interface DoctorOption {
  id: number;
  name: string;
  role: string;
}

interface BillingRecordItem {
  id: number;
  itemName: string;
  quantity: number;
}

interface BillingRecord {
  id: number;
  payMethod?: string;
  chargeTime: string;
  operatorName?: string;
  doctorName?: string;
  totalAmount: number | string;
  actualPaid?: number | string | null;
  arrears?: number | string | null;
  items?: BillingRecordItem[];
}

interface BillingStatsData {
  totalReceivable?: number;
  totalActualPaid?: number;
  totalArrears?: number;
  billingCount?: number;
}

interface StaffListRow {
  id: number;
  name: string;
  role?: string;
  enabled?: boolean;
}

interface StaffListData {
  list?: StaffListRow[];
}

const visitRecords = ref<VisitAppointmentRow[]>([]);
const visitRecordsLoading = ref(false);

function parseApptStart(appointmentTime: string): Date | null {
  const s = (appointmentTime || "").trim();
  if (!s) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/.test(s)
    ? s.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})/, (_, d, h, mi) => {
        const hh = String(h).padStart(2, "0");
        return `${d}T${hh}:${mi}:00`;
      })
    : s;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function visitTimeRange(ap: VisitAppointmentRow) {
  const start = parseApptStart(ap.appointmentTime);
  if (!start) return (ap.appointmentTime || "").trim() || "—";
  const dur = Number(ap.duration) || 30;
  const end = new Date(start.getTime() + dur * 60_000);
  const fmt = (dt: Date) =>
    `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

function visitItemsLine(ap: VisitAppointmentRow) {
  const t = formatAppointmentItemsDisplay(ap.items);
  return t ? `预约项目：${t}` : "";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Timeline 时间戳：单行 yyyy-MM-dd HH:mm（方案 B，与 Element Plus 文档一致） */
function visitTimelineTimestamp(ap: VisitAppointmentRow) {
  const start = parseApptStart(ap.appointmentTime);
  if (!start) {
    const t = (ap.appointmentTime || "").trim();
    return t || "—";
  }
  return `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(start.getDate())} ${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
}

function visitCreatorLine(ap: VisitAppointmentRow) {
  const raw = ap.createdAt;
  if (raw == null || raw === "") return "创建于 —";
  const dt = typeof raw === "string" ? new Date(raw) : (raw as Date);
  if (Number.isNaN(dt.getTime())) return "创建于 —";
  const line = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
  return `创建于 ${line}`;
}

async function fetchVisitRecords(pid: number) {
  visitRecordsLoading.value = true;
  try {
    const res = (await getAppointmentListApi(pid)) as ApiResponse<VisitAppointmentRow[]>;
    const list = (res?.data ?? []) as VisitAppointmentRow[];
    visitRecords.value = Array.isArray(list) ? list : [];
    visitRecords.value.sort((a, b) =>
      String(b.appointmentTime || "").localeCompare(String(a.appointmentTime || "")),
    );
  } catch {
    visitRecords.value = [];
  } finally {
    visitRecordsLoading.value = false;
  }
}

async function fetchDetail(id: number) {
  loading.value = true;
  try {
    const res = (await getPatientDetailApi(id)) as ApiResponse<PatientDetail>;
    patient.value = res.data;
    addRecentPatient({ id: res.data.id, name: res.data.name });
    fetchVisitRecords(id);
    fetchBillingRecords(id);
    fetchBillingStats(id);
  } catch {
    // 错误已在拦截器处理
  } finally {
    loading.value = false;
  }
  await nextTick();
  await tryOpenAppointmentFromRoute();
}

// ---- 预约弹窗 ----
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

const apptDialogVisible = ref(false);
const apptLoading = ref(false);
const apptFormRef = ref<FormInstance>();
const itemSearchKeyword = ref("");
const collapsedCategories = ref(new Set<string>());
const doctorList = ref<DoctorOption[]>([]);

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
  const doc = doctorList.value.find((d) => d.id === id);
  apptForm.doctorName = doc?.name || "";
}

async function openAppointmentDialog() {
  apptForm.visitType = "复诊";
  apptForm.appointmentTime = "";
  apptForm.duration = 30;
  apptForm.doctorId = "";
  apptForm.doctorName = "";
  apptForm.items = [];
  apptForm.remark = "";
  itemSearchKeyword.value = "";
  collapsedCategories.value = new Set();
  apptFormRef.value?.clearValidate();
  if (!doctorList.value.length) await fetchDoctors();
  apptDialogVisible.value = true;
}

/** 从预约看板等入口带 query 打开创建预约并预填 */
async function tryOpenAppointmentFromRoute() {
  if (route.query.openAppointment !== "1") return;
  await openAppointmentDialog();
  const q = route.query;
  if (typeof q.appointmentTime === "string" && q.appointmentTime) {
    apptForm.appointmentTime = q.appointmentTime;
  }
  if (typeof q.duration === "string" && q.duration) {
    const d = Number(q.duration);
    if (!Number.isNaN(d)) apptForm.duration = d;
  }
  if (typeof q.doctorId === "string" && q.doctorId !== "") {
    const did = Number(q.doctorId);
    apptForm.doctorId = Number.isNaN(did) ? q.doctorId : did;
    onDoctorChange(Number(apptForm.doctorId));
  }
  if (typeof q.visitType === "string" && q.visitType) apptForm.visitType = q.visitType;
  if (typeof q.remark === "string") apptForm.remark = q.remark;
  if (typeof q.items === "string" && q.items) {
    try {
      const parsed = JSON.parse(q.items) as unknown;
      if (Array.isArray(parsed)) apptForm.items = parsed as string[];
    } catch {
      /* 忽略 */
    }
  }
  const nextQ = { ...route.query } as Record<string, string | string[] | undefined>;
  delete nextQ.openAppointment;
  delete nextQ.appointmentTime;
  delete nextQ.duration;
  delete nextQ.doctorId;
  delete nextQ.visitType;
  delete nextQ.remark;
  delete nextQ.items;
  router.replace({ path: route.path, query: nextQ });
}

async function fetchDoctors() {
  try {
    const res = (await getDoctorListApi()) as ApiResponse<DoctorOption[]>;
    doctorList.value = res.data;
  } catch {
    // 错误已在拦截器处理
  }
}

async function handleApptSubmit() {
  const valid = await apptFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  apptLoading.value = true;
  try {
    await createAppointmentApi({
      patientId: patient.value?.id,
      patientName: patient.value?.name,
      visitType: apptForm.visitType,
      appointmentTime: apptForm.appointmentTime,
      duration: apptForm.duration,
      doctorId: String(apptForm.doctorId),
      doctorName: apptForm.doctorName,
      items: JSON.stringify(apptForm.items),
      remark: apptForm.remark,
    });
    apptDialogVisible.value = false;
    if (patient.value?.id) await fetchVisitRecords(patient.value.id);
  } catch {
    // 错误已在拦截器处理
  } finally {
    apptLoading.value = false;
  }
}

// ---- 收费 ----
interface FeeItem {
  id: number;
  category: string;
  name: string;
  price: number;
  unit: string;
}
interface CartItem {
  feeItemId: number;
  itemName: string;
  category: string;
  price: number;
  quantity: number;
}

const billingEditorVisible = ref(false);
const billingSaving = ref(false);
const billingCategoryFilter = ref("");
const collapsedBillingCategories = ref(new Set<string>());
const feeItemsAll = ref<FeeItem[]>([]);
const billingRecords = ref<BillingRecord[]>([]);
const billingStats = reactive({
  totalReceivable: 0,
  totalActualPaid: 0,
  totalArrears: 0,
  billingCount: 0,
});
const billingCart = ref<CartItem[]>([]);

interface BillingStaffOption {
  id: number;
  name: string;
}

const billingStaffOptions = ref<BillingStaffOption[]>([]);

async function fetchStaffForBilling() {
  try {
    const res = (await getStaffListApi({ page: 1, pageSize: 500 })) as ApiResponse<StaffListData>;
    const data = res.data || {};
    const list = (data.list || []) as StaffListRow[];
    billingStaffOptions.value = list
      .filter((row) => row.enabled !== false)
      .map((row) => ({
        id: row.id,
        name: row.name || "",
      }))
      .filter((row) => row.name)
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
  } catch {
    billingStaffOptions.value = [];
  }
}

function billingFormatNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const billingForm = reactive({
  payMethod: "现金",
  chargeTime: billingFormatNow(),
  operatorName: "",
  doctorName: "",
  note: "",
});

const feeCategories = computed(() => {
  const cats = new Set<string>();
  feeItemsAll.value.forEach((it) => cats.add(it.category));
  return [...cats];
});

const filteredFeeGroups = computed(() => {
  const items = billingCategoryFilter.value
    ? feeItemsAll.value.filter((it) => it.category === billingCategoryFilter.value)
    : feeItemsAll.value;
  const map = new Map<string, FeeItem[]>();
  for (const it of items) {
    if (!map.has(it.category)) map.set(it.category, []);
    map.get(it.category)!.push(it);
  }
  return [...map.entries()].map(([category, items]) => ({ category, items }));
});

const billingCartTotal = computed(() =>
  billingCart.value.reduce((s, it) => s + Number(it.price) * it.quantity, 0),
);

/** 聚焦中：草稿为纯数字字符串；失焦后无草稿，展示两位小数 */
const billingUnitPriceDraftByFeeId = ref<Record<string, string>>({});

function billingPriceDraftKey(feeItemId: number) {
  return String(feeItemId);
}

/** 失焦后展示：整数元 + 两位小数 */
function formatBillingUnitPriceDisplay(price: unknown) {
  const n = Math.max(0, Math.floor(Number(price) || 0));
  return n.toFixed(2);
}

function billingUnitPriceInputDisplay(row: CartItem) {
  const key = billingPriceDraftKey(row.feeItemId);
  if (Object.prototype.hasOwnProperty.call(billingUnitPriceDraftByFeeId.value, key)) {
    return billingUnitPriceDraftByFeeId.value[key]!;
  }
  return formatBillingUnitPriceDisplay(row.price);
}

function onBillingUnitPriceFocus(row: CartItem) {
  const key = billingPriceDraftKey(row.feeItemId);
  const n = Math.max(0, Math.floor(Number(row.price) || 0));
  billingUnitPriceDraftByFeeId.value = {
    ...billingUnitPriceDraftByFeeId.value,
    [key]: String(n),
  };
}

function onBillingUnitPriceBlur(row: CartItem) {
  const key = billingPriceDraftKey(row.feeItemId);
  const draft = billingUnitPriceDraftByFeeId.value[key];
  row.price =
    draft !== undefined && draft !== ""
      ? parseIntegerYuanFromBillingInput(draft)
      : Math.max(0, Math.floor(Number(row.price) || 0));
  const next = { ...billingUnitPriceDraftByFeeId.value };
  delete next[key];
  billingUnitPriceDraftByFeeId.value = next;
}

function onBillingUnitPriceInput(row: CartItem, raw: unknown) {
  const s =
    typeof raw === "string"
      ? raw
      : String((raw as { target?: HTMLInputElement })?.target?.value ?? "");
  const head = String(s).trim().split(".")[0] ?? "";
  const digits = head.replace(/\D/g, "");
  const key = billingPriceDraftKey(row.feeItemId);
  billingUnitPriceDraftByFeeId.value = { ...billingUnitPriceDraftByFeeId.value, [key]: digits };
  row.price = digits ? parseIntegerYuanFromBillingInput(digits) : 0;
}

function parseIntegerYuanFromBillingInput(raw: string) {
  const head = String(raw).trim().split(".")[0] ?? "";
  const digits = head.replace(/\D/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 999_999_999);
}

function clearBillingUnitPriceDraft(feeItemId: number) {
  const key = billingPriceDraftKey(feeItemId);
  if (!Object.prototype.hasOwnProperty.call(billingUnitPriceDraftByFeeId.value, key)) return;
  const next = { ...billingUnitPriceDraftByFeeId.value };
  delete next[key];
  billingUnitPriceDraftByFeeId.value = next;
}

function removeBillingCartRow(index: number) {
  const row = billingCart.value[index];
  if (row) clearBillingUnitPriceDraft(row.feeItemId);
  billingCart.value.splice(index, 1);
}

function toggleBillingCategory(name: string) {
  const s = new Set(collapsedBillingCategories.value);
  if (s.has(name)) s.delete(name);
  else s.add(name);
  collapsedBillingCategories.value = s;
}

function addFeeItemToCart(item: FeeItem) {
  const existing = billingCart.value.find((c) => c.feeItemId === item.id);
  if (existing) {
    existing.quantity++;
    return;
  }
  billingCart.value.push({
    feeItemId: item.id,
    itemName: item.name,
    category: item.category,
    price: Math.max(0, Math.round(Number(item.price) || 0)),
    quantity: 1,
  });
}

async function fetchFeeItems() {
  if (feeItemsAll.value.length) return;
  try {
    const res = (await getFeeItemsApi()) as ApiResponse<FeeItem[]>;
    feeItemsAll.value = res.data;
  } catch {
    /* */
  }
}

async function fetchBillingRecords(pid: number) {
  try {
    const res = (await getBillingListApi(pid)) as ApiResponse<BillingRecord[]>;
    billingRecords.value = res.data;
  } catch {
    /* */
  }
}

async function fetchBillingStats(pid: number) {
  try {
    const res = (await getBillingStatsApi(pid)) as ApiResponse<BillingStatsData>;
    billingStats.totalReceivable = Number(res.data?.totalReceivable || 0);
    billingStats.totalActualPaid = Number(res.data?.totalActualPaid || 0);
    billingStats.totalArrears = Number(res.data?.totalArrears || 0);
    billingStats.billingCount = Number(res.data?.billingCount || 0);
  } catch {
    /* */
  }
}

function openBillingEditor() {
  billingForm.payMethod = "现金";
  billingForm.chargeTime = billingFormatNow();
  billingForm.operatorName = "";
  billingForm.doctorName = "";
  billingForm.note = "";
  billingCart.value = [];
  billingUnitPriceDraftByFeeId.value = {};
  billingCategoryFilter.value = "";
  collapsedBillingCategories.value = new Set();
  billingEditorVisible.value = true;
  fetchFeeItems();
  fetchStaffForBilling();
}

function closeBillingEditor() {
  billingEditorVisible.value = false;
}

async function handleBillingSave() {
  if (!billingCart.value.length) {
    ElMessage.warning("请至少添加一项收费项目");
    return;
  }
  billingSaving.value = true;
  try {
    await createBillingApi({
      patientId: patient.value!.id,
      payMethod: billingForm.payMethod,
      chargeTime: billingForm.chargeTime,
      operatorName: billingForm.operatorName || undefined,
      doctorName: billingForm.doctorName || undefined,
      note: billingForm.note,
      items: billingCart.value.map((it) => ({
        feeItemId: it.feeItemId,
        itemName: it.itemName,
        category: it.category,
        price: Math.max(0, Math.floor(Number(it.price) || 0)),
        quantity: Math.max(1, Number(it.quantity) || 1),
      })),
    });
    billingEditorVisible.value = false;
    fetchBillingRecords(patient.value!.id);
    fetchBillingStats(patient.value!.id);
  } catch {
    /* */
  } finally {
    billingSaving.value = false;
  }
}

watch(
  () => route.params.id,
  (id) => {
    if (id) fetchDetail(Number(id));
  },
);

onMounted(() => {
  const id = Number(route.params.id);
  if (id) fetchDetail(id);
});
</script>

<style scoped>
.patient-detail-page {
  padding: 16px;
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.patient-detail-page__body.el-container {
  flex: 1;
  min-height: 0;
  gap: 16px;
}

.patient-detail-page__aside.el-aside {
  flex-shrink: 0;
  padding: 0;
  overflow: visible;
  border-right: none;
  background: transparent;
}

.patient-detail-page__main.el-main {
  --el-main-padding: 0;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部信息栏 */
.patient-detail-page__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.patient-detail-page__identity {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.patient-detail-page__avatar {
  background: linear-gradient(135deg, #667eea, #764ba2);
  font-weight: 600;
  flex-shrink: 0;
}

.patient-detail-page__name-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.patient-detail-page__name {
  font-size: var(--el-font-size-extra-large);
  font-weight: 700;
  color: #303133;
}

.patient-detail-page__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: var(--el-font-size-small);
  color: #909399;
}

.patient-detail-page__top-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 标签页：占满主列剩余高度，内容区可滚动 */
.patient-detail-page__tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  padding: 0 20px 20px;
}

.patient-detail-page__tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
  flex-shrink: 0;
}

.patient-detail-page__tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.patient-detail-page__tabs :deep(.el-tab-pane) {
  height: 100%;
}

/* 患者信息网格 */
.patient-detail-page__info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px 32px;
}

.patient-detail-page__info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.patient-detail-page__info-label {
  font-size: var(--el-font-size-small);
  color: #909399;
  font-weight: 500;
}

.patient-detail-page__info-value {
  font-size: var(--el-font-size-base);
  color: #303133;
}

/* 预约弹窗 */
.patient-detail-page__appointment-body {
  display: flex;
  gap: 16px;
  min-height: 420px;
}

.patient-detail-page__appointment-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.patient-detail-page__appointment-right {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.patient-detail-page__appointment-section {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
}

.patient-detail-page__appointment-section-title {
  font-size: var(--el-font-size-base);
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.patient-detail-page__appointment-info-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.patient-detail-page__appointment-info-row:last-child {
  margin-bottom: 0;
}

.patient-detail-page__appointment-info-label {
  font-size: var(--el-font-size-small);
  color: #303133;
  font-weight: 500;
  min-width: 50px;
}

.patient-detail-page__appointment-info-value {
  font-size: var(--el-font-size-small);
  color: #606266;
}

.patient-detail-page__appointment-form-row {
  display: flex;
  gap: 16px;
}

.patient-detail-page__appointment-form-row > .el-form-item {
  flex: 1;
}

:deep(.patient-detail-page__appointment-dialog .el-dialog__body) {
  padding: 16px 20px;
}

/* 预约项目 */
.patient-detail-page__appointment-items-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 4px 0;
}

.patient-detail-page__appointment-category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.patient-detail-page__appointment-category-header:hover {
  background: #f5f7fa;
}

.patient-detail-page__appointment-category-name {
  font-size: var(--el-font-size-small);
  font-weight: 600;
  color: #409eff;
}

.patient-detail-page__appointment-category-arrow {
  transition: transform 0.2s;
  font-size: var(--el-font-size-extra-small);
  color: #909399;
}

.patient-detail-page__appointment-category-arrow.collapsed {
  transform: rotate(-90deg);
}

.patient-detail-page__appointment-category-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 8px;
  padding: 4px 12px 8px;
}

.patient-detail-page__appointment-category-body .el-checkbox {
  margin: 0;
  height: 28px;
}

/* 收费编辑器 */
.patient-detail-page__billing-editor {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.patient-detail-page__billing-editor-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.patient-detail-page__billing-fee-panel {
  width: 240px;
  flex-shrink: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px;
}

.patient-detail-page__billing-fee-panel-title {
  font-size: var(--el-font-size-base);
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.patient-detail-page__billing-fee-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.patient-detail-page__billing-fee-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 4px;
  cursor: pointer;
  user-select: none;
}

.patient-detail-page__billing-fee-group-header:hover {
  background: #f5f7fa;
  border-radius: 4px;
}

.patient-detail-page__billing-fee-group-name {
  font-size: var(--el-font-size-small);
  font-weight: 600;
  color: #409eff;
}

.patient-detail-page__billing-fee-group-arrow {
  transition: transform 0.2s;
  font-size: var(--el-font-size-extra-small);
  color: #909399;
}

.patient-detail-page__billing-fee-group-arrow.collapsed {
  transform: rotate(-90deg);
}

.patient-detail-page__billing-fee-group-body {
  padding: 2px 0 6px;
}

.patient-detail-page__billing-fee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.patient-detail-page__billing-fee-item:hover {
  background: #ecf5ff;
}

.patient-detail-page__billing-fee-item-name {
  font-size: var(--el-font-size-small);
  color: #303133;
}

.patient-detail-page__billing-fee-item-price {
  font-size: var(--el-font-size-small);
  color: #909399;
  white-space: nowrap;
}

.patient-detail-page__billing-form-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px;
}

.patient-detail-page__billing-form-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.patient-detail-page__billing-form-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.patient-detail-page__billing-table-left :deep(.el-table__header th),
.patient-detail-page__billing-table-left :deep(.el-table__body td) {
  text-align: left !important;
}

.patient-detail-page__billing-cart {
  margin-bottom: 4px;
}

.patient-detail-page__billing-price-input {
  width: 100%;
}

.patient-detail-page__billing-bottom-fields {
  border-top: 1px solid #e8e8e8;
  padding-top: 14px;
  margin-top: 8px;
}

.patient-detail-page__billing-form-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 8px;
}

.patient-detail-page__billing-cart-footer {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
}

.patient-detail-page__billing-cart-total {
  font-size: 15px;
  color: #303133;
}

.patient-detail-page__billing-cart-total b {
  color: #f56c6c;
  font-size: var(--el-font-size-large);
}

.patient-detail-page__billing-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e8e8e8;
}

/* 收费列表 */
.patient-detail-page__billing-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.patient-detail-page__billing-tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.patient-detail-page__billing-tab-title {
  font-size: 16px;
  font-weight: 500;
}

.patient-detail-page__billing-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.patient-detail-page__billing-stat-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 14px 16px;
  text-align: center;
}

.patient-detail-page__billing-stat-label {
  font-size: var(--el-font-size-extra-small);
  color: #909399;
  margin-bottom: 6px;
}

.patient-detail-page__billing-stat-value {
  font-size: var(--el-font-size-large);
  font-weight: 700;
  color: #303133;
}

.patient-detail-page__billing-stat-arrears {
  color: #e6a23c;
}

.patient-detail-page__billing-record-pay-row {
  margin-top: 8px;
  font-size: var(--el-font-size-extra-small);
  color: #606266;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.patient-detail-page__billing-record-arrears-line {
  color: #e6a23c;
  font-weight: 600;
}

.patient-detail-page__billing-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.patient-detail-page__billing-record-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 14px 16px;
}

.patient-detail-page__billing-record-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.patient-detail-page__billing-record-time {
  font-size: var(--el-font-size-small);
  color: #909399;
}

.patient-detail-page__billing-record-operator {
  font-size: var(--el-font-size-small);
  color: #606266;
}

.patient-detail-page__billing-record-doctor {
  font-size: var(--el-font-size-small);
  color: #606266;
}

.patient-detail-page__billing-record-amount {
  margin-left: auto;
  font-size: 15px;
  font-weight: 700;
  color: #f56c6c;
}

.patient-detail-page__billing-record-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.patient-detail-page__billing-record-item-tag {
  display: inline-block;
  font-size: var(--el-font-size-extra-small);
  color: #606266;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
}

/* 就诊记录：Element Plus Timeline，时间戳在卡片上方 */
.patient-detail-page__visit-records {
  min-height: 200px;
}

.patient-detail-page__visit-records-inner {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.patient-detail-page__visit-records-title {
  font-size: 16px;
  font-weight: 500;
  line-height: 2;
  margin-bottom: 20px;
}

.patient-detail-page__visit-timeline {
  margin-top: 0;
  /* 勿设 padding-left: 0：会盖住 EP 为节点圆点预留的左侧留白，在 tabs overflow:auto 下易裁切圆点 */
}

.patient-detail-page__visit-timeline :deep(.el-timeline-item__timestamp) {
  font-weight: 600;
  font-size: 14px;
  line-height: 30px;
  color: #303133;
  font-variant-numeric: tabular-nums;
}

.patient-detail-page__visit-timeline :deep(.el-timeline-item__wrapper) {
  padding-right: 0;
}

.patient-detail-page__visit-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.patient-detail-page__visit-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.patient-detail-page__visit-card-head-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  font-size: 13px;
  color: #303133;
}

.patient-detail-page__visit-time-range {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.patient-detail-page__visit-type-text {
  color: #606266;
}

.patient-detail-page__visit-clinic-tag {
  color: #8c8c8c;
  font-size: 12px;
}

.patient-detail-page__visit-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.patient-detail-page__visit-field {
  display: flex;
  gap: 8px;
}

.patient-detail-page__visit-field-label {
  color: #909399;
  flex-shrink: 0;
  width: 5em;
}

.patient-detail-page__visit-field-value {
  color: #303133;
  word-break: break-all;
}

.patient-detail-page__visit-items-line {
  color: #606266;
  font-size: 12px;
  margin-top: 4px;
}

.patient-detail-page__visit-card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.patient-detail-page__visit-card-actions {
  display: flex;
  gap: 8px;
}

.patient-detail-page__visit-card-meta {
  font-size: 12px;
  color: #8c8c8c;
}

@media (max-width: 900px) {
  .patient-detail-page__info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .patient-detail-page__billing-editor-body {
    flex-direction: column;
  }
  .patient-detail-page__billing-fee-panel {
    width: 100%;
  }
  .patient-detail-page__billing-form-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .patient-detail-page__billing-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>


