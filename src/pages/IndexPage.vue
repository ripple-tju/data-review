<template>
  <q-page class="column items-center justify-evenly">
    <!-- 文件上传区域 -->
    <div class="file-upload-section q-pa-md full-width" style="max-width: 1080px">
      <q-card class="q-pa-md">
        <q-card-section>
          <div class="text-h6 q-mb-md">数据文件上传</div>

          <div class="row q-gutter-md">
            <div class="col">
              <q-file
                v-model="archiveFile"
                label="上传存档数据文件 (JSON)"
                accept=".json"
                outlined
                clearable
                @update:model-value="onArchiveFileChange"
              >
                <template #prepend>
                  <q-icon name="upload_file" />
                </template>
              </q-file>
              <div class="text-caption q-mt-xs text-grey">
                支持 parseRippleForQuery 格式的 JSON 文件
              </div>
            </div>

            <div class="col">
              <q-file
                v-model="cutwordFile"
                label="上传分词缓存文件 (JSON)"
                accept=".json"
                outlined
                clearable
                @update:model-value="onCutwordFileChange"
              >
                <template #prepend>
                  <q-icon name="upload_file" />
                </template>
              </q-file>
              <div class="text-caption q-mt-xs text-grey">分词缓存数据，可选上传</div>
            </div>
          </div>

          <div class="row q-gutter-md q-mt-md">
            <q-btn
              color="primary"
              label="处理数据"
              @click="processUploadedData"
              :disable="!archiveFile || isProcessing"
              :loading="isProcessing"
            />

            <q-btn
              color="secondary"
              label="使用示例数据"
              @click="loadDefaultData"
              :disable="isProcessing"
              outline
            />
          </div>

          <div v-if="uploadStatus" class="q-mt-md">
            <q-banner
              :class="uploadStatus.type === 'error' ? 'bg-negative' : 'bg-positive'"
              text-color="white"
            >
              {{ uploadStatus.message }}
            </q-banner>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- 身份筛选区域 -->
    <div
      v-if="allPostView.length > 0"
      class="identity-filter-section q-pa-md full-width"
      style="max-width: 1080px"
    >
      <IdentitySelector v-model="selectedIdentityIds" :all-post-view="allPostView" />
    </div>

    <!-- 日期筛选区域 -->
    <div
      v-if="selectedIdentityIds.length > 0 && filteredDateStats.length > 0"
      class="date-filter-section q-pa-md full-width"
      style="max-width: 1080px"
    >
      <q-card class="q-pa-md">
        <q-card-section>
          <div class="text-h6 q-mb-md">
            <q-icon name="event" class="q-mr-sm" />
            日期筛选器
          </div>
          <div class="text-caption q-mb-md text-grey">
            帖子创建时间范围: {{ dateRange?.earliest }} 至 {{ dateRange?.latest }} (共
            {{ filteredDateStats.length }} 天，基于已选身份)
          </div>

          <!-- 操作按钮 -->
          <div class="row q-gutter-sm q-mb-md">
            <q-btn
              size="sm"
              color="primary"
              outline
              label="全选"
              @click="selectAllDates"
              icon="select_all"
            />
            <q-btn
              size="sm"
              color="negative"
              outline
              label="全不选"
              @click="selectNoneDates"
              icon="deselect"
            />
            <q-btn
              size="sm"
              color="secondary"
              outline
              label="最近7天"
              @click="selectRecentDates(7)"
              icon="today"
            />
            <q-btn
              size="sm"
              color="secondary"
              outline
              label="最近30天"
              @click="selectRecentDates(30)"
              icon="date_range"
            />
          </div>

          <!-- 统计信息 -->
          <div class="row q-gutter-md q-mb-md">
            <q-chip
              color="primary"
              text-color="white"
              icon="event_available"
              :label="`已选择: ${selectedDates.length} 天`"
            />
            <q-chip
              color="grey"
              text-color="white"
              icon="archive"
              :label="`关联存档: ${filteredDateStats.reduce((sum, stat) => sum + stat.archiveCount, 0)} 个`"
            />
            <q-chip
              color="info"
              text-color="white"
              icon="article"
              :label="`帖子总计: ${filteredDateStats.reduce((sum, stat) => sum + stat.postCount, 0)} 个`"
            />
          </div>

          <!-- 日期列表 -->
          <div class="date-list scroll" style="max-height: 300px">
            <q-list bordered separator dense>
              <q-item-label header class="text-weight-bold">
                日期列表 ({{ filteredDateStats.length }} 天，已选身份的帖子创建日期)
              </q-item-label>

              <q-item
                v-for="dateStat in filteredDateStats"
                :key="dateStat.date"
                clickable
                @click="toggleDate(dateStat.date)"
                :class="{ 'bg-blue-1': selectedDates.includes(dateStat.date) }"
              >
                <q-item-section side>
                  <q-checkbox
                    :model-value="selectedDates.includes(dateStat.date)"
                    @update:model-value="toggleDate(dateStat.date)"
                  />
                </q-item-section>

                <q-item-section>
                  <q-item-label>
                    <span class="text-weight-medium">{{ dateStat.date }}</span>
                  </q-item-label>
                  <q-item-label caption>
                    <span class="text-grey-7">
                      帖子: {{ dateStat.postCount }} 个 | 关联存档: {{ dateStat.archiveCount }} 个
                    </span>
                  </q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-chip
                    v-if="selectedDates.includes(dateStat.date)"
                    size="sm"
                    color="positive"
                    text-color="white"
                    icon="check"
                    label="已选"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- 数据处理按钮区域 -->
    <div
      v-if="allPostView.length > 0"
      class="process-button-section q-pa-md full-width"
      style="max-width: 1080px"
    >
      <!-- 数据处理按钮 -->
      <div class="text-center q-mt-md">
        <q-btn
          color="primary"
          label="开始数据统计分析"
          icon="analytics"
          size="md"
          @click="processSelectedData"
          :disable="selectedIdentityIds.length === 0 || isProcessingAnalysis"
          :loading="isProcessingAnalysis"
          class="q-px-xl"
        />
        <div class="text-caption q-mt-xs text-grey">
          已选择 {{ selectedIdentityIds.length }} 个身份 和
          {{ selectedDates.length }} 个日期，点击开始分析
        </div>
      </div>
    </div>

    <!-- 数据展示区域 -->
    <div v-if="analysisResults" class="full-width q-mx-auto" style="max-width: 1080px">
      <!-- 调试信息 -->
      <div class="q-pa-md q-mb-md bg-grey-2 rounded-borders">
        <div class="text-caption">
          <strong>调试信息：</strong><br />
          全平台帖子数量：{{ analysisResults.filteredAllPostView.length }}<br />
          身份组数量：{{ analysisResults.filteredPostViewListGroupByIdentity.length }}<br />
          身份组名称：{{
            analysisResults.filteredPostViewListGroupByIdentity.map((g) => g.name).join(', ')
          }}
        </div>
      </div>

      <!-- 标签页导航 -->
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey"
        active-color="primary"
        align="justify"
        indicator-color="primary"
      >
        <q-tab name="overview" label="全平台概览" icon="analytics" />
        <q-tab name="byIdentity" label="按身份统计" icon="people" />
        <!-- <q-tab name="report" label="报告生成" icon="assessment" /> -->
        <q-tab name="export" label="数据导出" icon="download" />
      </q-tabs>

      <q-separator class="q-mb-md" />

      <q-tab-panels
        v-model="activeTab"
        animated
        transition-prev="slide-right"
        transition-next="slide-left"
      >
        <!-- 全平台概览标签页 -->
        <q-tab-panel name="overview" class="q-pa-none">
          <div class="row items-center q-mb-md">
            <h3 class="q-ma-none">
              全平台身份统计
              <q-chip
                color="primary"
                text-color="white"
                icon="people"
                :label="`已选择 ${selectedIdentityIds.length} 个身份`"
                class="q-ml-sm"
              />
            </h3>
          </div>

          <!-- 只在当前标签页激活时渲染组件，避免WebGL上下文冲突 -->
          <AppPostListStatistics
            v-if="activeTab === 'overview'"
            :query="query"
            :postViewList="analysisResults.filteredAllPostView"
            :cutWordCache="cutwordCache"
            :id-list="idList"
            :key="'overview-' + selectedIdentityIds.join('-')"
          />
        </q-tab-panel>

        <!-- 按身份统计标签页 -->
        <q-tab-panel name="byIdentity" class="q-pa-none">
          <!-- 身份选择器 -->
          <div class="q-mb-md">
            <q-select
              v-model="selectedIdentityForView"
              :options="identityOptions"
              label="选择要查看的身份统计"
              emit-value
              map-options
              outlined
              clearable
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="person" />
              </template>
            </q-select>
          </div>

          <!-- 只显示选中的身份统计，避免同时渲染多个图表 -->
          <div v-if="currentIdentityData">
            <div class="row items-center q-mb-md">
              <h3 class="q-ma-none">身份：{{ currentIdentityData.name }}</h3>
              <q-chip
                color="info"
                text-color="white"
                icon="article"
                :label="`${currentIdentityData.postViewList.length} 个帖子`"
                class="q-ml-sm"
              />
            </div>
            <AppPostListStatistics
              v-if="activeTab === 'byIdentity'"
              :query="query"
              :postViewList="currentIdentityData.postViewList"
              :cutWordCache="cutwordCache"
              :id-list="idList"
              :key="'identity-' + currentIdentityData.name"
            />
          </div>

          <!-- 未选择身份时的提示 -->
          <div v-else class="text-center q-pa-xl">
            <q-icon name="person_search" size="4rem" color="grey-5" class="q-mb-md" />
            <div class="text-h6 q-mb-md text-grey-6">选择身份查看统计</div>
            <div class="text-body2 text-grey">请从上方下拉框中选择一个身份来查看其详细统计信息</div>
          </div>
        </q-tab-panel>

        <!-- 报告生成标签页 -->
        <q-tab-panel name="report" class="q-pa-none">
          <!-- <ReportGenerator
            v-if="activeTab === 'report'"
            :analysisResults="analysisResults"
            :query="query"
            :id-list="idList"
            :key="'report-' + selectedIdentityIds.join('-')"
          /> -->
        </q-tab-panel>

        <!-- 数据导出标签页 -->
        <q-tab-panel name="export" class="q-pa-none">
          <div class="text-center q-pa-xl">
            <q-icon name="download" size="4rem" color="primary" class="q-mb-md" />
            <div class="text-h6 q-mb-md">数据导出</div>
            <div class="text-body2 text-grey q-mb-lg">
              导出当前筛选的 {{ analysisResults.filteredAllPostView.length }} 条帖子数据
            </div>

            <!-- 导出统计信息 -->
            <div class="row justify-center q-gutter-md q-mb-lg">
              <q-card flat bordered class="q-pa-md" style="min-width: 150px">
                <div class="text-h4 text-primary">
                  {{ analysisResults.filteredAllPostView.length }}
                </div>
                <div class="text-caption text-grey">帖子总数</div>
              </q-card>
              <q-card flat bordered class="q-pa-md" style="min-width: 150px">
                <div class="text-h4 text-secondary">{{ selectedIdentityIds.length }}</div>
                <div class="text-caption text-grey">选择身份</div>
              </q-card>
              <q-card flat bordered class="q-pa-md" style="min-width: 150px">
                <div class="text-h4 text-info">{{ selectedDates.length }}</div>
                <div class="text-caption text-grey">选择日期</div>
              </q-card>
            </div>

            <q-btn
              color="primary"
              icon="download"
              label="导出CSV文件"
              size="lg"
              @click="openExportDialog"
              :disable="!analysisResults || analysisResults.filteredAllPostView.length === 0"
              class="q-px-xl"
            />
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- CSV导出配置对话框 -->
    <q-dialog v-model="showExportDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">CSV导出设置</div>
          <div class="text-subtitle2 text-grey">
            即将导出 {{ analysisResults?.filteredAllPostView.length || 0 }} 条帖子数据
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="text-subtitle1 q-mb-md">选择要导出的字段：</div>

          <!-- 快捷操作按钮 -->
          <div class="row q-gutter-sm q-mb-md">
            <q-btn size="sm" outline color="primary" label="全选" @click="selectAllFields" />
            <q-btn size="sm" outline color="negative" label="全不选" @click="selectNoneFields" />
          </div>

          <!-- 字段选择区域 -->
          <div class="row">
            <div class="col-6">
              <div class="text-weight-medium q-mb-sm">帖子基本信息</div>
              <div v-for="(config, field) in exportFields" :key="field">
                <q-checkbox
                  v-if="field.startsWith('post.')"
                  v-model="config.selected"
                  :label="config.label"
                  class="q-mb-xs"
                />
              </div>
            </div>
            <div class="col-6">
              <div class="text-weight-medium q-mb-sm">存档数据（最新）</div>
              <div v-for="(config, field) in exportFields" :key="field">
                <q-checkbox
                  v-if="field.startsWith('archive.')"
                  v-model="config.selected"
                  :label="config.label"
                  class="q-mb-xs"
                />
              </div>
            </div>
          </div>

          <!-- 选中字段预览 -->
          <div class="q-mt-md">
            <div class="text-subtitle2">
              已选择字段 ({{ Object.values(exportFields).filter((f) => f.selected).length }})：
            </div>
            <div class="text-caption text-grey">
              {{
                Object.entries(exportFields)
                  .filter(([, config]) => config.selected)
                  .map(([, config]) => config.label)
                  .join(', ') || '未选择任何字段'
              }}
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" @click="showExportDialog = false" />
          <q-btn
            flat
            label="导出CSV"
            color="primary"
            @click="exportToCsv"
            :disable="Object.values(exportFields).filter((f) => f.selected).length === 0"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import AppPostListStatistics from './components/PostListStatistics.vue';
import IdentitySelector from 'src/components/IdentitySelector.vue';
import ReportGenerator from 'src/components/ReportGenerator.vue';
import { Query, QueryInterface } from 'src/query';
import { parseForQuery } from 'src/query/transform';
import { parseRippleForQuery } from 'src/query/transformRipple';
import { divideByDay } from 'src/query/utils';
import * as Spec from 'src/specification';
import { IDENTITY_LIST } from 'src/specification/IdentityData';

const query = ref<QueryInterface>(Query(parseRippleForQuery([])));
const idList = ref<Array<Spec.IdentityView.Type>>([]);
const allPostView = ref<Array<Spec.PostView.Type>>([]);
const postViewListGroupByIdentity = ref<
  Array<{
    name: string;
    postViewList: Array<Spec.PostView.Type>;
  }>
>([]);
const cutwordCache = ref<{
  cutWordCache: Array<{
    id: Spec.PostArchive.Type['id'];
    wordList: Array<string>;
  }>;
  reverseIndex: Record<string, Array<string>>;
}>({
  cutWordCache: [],
  reverseIndex: {},
});

// 身份筛选相关状态
const selectedIdentityIds = ref<string[]>([]);
const isProcessingAnalysis = ref(false);
const analysisResults = ref<{
  filteredAllPostView: Array<Spec.PostView.Type>;
  filteredPostViewListGroupByIdentity: Array<{
    name: string;
    postViewList: Array<Spec.PostView.Type>;
  }>;
} | null>(null);

// 标签页相关状态
const activeTab = ref('overview');
const selectedIdentityForView = ref<string | null>(null);

// 计算身份选项
const identityOptions = computed(() => {
  if (!analysisResults.value) return [];

  return analysisResults.value.filteredPostViewListGroupByIdentity.map((item) => ({
    label: `${item.name} (${item.postViewList.length} 个帖子)`,
    value: item.name,
  }));
});

// 🔥 [优化] 计算当前选中身份的数据 - 避免在模板中重复计算
const currentIdentityData = computed(() => {
  if (!selectedIdentityForView.value || !analysisResults.value) return null;

  return (
    analysisResults.value.filteredPostViewListGroupByIdentity.find(
      (item) => item.name === selectedIdentityForView.value,
    ) || null
  );
});

// 🔥 [优化] 计算筛选后的帖子数据 - 按帖子创建时间筛选
const getFilteredPostView = () => {
  console.log('📊 [数据筛选] 开始计算筛选后的帖子数据...');

  // 获取基础筛选数据（按身份筛选）
  let filteredAllPostView = allPostView.value.filter((postView) =>
    selectedIdentityIds.value.includes(postView.post.author),
  );

  // 如果选择了特定日期，按帖子创建时间进一步筛选
  if (selectedDates.value.length > 0) {
    filteredAllPostView = filteredAllPostView.filter((postView) => {
      try {
        if (!postView.post.createdAt) return false;
        // 使用 dayjs 格式化，与 divideByDay 保持一致
        const postDate = dayjs(postView.post.createdAt).format('YYYY-MM-DD');
        return postDate && selectedDates.value.includes(postDate);
      } catch {
        return false;
      }
    });
  }

  console.log(`📊 [数据筛选] 帖子数据筛选完成，结果: ${filteredAllPostView.length} 个帖子`);
  return filteredAllPostView;
};

// 🔥 [优化] 计算筛选后的分组数据 - 按帖子创建时间筛选
const getFilteredGroupByIdentity = () => {
  console.log('📊 [数据筛选] 开始计算筛选后的分组数据...');

  const filteredPostViewListGroupByIdentity = [];

  for (const selectedId of selectedIdentityIds.value) {
    // 找到对应的身份信息
    const identity = idList.value.find((id) => id.identity.id === selectedId);
    if (identity) {
      // 从已有的分组数据中查找，避免重复API调用
      const existingGroup = postViewListGroupByIdentity.value.find(
        (group) => group.name === (identity.archive[0]?.name || 'Unknown'),
      );

      if (existingGroup) {
        console.log(
          `📊 [数据筛选] 使用缓存数据为身份 "${existingGroup.name}" (${selectedId})，帖子数量: ${existingGroup.postViewList.length}`,
        );

        // 如果有日期筛选，按帖子创建时间对帖子进行筛选
        let postViewList = existingGroup.postViewList;
        if (selectedDates.value.length > 0) {
          postViewList = postViewList.filter((postView) => {
            try {
              if (!postView.post.createdAt) return false;
              // 使用 dayjs 格式化，与 divideByDay 保持一致
              const postDate = dayjs(postView.post.createdAt).format('YYYY-MM-DD');
              return postDate && selectedDates.value.includes(postDate);
            } catch {
              return false;
            }
          });
        }

        filteredPostViewListGroupByIdentity.push({
          name: existingGroup.name,
          postViewList: postViewList,
        });
      }
    }
  }

  console.log(
    `📊 [数据筛选] 分组数据筛选完成，结果: ${filteredPostViewListGroupByIdentity.length} 个分组`,
  );
  return filteredPostViewListGroupByIdentity;
};

// 日期筛选相关状态
const dateStats = ref<
  Array<{
    date: string;
    archiveCount: number;
    postCount: number;
  }>
>([]);
const selectedDates = ref<string[]>([]);
const dateRange = ref<{
  earliest: string;
  latest: string;
} | null>(null);

// CSV导出相关状态
const showExportDialog = ref(false);
const exportFields = ref({
  // 帖子基本信息
  'post.id': { label: '帖子ID', selected: false },
  'post.author': { label: '作者ID', selected: false },
  'post.authorName': { label: '作者名字', selected: true },
  'post.createdAt': { label: '帖子创建时间', selected: true },
  'post.root': { label: '根帖子ID', selected: false },
  'post.parent': { label: '父帖子ID', selected: false },
  // 最新存档数据
  'archive.content': { label: '帖子内容', selected: true },
  'archive.url': { label: '帖子链接', selected: true },
  'archive.like': { label: '点赞数', selected: true },
  'archive.comment': { label: '评论数', selected: true },
  'archive.share': { label: '分享数', selected: true },
  'archive.view': { label: '浏览数', selected: false },
  'archive.favorite': { label: '收藏数', selected: false },
  // 'archive.createdAt': { label: '存档时间', selected: false },
  'archive.capturedAt': { label: '抓取时间', selected: true },
});

// 文件上传相关状态
const archiveFile = ref<File | null>(null);
const cutwordFile = ref<File | null>(null);
const isProcessing = ref(false);
const uploadStatus = ref<{
  type: 'success' | 'error';
  message: string;
} | null>(null);

// 🔥 [身份筛选] 处理选择的身份进行数据分析
const processSelectedData = () => {
  if (selectedIdentityIds.value.length === 0) {
    return;
  }

  isProcessingAnalysis.value = true;

  try {
    const analysisStart = performance.now();
    console.log('🔍 [身份分析] 开始处理选择的身份数据...');
    console.log('🔍 [身份分析] 选择的身份ID:', selectedIdentityIds.value);
    console.log('🔍 [日期分析] 选择的日期:', selectedDates.value);

    // 使用 computed 计算筛选后的数据，避免重复计算
    const filteredAllPostView = getFilteredPostView();
    const filteredPostViewListGroupByIdentity = getFilteredGroupByIdentity();

    // 保存分析结果
    analysisResults.value = {
      filteredAllPostView,
      filteredPostViewListGroupByIdentity,
    };

    const analysisEnd = performance.now();
    console.log(`🔍 [身份分析] 数据分析完成，耗时: ${(analysisEnd - analysisStart).toFixed(2)}ms`);
    console.log(`🔍 [身份分析] 筛选后帖子数量: ${filteredAllPostView.length}`);
    console.log(`🔍 [身份分析] 筛选后身份组数量: ${filteredPostViewListGroupByIdentity.length}`);
  } catch (error) {
    console.error('身份数据分析失败:', error);
  } finally {
    isProcessingAnalysis.value = false;
  }
};

// 🔥 [CSV导出] CSV导出相关功能
const openExportDialog = () => {
  if (!analysisResults.value || analysisResults.value.filteredAllPostView.length === 0) {
    return;
  }
  showExportDialog.value = true;
};

// 🔥 [日期分析] 计算基于选择身份的存档日期统计
const filteredDateStats = computed(() => {
  if (allPostView.value.length === 0 || selectedIdentityIds.value.length === 0) {
    return [];
  }

  console.log('📅 [日期分析] 开始分析筛选后的帖子日期统计...');

  // 收集选择身份的帖子数据（基于帖子创建时间）
  const filteredPosts: Array<Spec.PostView.Type> = [];
  allPostView.value.forEach((postView) => {
    // 只包含选择的身份
    if (selectedIdentityIds.value.includes(postView.post.author)) {
      filteredPosts.push(postView);
    }
  });

  // 使用 divideByDay 按帖子创建日期分组，使用默认的日期提取函数
  const postsByDate = divideByDay(filteredPosts, (postView) =>
    dayjs(postView.post.createdAt).format('YYYY-MM-DD'),
  ).filter((item) => item.date !== ''); // 过滤掉无效日期

  // 统计每个日期的信息
  const stats = postsByDate
    .map(({ date, itemList }) => {
      // 计算该日期的帖子数量和总存档数量
      const postCount = itemList.length;
      const archiveCount = itemList.reduce((sum, postView) => sum + postView.archive.length, 0);

      return {
        date,
        postCount,
        archiveCount,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date)); // 按日期排序

  console.log('📅 [日期分析] 筛选后帖子日期统计分析完成:', {
    totalDays: stats.length,
    totalPosts: filteredPosts.length,
    selectedIdentities: selectedIdentityIds.value.length,
  });

  return stats;
});

// 🔥 [日期分析] 分析所有帖子数据的日期统计（用于初始化）
const analyzeDateStats = () => {
  if (allPostView.value.length === 0) {
    dateStats.value = [];
    dateRange.value = null;
    selectedDates.value = [];
    return;
  }

  console.log('📅 [日期分析] 开始分析帖子日期统计...');

  // 使用 divideByDay 按帖子创建日期分组，使用默认的日期提取函数
  const postsByDate = divideByDay(allPostView.value, (postView) =>
    dayjs(postView.post.createdAt).format('YYYY-MM-DD'),
  ).filter((item) => item.date !== ''); // 过滤掉无效日期

  // 统计每个日期的信息
  const stats = postsByDate
    .map(({ date, itemList }) => {
      // 计算该日期的帖子数量和总存档数量
      const postCount = itemList.length;
      const archiveCount = itemList.reduce((sum, postView) => sum + postView.archive.length, 0);

      return {
        date,
        postCount,
        archiveCount,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date)); // 按日期排序

  dateStats.value = stats;

  // 设置日期范围
  if (stats.length > 0) {
    const firstStat = stats[0];
    const lastStat = stats[stats.length - 1];
    if (firstStat && lastStat) {
      dateRange.value = {
        earliest: firstStat.date,
        latest: lastStat.date,
      };
      // 默认选择所有日期
      selectedDates.value = stats.map((stat) => stat.date);
    }
  } else {
    dateRange.value = null;
    selectedDates.value = [];
  }

  console.log('📅 [日期分析] 帖子日期统计分析完成:', {
    totalDays: stats.length,
    totalPosts: allPostView.value.length,
    dateRange: dateRange.value,
  });
};

// 🔥 [日期筛选] 日期选择相关函数
const toggleDate = (date: string) => {
  const index = selectedDates.value.indexOf(date);
  if (index > -1) {
    selectedDates.value.splice(index, 1);
  } else {
    selectedDates.value.push(date);
  }
};

const selectAllDates = () => {
  selectedDates.value = [...filteredDateStats.value.map((stat) => stat.date)];
};

const selectNoneDates = () => {
  selectedDates.value = [];
};

const selectRecentDates = (days: number) => {
  if (filteredDateStats.value.length === 0) return;

  // 从最新日期开始选择指定天数
  const sortedDates = [...filteredDateStats.value]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days)
    .map((stat) => stat.date);

  selectedDates.value = sortedDates;
};

// 监听身份选择变化，自动更新日期选择
watch(
  selectedIdentityIds,
  (newIds: string[]) => {
    if (newIds.length > 0) {
      // 当身份选择变化时，默认选择所有可用日期
      selectedDates.value = filteredDateStats.value.map((stat) => stat.date);
    } else {
      // 如果没有选择身份，清空日期选择
      selectedDates.value = [];
    }
  },
  { immediate: false },
);

// 🔥 [优化] 监听分析结果变化，自动选择第一个身份用于查看
watch(
  () => analysisResults.value?.filteredPostViewListGroupByIdentity,
  (newGroups) => {
    if (newGroups && newGroups.length > 0 && !selectedIdentityForView.value) {
      // 自动选择第一个身份
      const firstGroup = newGroups[0];
      if (firstGroup && firstGroup.name) {
        selectedIdentityForView.value = firstGroup.name;
        console.log(`🎯 [自动选择] 自动选择第一个身份用于查看: ${firstGroup.name}`);
      }
    }
  },
  { immediate: true },
);

// 根据作者ID查找作者名字
const getAuthorNameById = (authorId: string): string => {
  const identity = IDENTITY_LIST.find((item) => item.id === authorId);
  if (identity) {
    // 优先使用name，如果为空则使用code，都为空则返回ID
    return identity.name || identity.code || authorId;
  }
  return authorId; // 如果找不到对应的身份，返回原ID
};

const getFieldValue = (postView: Spec.PostView.Type, fieldPath: string): string => {
  try {
    // 获取最新的存档数据
    const latestArchive = postView.archive[postView.archive.length - 1];

    switch (fieldPath) {
      case 'post.id':
        return postView.post.id || '';
      case 'post.author':
        return postView.post.author || '';
      case 'post.authorName':
        return getAuthorNameById(postView.post.author || '');
      case 'post.createdAt':
        return postView.post.createdAt ? new Date(postView.post.createdAt).toISOString() : '';
      case 'post.root':
        return postView.post.root || '';
      case 'post.parent':
        return postView.post.parent || '';
      case 'archive.content':
        return latestArchive?.content || '';
      case 'archive.url':
        return latestArchive?.url || '';
      case 'archive.like':
        return (latestArchive?.like ?? 0).toString();
      case 'archive.comment':
        return (latestArchive?.comment ?? 0).toString();
      case 'archive.share':
        return (latestArchive?.share ?? 0).toString();
      case 'archive.view':
        return (latestArchive?.view ?? 0).toString();
      case 'archive.favorite':
        return (latestArchive?.favorite ?? 0).toString();
      case 'archive.createdAt':
        return latestArchive?.createdAt ? new Date(latestArchive.createdAt).toISOString() : '';
      case 'archive.capturedAt':
        return latestArchive?.capturedAt ? new Date(latestArchive.capturedAt).toISOString() : '';
      default:
        return '';
    }
  } catch (error) {
    console.error(`获取字段 ${fieldPath} 值时出错:`, error);
    return '';
  }
};

const escapeCsvField = (field: string): string => {
  // 如果字段包含逗号、引号或换行符，需要用引号包围并转义内部引号
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
};

const exportToCsv = () => {
  if (!analysisResults.value) return;

  const exportStart = performance.now();
  console.log('📊 [CSV导出] 开始导出CSV文件...');

  // 获取选中的字段
  const selectedFields = Object.entries(exportFields.value)
    .filter(([, config]) => config.selected)
    .map(([field, config]) => ({ field, label: config.label }));

  if (selectedFields.length === 0) {
    alert('请至少选择一个字段进行导出！');
    return;
  }

  // 构建CSV内容
  const headers = selectedFields.map((f) => f.label);
  const csvContent = [
    // CSV头部
    headers.map(escapeCsvField).join(','),
    // CSV数据行
    ...analysisResults.value.filteredAllPostView.map((postView) => {
      return selectedFields
        .map(({ field }) => {
          const value = getFieldValue(postView, field);
          return escapeCsvField(value);
        })
        .join(',');
    }),
  ].join('\n');

  // 添加BOM以支持中文字符
  const bom = '\uFEFF';
  const finalContent = bom + csvContent;

  // 创建下载链接
  const blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);

  // 生成文件名
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `筛选帖子数据_${selectedIdentityIds.value.length}个身份_${analysisResults.value.filteredAllPostView.length}条帖子_${timestamp}.csv`;
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // 执行下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  const exportEnd = performance.now();
  console.log(`📊 [CSV导出] CSV导出完成，耗时: ${(exportEnd - exportStart).toFixed(2)}ms`);
  console.log(
    `📊 [CSV导出] 导出了 ${analysisResults.value.filteredAllPostView.length} 条记录，${selectedFields.length} 个字段`,
  );

  // 关闭对话框
  showExportDialog.value = false;
};

const selectAllFields = () => {
  Object.keys(exportFields.value).forEach((field) => {
    exportFields.value[field as keyof typeof exportFields.value].selected = true;
  });
};

const selectNoneFields = () => {
  Object.keys(exportFields.value).forEach((field) => {
    exportFields.value[field as keyof typeof exportFields.value].selected = false;
  });
};

// 文件读取辅助函数
const readFileAsJSON = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = JSON.parse(event.target?.result as string);
        resolve(result);
      } catch (error) {
        reject(new Error('文件格式错误，请确保是有效的JSON文件'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

// 处理存档文件上传
const onArchiveFileChange = (file: File | null) => {
  archiveFile.value = file;
  uploadStatus.value = null;
};

// 处理分词缓存文件上传
const onCutwordFileChange = (file: File | null) => {
  cutwordFile.value = file;
  uploadStatus.value = null;
};

// 处理上传的数据
const processUploadedData = async () => {
  const startTime = performance.now();
  console.log('🚀 [性能分析] 开始处理上传数据');

  if (!archiveFile.value) {
    uploadStatus.value = {
      type: 'error',
      message: '请先上传存档数据文件',
    };
    return;
  }

  isProcessing.value = true;
  uploadStatus.value = null;

  try {
    // 读取存档数据文件
    const fileReadStart = performance.now();
    console.log('📁 [性能分析] 开始读取存档数据文件...');
    const archiveData = await readFileAsJSON(archiveFile.value);
    const fileReadEnd = performance.now();
    console.log(
      `📁 [性能分析] 存档数据文件读取完成，耗时: ${(fileReadEnd - fileReadStart).toFixed(2)}ms`,
    );
    console.log(
      `📊 [性能分析] 存档数据大小: ${JSON.stringify(archiveData).length} 字符，${archiveData.length} 条记录`,
    );

    // 读取分词缓存文件（如果有）
    let cutwordData:
      | {
          cutWordCache: Array<{ id: string; wordList: Array<string> }>;
          reverseIndex: Record<string, Array<string>>;
        }
      | Array<{ id: string; cut: Array<string> }> = { cutWordCache: [], reverseIndex: {} };
    if (cutwordFile.value) {
      try {
        const cutwordReadStart = performance.now();
        console.log('📁 [性能分析] 开始读取分词缓存文件...');
        const rawData = await readFileAsJSON(cutwordFile.value);

        // 检查数据格式：新格式 {cutWordCache: [...], reverseIndex: {...}} 或旧格式 [...]
        if (Array.isArray(rawData)) {
          // 旧格式：转换为新格式
          console.log('🔄 [数据格式] 检测到旧格式数据，正在转换为新格式...');
          cutwordData = {
            cutWordCache: rawData.map((item) => ({
              id: item.id,
              wordList: item.cut,
            })),
            reverseIndex: {},
          };
        } else if (rawData && rawData.cutWordCache) {
          // 新格式
          console.log('✅ [数据格式] 检测到新格式数据');
          cutwordData = rawData;
        } else {
          console.warn('⚠️ [数据格式] 未识别的数据格式，使用默认空值');
          cutwordData = { cutWordCache: [], reverseIndex: {} };
        }

        const cutwordReadEnd = performance.now();
        console.log(
          `📁 [性能分析] 分词缓存文件读取完成，耗时: ${(cutwordReadEnd - cutwordReadStart).toFixed(2)}ms`,
        );
        console.log(
          `📊 [性能分析] 分词缓存大小: ${Array.isArray(cutwordData) ? cutwordData.length : cutwordData.cutWordCache.length} 条记录`,
        );
      } catch (error) {
        console.warn('分词缓存文件读取失败，将使用空缓存:', error);
      }
    }

    // 处理数据
    const processStart = performance.now();
    console.log('⚙️ [性能分析] 开始处理数据...');
    // const dataToProcess = archiveData.slice(0, 10000);
    const dataToProcess = archiveData;
    console.log(`📊 [性能分析] 实际处理数据量: ${dataToProcess.length} 条记录`);

    await processData(dataToProcess, cutwordData);

    const processEnd = performance.now();
    console.log(`⚙️ [性能分析] 数据处理完成，耗时: ${(processEnd - processStart).toFixed(2)}ms`);

    const totalTime = performance.now() - startTime;
    console.log(
      `✅ [性能分析] 整个流程完成，总耗时: ${totalTime.toFixed(2)}ms (${(totalTime / 1000).toFixed(2)}秒)`,
    );

    uploadStatus.value = {
      type: 'success',
      message: `数据处理成功！加载了 ${allPostView.value.length} 个帖子和 ${idList.value.length} 个身份，耗时 ${(totalTime / 1000).toFixed(2)}秒`,
    };

    // 重置分析结果，让用户重新选择
    analysisResults.value = null;
  } catch (error) {
    console.error('Data processing error:', error);
    uploadStatus.value = {
      type: 'error',
      message: `数据处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  } finally {
    isProcessing.value = false;
  }
};

// 加载默认示例数据
const loadDefaultData = async () => {
  const startTime = performance.now();
  console.log('🚀 [性能分析] 开始加载默认数据');

  isProcessing.value = true;
  uploadStatus.value = null;

  try {
    const fetchStart = performance.now();
    console.log('🌐 [性能分析] 开始获取默认存档数据...');
    const test = await fetch('/data/default.json')
      .then((response) => response.json())
      .catch((error) => {
        console.error('Error fetching data:', error);
        throw new Error('无法加载默认存档数据');
      });
    const fetchEnd = performance.now();
    console.log(
      `🌐 [性能分析] 默认存档数据获取完成，耗时: ${(fetchEnd - fetchStart).toFixed(2)}ms`,
    );

    const cacheStart = performance.now();
    console.log('🌐 [性能分析] 开始获取默认分词缓存...');
    const testCache = (await fetch('/data/default-jieba.json')
      .then((response) => response.json())
      .catch((error) => {
        console.error('Error fetching cache:', error);
        return []; // 如果缓存加载失败，使用空数组
      })) as Array<{
      id: Spec.PostArchive.Type['id'];
      cut: Array<string>;
    }>;
    const cacheEnd = performance.now();
    console.log(
      `🌐 [性能分析] 默认分词缓存获取完成，耗时: ${(cacheEnd - cacheStart).toFixed(2)}ms`,
    );

    const processStart = performance.now();
    console.log('⚙️ [性能分析] 开始处理默认数据...');
    await processOldData(test, testCache);
    const processEnd = performance.now();
    console.log(
      `⚙️ [性能分析] 默认数据处理完成，耗时: ${(processEnd - processStart).toFixed(2)}ms`,
    );

    const queryStart = performance.now();
    console.log('📋 [性能分析] 开始查询帖子视图...');
    const b = await query.value.Target('fb').getPostViewList();
    const queryEnd = performance.now();
    console.log(`📋 [性能分析] 帖子视图查询完成，耗时: ${(queryEnd - queryStart).toFixed(2)}ms`);
    console.log('Default data loaded:', b);

    const totalTime = performance.now() - startTime;
    console.log(
      `✅ [性能分析] 默认数据加载完成，总耗时: ${totalTime.toFixed(2)}ms (${(totalTime / 1000).toFixed(2)}秒)`,
    );

    uploadStatus.value = {
      type: 'success',
      message: `默认数据加载成功！加载了 ${allPostView.value.length} 个帖子和 ${idList.value.length} 个身份，耗时 ${(totalTime / 1000).toFixed(2)}秒`,
    };

    // 重置分析结果，让用户重新选择
    analysisResults.value = null;
  } catch (error) {
    console.error('Default data loading error:', error);
    uploadStatus.value = {
      type: 'error',
      message: `默认数据加载失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  } finally {
    isProcessing.value = false;
  }
};

// 数据处理核心逻辑
const processData = async (
  archiveData: any,
  cutwordData:
    | {
        cutWordCache: Array<{ id: string; wordList: Array<string> }>;
        reverseIndex: Record<string, Array<string>>;
      }
    | Array<{ id: string; cut: Array<string> }>,
) => {
  console.log('🔧 [性能分析] 进入 processData 函数');

  // 统一处理数据格式
  let normalizedCutwordData: {
    cutWordCache: Array<{ id: string; wordList: Array<string> }>;
    reverseIndex: Record<string, Array<string>>;
  };

  if (Array.isArray(cutwordData)) {
    // 旧格式：转换为新格式
    normalizedCutwordData = {
      cutWordCache: cutwordData.map((item) => ({
        id: item.id,
        wordList: item.cut,
      })),
      reverseIndex: {},
    };
  } else {
    // 新格式：直接使用
    normalizedCutwordData = cutwordData;
  }

  // 设置分词缓存
  const cacheStart = performance.now();
  console.log('💾 [性能分析] 开始设置分词缓存...');
  cutwordCache.value = normalizedCutwordData;
  const cacheEnd = performance.now();
  console.log(`💾 [性能分析] 分词缓存设置完成，耗时: ${(cacheEnd - cacheStart).toFixed(2)}ms`);

  // 解析并设置查询
  const parseStart = performance.now();
  console.log('🔍 [性能分析] 开始解析数据...');
  const parsedData = parseRippleForQuery(archiveData);
  const parseEnd = performance.now();
  console.log(`🔍 [性能分析] 数据解析完成，耗时: ${(parseEnd - parseStart).toFixed(2)}ms`);

  const queryStart = performance.now();
  console.log('📋 [性能分析] 开始创建查询对象...');
  query.value = Query(parsedData);
  const queryEnd = performance.now();
  console.log(`📋 [性能分析] 查询对象创建完成，耗时: ${(queryEnd - queryStart).toFixed(2)}ms`);

  // 获取身份列表和帖子列表
  const identityStart = performance.now();
  console.log('👤 [性能分析] 开始获取身份列表...');
  idList.value = await query.value.Target('fb').getIdentityViewList();
  const identityEnd = performance.now();
  console.log(
    `👤 [性能分析] 身份列表获取完成，耗时: ${(identityEnd - identityStart).toFixed(2)}ms，获得 ${idList.value.length} 个身份`,
  );

  const postStart = performance.now();
  console.log('📝 [性能分析] 开始获取帖子列表...');
  allPostView.value = await query.value.Target('fb').getPostViewList();
  console.log('allPostView.value', allPostView.value);
  const postEnd = performance.now();
  console.log(
    `📝 [性能分析] 帖子列表获取完成，耗时: ${(postEnd - postStart).toFixed(2)}ms，获得 ${allPostView.value.length} 个帖子`,
  );

  // 按身份分组帖子
  const groupStart = performance.now();
  console.log('📊 [性能分析] 开始按身份分组帖子...');
  postViewListGroupByIdentity.value = await Promise.all(
    idList.value.map(async (id, index) => {
      const groupItemStart = performance.now();
      const result = {
        name: id.archive[0]?.name || 'Unknown',
        postViewList: await query.value.Target('fb').getPostViewListByIdentityId(id.identity.id),
      };
      const groupItemEnd = performance.now();
      console.log(
        `📊 [性能分析] 身份 ${index + 1}/${idList.value.length} (${result.name}) 分组完成，耗时: ${(groupItemEnd - groupItemStart).toFixed(2)}ms，获得 ${result.postViewList.length} 个帖子`,
      );
      return result;
    }),
  );
  const groupEnd = performance.now();
  console.log(`📊 [性能分析] 按身份分组完成，总耗时: ${(groupEnd - groupStart).toFixed(2)}ms`);

  console.log('✅ [性能分析] processData 函数执行完成');

  // 分析日期统计
  analyzeDateStats();
};

// 数据处理核心逻辑
const processOldData = async (
  archiveData: any,
  cutwordData: Array<{ id: string; cut: Array<string> }>,
) => {
  console.log('🔧 [性能分析] 进入 processOldData 函数');

  // 转换旧格式为新格式
  const normalizedCutwordData = {
    cutWordCache: cutwordData.map((item) => ({
      id: item.id,
      wordList: item.cut,
    })),
    reverseIndex: {},
  };

  // 设置分词缓存
  const cacheStart = performance.now();
  console.log('💾 [性能分析] 开始设置分词缓存...');
  cutwordCache.value = normalizedCutwordData;
  const cacheEnd = performance.now();
  console.log(`💾 [性能分析] 分词缓存设置完成，耗时: ${(cacheEnd - cacheStart).toFixed(2)}ms`);

  // 解析并设置查询
  const parseStart = performance.now();
  console.log('🔍 [性能分析] 开始解析旧格式数据...');
  const parsedData = parseForQuery(archiveData);
  const parseEnd = performance.now();
  console.log(`🔍 [性能分析] 旧格式数据解析完成，耗时: ${(parseEnd - parseStart).toFixed(2)}ms`);

  const queryStart = performance.now();
  console.log('📋 [性能分析] 开始创建查询对象...');
  query.value = Query(parsedData);
  const queryEnd = performance.now();
  console.log(`📋 [性能分析] 查询对象创建完成，耗时: ${(queryEnd - queryStart).toFixed(2)}ms`);

  // 获取身份列表和帖子列表
  const identityStart = performance.now();
  console.log('👤 [性能分析] 开始获取身份列表...');
  idList.value = await query.value.Target('fb').getIdentityViewList();
  const identityEnd = performance.now();
  console.log(
    `👤 [性能分析] 身份列表获取完成，耗时: ${(identityEnd - identityStart).toFixed(2)}ms，获得 ${idList.value.length} 个身份`,
  );

  const postStart = performance.now();
  console.log('📝 [性能分析] 开始获取帖子列表...');
  allPostView.value = await query.value.Target('fb').getPostViewList();
  const postEnd = performance.now();
  console.log(
    `📝 [性能分析] 帖子列表获取完成，耗时: ${(postEnd - postStart).toFixed(2)}ms，获得 ${allPostView.value.length} 个帖子`,
  );

  // 按身份分组帖子
  const groupStart = performance.now();
  console.log('📊 [性能分析] 开始按身份分组帖子...');
  postViewListGroupByIdentity.value = await Promise.all(
    idList.value.map(async (id, index) => {
      const groupItemStart = performance.now();
      const result = {
        name: id.archive[0]?.name || 'Unknown',
        postViewList: await query.value.Target('fb').getPostViewListByIdentityId(id.identity.id),
      };
      const groupItemEnd = performance.now();
      console.log(
        `📊 [性能分析] 身份 ${index + 1}/${idList.value.length} (${result.name}) 分组完成，耗时: ${(groupItemEnd - groupItemStart).toFixed(2)}ms，获得 ${result.postViewList.length} 个帖子`,
      );
      return result;
    }),
  );
  const groupEnd = performance.now();
  console.log(`📊 [性能分析] 按身份分组完成，总耗时: ${(groupEnd - groupStart).toFixed(2)}ms`);

  console.log('✅ [性能分析] processOldData 函数执行完成');

  // 分析日期统计
  analyzeDateStats();
};

// 🔥 [优化] 简化的 WebGL 上下文清理策略
// 移除主动清理，让浏览器自动管理上下文，避免干扰 ECharts-GL 的内部状态
const handleTabSwitch = (newTab: string, oldTab: string) => {
  if (oldTab && newTab !== oldTab) {
    console.log(`🔄 [标签切换] 从 ${oldTab} 切换到 ${newTab}`);
    // 简单的延迟，让当前标签页的渲染完全停止
    setTimeout(() => {
      console.log('🎯 [标签切换] 切换完成，依赖浏览器自动管理 WebGL 上下文');
    }, 100);
  }
};

// 监听标签页切换
watch(activeTab, handleTabSwitch);

// 组件卸载时的清理
onUnmounted(() => {
  console.log('🚪 [组件卸载] 组件卸载，依赖浏览器自动清理 WebGL 上下文');
});

onMounted(async () => {
  // 页面加载时自动加载默认数据
  // await loadDefaultData();
});
</script>
