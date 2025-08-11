<template>
  <q-page class="column items-center justify-evenly">
    <!-- 文件上传区域 -->
    <div class="file-upload-section q-pa-md full-width" style="max-width: 1080px">
      <q-card class="q-pa-md">
        <q-card-section>
          <div class="text-h6 q-mb-md">数据文件上传</div>

          <!-- 基础数据上传区域 -->
          <div class="row q-gutter-md q-mb-md">
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

          <div class="row q-gutter-md q-mb-md">
            <div class="col">
              <q-file
                v-model="categoryIndexFile"
                label="上传推文分类索引数据 (JSON)"
                accept=".json"
                outlined
                clearable
                @update:model-value="onCategoryIndexFileChange"
              >
                <template #prepend>
                  <q-icon name="category" />
                </template>
              </q-file>
              <div class="text-caption q-mt-xs text-grey">
                推文分类索引数据，格式：Record&lt;PostId, CategoryId&gt;
              </div>
            </div>

            <div class="col">
              <q-file
                v-model="agreementFile"
                label="上传推文认同度数据 (JSON)"
                accept=".json"
                outlined
                clearable
                @update:model-value="onAgreementFileChange"
              >
                <template #prepend>
                  <q-icon name="thumb_up" />
                </template>
              </q-file>
              <div class="text-caption q-mt-xs text-grey">
                推文认同度数据，格式：Record&lt;PostArchiveId, number&gt;
              </div>
            </div>
          </div>

          <!-- 处理数据按钮 -->
          <div class="row q-gutter-md q-mb-md">
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

          <div v-if="uploadStatus" class="q-mb-md">
            <q-banner
              :class="uploadStatus.type === 'error' ? 'bg-negative' : 'bg-positive'"
              text-color="white"
            >
              {{ uploadStatus.message }}
            </q-banner>
          </div>

          <q-separator class="q-my-md" />

          <!-- 推文分类数据区域 -->
          <div class="row items-center justify-between q-mb-md">
            <div class="text-subtitle1">推文分类数据管理</div>
            <q-btn
              :icon="showCategoryUploadSection ? 'expand_less' : 'expand_more'"
              :label="showCategoryUploadSection ? '收起分类上传' : '自定义分类数据'"
              flat
              color="secondary"
              @click="showCategoryUploadSection = !showCategoryUploadSection"
            />
          </div>

          <!-- 默认分类数据信息 -->
          <div class="q-mb-md">
            <q-banner class="bg-blue-1 text-blue-9">
              <template #avatar>
                <q-icon name="info" color="blue" />
              </template>
              <div class="text-subtitle2">默认分类数据已加载</div>
              <div class="text-caption">
                系统已预置 {{ categoryData.length }} 个分类定义（{{
                  categoryData.map((c) => c.name).join('、')
                }}）。 如需上传自定义分类数据，请点击上方"自定义分类数据"。
              </div>
            </q-banner>
          </div>

          <!-- 分类数据上传区域（可折叠） -->
          <q-slide-transition>
            <div v-show="showCategoryUploadSection">
              <q-card flat bordered class="bg-grey-1 q-pa-md">
                <div class="text-subtitle2 q-mb-md text-grey-8">自定义分类数据上传</div>

                <div class="row q-gutter-md">
                  <div class="col">
                    <q-file
                      v-model="categoryDataFile"
                      label="上传推文分类数据 (JSON)"
                      accept=".json"
                      outlined
                      clearable
                      @update:model-value="onCategoryDataFileChange"
                    >
                      <template #prepend>
                        <q-icon name="label" />
                      </template>
                    </q-file>
                    <div class="text-caption q-mt-xs text-grey">
                      推文分类数据，格式：Array&lt;Category&gt;
                    </div>
                  </div>

                  <div class="col">
                    <!-- 占位符，保持布局对称 -->
                  </div>
                </div>

                <div class="q-mt-md">
                  <q-banner class="bg-orange-1 text-orange-9">
                    <template #avatar>
                      <q-icon name="warning" color="orange" />
                    </template>
                    <div class="text-caption">
                      上传自定义分类数据将替换默认的 26 个预置分类。请确保上传的数据格式正确。
                    </div>
                  </q-banner>
                </div>
              </q-card>
            </div>
          </q-slide-transition>
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
              :label="`关联存档: ${dateStatsInfo.totalArchive} 个`"
            />
            <q-chip
              color="info"
              text-color="white"
              icon="article"
              :label="`帖子总计: ${dateStatsInfo.totalPost} 个`"
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
        <q-tab name="topicAnalysis" label="推文分析" icon="topic" />
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
              <q-chip
                v-if="selectedCategoryIds.length > 0"
                color="secondary"
                text-color="white"
                icon="category"
                :label="`已选择 ${selectedCategoryIds.length} 个分类`"
                class="q-ml-sm"
              />
            </h3>
          </div>

          <!-- 分类筛选器 -->
          <div class="q-mb-md">
            <q-select
              v-model="selectedCategoryIds"
              :options="categoryOptions"
              label="选择要分析的帖子分类（可多选）"
              emit-value
              map-options
              outlined
              multiple
              clearable
              use-chips
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="category" />
              </template>
              <template #hint> 默认分析所有分类的帖子，可选择特定分类进行针对性分析 </template>
            </q-select>
          </div>

          <!-- 只在当前标签页激活时渲染组件，避免WebGL上下文冲突 -->
          <AppPostListStatistics
            v-if="activeTab === 'overview'"
            :query="query"
            :postViewList="analysisResults.filteredAllPostView"
            :cutWordCache="cutwordCache"
            :id-list="idList"
            :postCategoryMap="postCategoryMap"
            :postAgreementData="postAgreementData"
            :categoryData="categoryData"
            :selectedDates="selectedDates"
            :key="'overview-' + selectedIdentityIds.join('-') + '-' + selectedCategoryIds.join('-')"
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

          <!-- 分类筛选器 -->
          <div class="q-mb-md">
            <q-select
              v-model="selectedCategoryIds"
              :options="categoryOptions"
              label="选择要分析的帖子分类（可多选）"
              emit-value
              map-options
              outlined
              multiple
              clearable
              use-chips
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="category" />
              </template>
              <template #hint> 默认分析所有分类的帖子，可选择特定分类进行针对性分析 </template>
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
              <q-chip
                v-if="selectedCategoryIds.length > 0"
                color="secondary"
                text-color="white"
                icon="category"
                :label="`已选择 ${selectedCategoryIds.length} 个分类`"
                class="q-ml-sm"
              />
            </div>
            <AppPostListStatistics
              v-if="activeTab === 'byIdentity'"
              :query="query"
              :postViewList="currentIdentityData.postViewList"
              :cutWordCache="cutwordCache"
              :id-list="idList"
              :postCategoryMap="postCategoryMap"
              :postAgreementData="postAgreementData"
              :categoryData="categoryData"
              :selectedDates="selectedDates"
              :key="'identity-' + currentIdentityData.name + '-' + selectedCategoryIds.join('-')"
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

        <!-- 推文分析标签页 -->
        <q-tab-panel name="topicAnalysis" class="q-pa-none">
          <div class="row items-center q-mb-md">
            <h3 class="q-ma-none">
              推文主题分析
              <q-chip
                v-if="selectedTopic"
                color="secondary"
                text-color="white"
                icon="topic"
                class="q-ml-sm"
              >
                <div>
                  <div class="text-weight-bold">{{ getTopicBasicInfo(selectedTopic).name }}</div>
                  <div class="text-caption">
                    {{ getTopicBasicInfo(selectedTopic).keywordCount }} 个关键词:
                    {{ getTopicBasicInfo(selectedTopic).keywords }}
                  </div>
                </div>
              </q-chip>
            </h3>
          </div>

          <!-- 主题管理区域 -->
          <div class="q-mb-md">
            <q-expansion-item
              v-model="showTopicManagement"
              icon="topic"
              label="主题管理"
              class="q-mb-md"
            >
              <q-card flat bordered class="q-pa-md">
                <!-- 创建新主题 -->
                <div class="q-mb-md">
                  <div class="text-h6 q-mb-md">创建新主题</div>
                  <div class="row q-gutter-md items-end">
                    <q-input
                      v-model="newTopicName"
                      label="主题名称"
                      outlined
                      dense
                      style="min-width: 200px"
                      :rules="[(val) => !!val || '请输入主题名称']"
                    />
                    <q-select
                      v-model="selectedWords"
                      :options="filteredWordOptions"
                      label="选择关键词"
                      outlined
                      dense
                      multiple
                      use-chips
                      use-input
                      input-debounce="300"
                      @filter="filterWords"
                      style="min-width: 400px"
                      :rules="[(val) => (val && val.length > 0) || '请至少选择一个关键词']"
                    >
                      <template #hint>
                        从分词结果中选择关键词组成主题（多个关键词为"{{
                          topicKeywordRelation === 'AND' ? '与' : '或'
                        }}"关系，即帖子{{
                          topicKeywordRelation === 'AND'
                            ? '必须同时包含所有关键词'
                            : '包含任意一个关键词即可'
                        }}）
                      </template>
                    </q-select>
                    <q-btn
                      color="primary"
                      icon="add"
                      label="创建主题"
                      @click="createTopic"
                      :disable="!newTopicName || selectedWords.length === 0"
                    />
                  </div>
                </div>

                <q-separator class="q-my-md" />

                <!-- 主题列表 -->
                <div class="text-h6 q-mb-md">已保存的主题</div>
                <div v-if="savedTopics.length === 0" class="text-grey text-center q-pa-md">
                  暂无保存的主题
                </div>
                <div v-else class="q-gutter-md">
                  <q-card
                    v-for="topic in savedTopics"
                    :key="topic.id"
                    flat
                    bordered
                    class="q-pa-md"
                    :class="{ 'bg-grey-2': !topic.isValid }"
                  >
                    <div class="row items-center justify-between">
                      <div class="col">
                        <div class="text-subtitle1 q-mb-xs">
                          {{ topic.name }}
                          <q-chip
                            v-if="!topic.isValid"
                            color="warning"
                            text-color="dark"
                            icon="warning"
                            size="sm"
                            label="无效"
                          />
                          <q-chip
                            v-else
                            color="positive"
                            text-color="white"
                            icon="check"
                            size="sm"
                            label="有效"
                          />
                        </div>
                        <div class="text-body2 text-grey q-mb-sm">
                          关键词: {{ topic.words.join(', ') }}
                        </div>
                        <div class="text-caption text-grey">
                          创建时间: {{ new Date(topic.createdAt).toLocaleString() }}
                        </div>
                      </div>
                      <div class="col-auto q-gutter-sm">
                        <q-btn flat color="negative" icon="delete" @click="deleteTopic(topic.id)" />
                      </div>
                    </div>
                  </q-card>
                </div>
              </q-card>
            </q-expansion-item>
          </div>

          <!-- 主题筛选器 -->
          <div class="q-mb-md">
            <q-select
              v-model="selectedTopic"
              :options="validTopicOptions"
              label="选择要分析的主题"
              emit-value
              map-options
              outlined
              clearable
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="topic" />
              </template>
              <template #hint> 只显示对当前数据集有效的主题 </template>

              <!-- 自定义选项显示 -->
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ getTopicBasicInfo(scope.opt.value).name }}</q-item-label>
                    <q-item-label caption>
                      <q-icon name="tag" size="xs" class="q-mr-xs" />
                      {{ getTopicBasicInfo(scope.opt.value).keywordCount }} 个关键词:
                      <span class="text-primary">{{
                        getTopicBasicInfo(scope.opt.value).keywords
                      }}</span>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <!-- 关键词关系选择器 -->
            <div v-if="selectedTopic" class="q-mb-md">
              <q-card flat bordered class="q-pa-md bg-blue-1">
                <div class="row items-center q-gutter-md">
                  <div class="text-subtitle2">关键词关系:</div>
                  <q-btn-toggle
                    v-model="topicKeywordRelation"
                    :options="[
                      { label: 'AND (与)', value: 'AND', icon: 'intersect' },
                      { label: 'OR (或)', value: 'OR', icon: 'union' },
                    ]"
                    color="primary"
                    toggle-color="primary"
                    text-color="primary"
                    outline
                    no-caps
                    dense
                  />
                  <div class="text-caption text-grey-7">
                    <span v-if="topicKeywordRelation === 'AND'"> 帖子必须包含所有关键词 </span>
                    <span v-else> 帖子包含任意一个关键词即可 </span>
                  </div>
                </div>
              </q-card>
            </div>
          </div>

          <!-- 统计分析组件 -->
          <AppPostListStatistics
            v-if="activeTab === 'topicAnalysis' && topicFilteredResults"
            :query="query"
            :postViewList="topicFilteredResults.filteredAllPostView"
            :cutWordCache="cutwordCache"
            :id-list="idList"
            :postCategoryMap="postCategoryMap"
            :postAgreementData="postAgreementData"
            :categoryData="categoryData"
            :selectedDates="selectedDates"
            :key="'topic-' + selectedTopic"
          />

          <div v-else-if="activeTab === 'topicAnalysis'" class="text-center q-pa-xl text-grey">
            <q-icon name="topic" size="4rem" class="q-mb-md" />
            <div v-if="!analysisResults" class="text-h6 q-mb-md">请先进行数据统计分析</div>
            <div v-else-if="!selectedTopic" class="text-h6 q-mb-md">请选择主题进行分析</div>
            <div v-else class="text-h6 q-mb-md">主题数据加载中...</div>
            <div class="text-body2">
              <span v-if="!analysisResults">
                请先在上方选择身份并点击"开始数据统计分析"，然后回到此标签页选择主题进行分析
              </span>
              <span v-else-if="!selectedTopic">
                在上方创建或选择主题，系统将根据主题关键词筛选相关推文进行统计分析
              </span>
              <span v-else> 正在根据主题关键词筛选推文数据... </span>
            </div>
          </div>
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
import type { EChartsOption } from 'echarts';
import AppPostListStatistics from './components/PostListStatistics.vue';
import AppKChart from './components/KChart.vue';
import IdentitySelector from 'src/components/IdentitySelector.vue';
import ReportGenerator from 'src/components/ReportGenerator.vue';
import { Query, QueryInterface } from 'src/query';
import { parseForQuery } from 'src/query/transform';
import { parseRippleForQuery } from 'src/query/transformRipple';
import { divideByDay } from 'src/query/utils';
import * as Spec from 'src/specification';
import { IDENTITY_LIST } from 'src/specification/IdentityData';
import { Categories } from 'src/specification/Category';
import { calculateInfluenceRanking } from 'src/utils/influenceCalculator';
import type { InfluenceRankingItem } from 'src/utils/influenceCalculator';

// 导入调试工具
import { debugWarn, debugError } from 'src/utils/debug';

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

// 推文分类数据 - 转换为 Map<CategoryId, Array<PostId>>
const postCategoryMap = ref<Map<string, Array<string>>>(new Map());

// 推文认同度数据
const postAgreementData = ref<Record<string, number>>({});

// 主题分析相关状态
type Topic = {
  id: string;
  name: string;
  words: string[];
  createdAt: number;
  isValid: boolean;
};

const savedTopics = ref<Topic[]>([]);
const selectedTopic = ref<string>(''); // 改为单选
const topicKeywordRelation = ref<'AND' | 'OR'>('AND'); // 关键词关系：AND(与) 或 OR(或)
const newTopicName = ref('');
const selectedWords = ref<string[]>([]);
const showTopicManagement = ref(false);

// 分词选项（用于主题创建）
const wordOptions = ref<string[]>([]);
const filteredWordOptions = ref<string[]>([]);

// 推文分类数据 - 类别定义（使用默认数据）
const categoryData = ref<Array<Spec.Category.Type>>(Categories);

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

// 分类筛选相关状态
const selectedCategoryIds = ref<string[]>([]);

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

// 主题分析相关计算属性
const validTopicOptions = computed(() => {
  return savedTopics.value
    .filter((topic) => topic.isValid)
    .map((topic) => {
      // 限制显示的关键字数量，避免选项过长
      const maxKeywords = 5;
      const keywords = topic.words.slice(0, maxKeywords).join(', ');
      const hasMore = topic.words.length > maxKeywords;
      const keywordDisplay = hasMore ? `${keywords}...` : keywords;

      return {
        label: `${topic.name} (${topic.words.length} 个关键词: ${keywordDisplay})`,
        value: topic.name, // 使用 topic.name 作为 value
      };
    });
});

// 获取主题基本信息的辅助函数
const getTopicBasicInfo = (topicName: string) => {
  const topic = savedTopics.value.find((t) => t.name === topicName);
  if (!topic) {
    return {
      name: topicName,
      keywordCount: 0,
      keywords: '未找到主题',
    };
  }

  const maxKeywords = 5;
  const keywords = topic.words.slice(0, maxKeywords).join(', ');
  const hasMore = topic.words.length > maxKeywords;
  const keywordDisplay = hasMore ? `${keywords}...` : keywords;

  return {
    name: topic.name,
    keywordCount: topic.words.length,
    keywords: keywordDisplay,
  };
};

// 根据主题筛选的结果
const topicFilteredResults = computed(() => {
  const startTime = performance.now();

  if (!analysisResults.value || !selectedTopic.value) {
    return null;
  }

  const topic = savedTopics.value.find((t) => t.name === selectedTopic.value);
  if (!topic) {
    return null;
  }

  const selectedTopicWords = new Set<string>(topic.words);
  if (selectedTopicWords.size === 0) {
    return null;
  }

  console.log(
    `🎯 [性能监控] topicFilteredResults - 开始计算，关键词数量: ${selectedTopicWords.size}`,
  );

  // 为每个关键词获取包含它的帖子ID集合
  const wordPostIdsMap = new Map<string, Set<string>>();
  selectedTopicWords.forEach((word) => {
    const postIds = cutwordCache.value.reverseIndex[word];
    if (postIds) {
      wordPostIdsMap.set(word, new Set(postIds));
    } else {
      wordPostIdsMap.set(word, new Set());
    }
  });

  let finalRelevantPostIds: Set<string>;

  if (topicKeywordRelation.value === 'AND') {
    // AND关系：只有包含所有关键词的帖子才会被选中（交集）
    let relevantPostIds: Set<string> | null = null;

    for (const [word, postIds] of wordPostIdsMap) {
      if (relevantPostIds === null) {
        // 第一个词的帖子ID作为初始集合
        relevantPostIds = new Set(postIds);
      } else {
        // 计算与当前帖子ID集合的交集
        const intersection = new Set<string>();
        for (const postId of relevantPostIds) {
          if (postIds.has(postId)) {
            intersection.add(postId);
          }
        }
        relevantPostIds = intersection;
      }

      // 如果交集为空，没必要继续处理剩余关键词
      if (relevantPostIds.size === 0) {
        break;
      }
    }

    finalRelevantPostIds = relevantPostIds || new Set<string>();
  } else {
    // OR关系：包含任意一个关键词的帖子都会被选中（并集）
    finalRelevantPostIds = new Set<string>();

    for (const [word, postIds] of wordPostIdsMap) {
      for (const postId of postIds) {
        finalRelevantPostIds.add(postId);
      }
    }
  }

  // 筛选帖子
  const filteredAllPostView = analysisResults.value.filteredAllPostView.filter((postView) =>
    finalRelevantPostIds.has(postView.post.id),
  );

  const endTime = performance.now();
  console.log(
    `🎯 [性能监控] topicFilteredResults - 计算完成，耗时: ${(endTime - startTime).toFixed(2)}ms，筛选结果: ${filteredAllPostView.length} 个帖子`,
  );

  return {
    filteredAllPostView,
  };
});

// 主题分析相关函数
const loadSavedTopics = () => {
  try {
    const saved = localStorage.getItem('dataReview_savedTopics');
    if (saved) {
      const topics: Topic[] = JSON.parse(saved);
      savedTopics.value = topics;
      updateTopicValidity();
    }
  } catch (error) {
    debugWarn('加载保存的主题失败:', error);
  }
};

const saveTopicsToStorage = () => {
  try {
    localStorage.setItem('dataReview_savedTopics', JSON.stringify(savedTopics.value));
  } catch (error) {
    debugWarn('保存主题到本地存储失败:', error);
  }
};

const updateTopicValidity = () => {
  // 从反向索引获取当前可用的所有词汇
  const availableWords = new Set<string>(Object.keys(cutwordCache.value.reverseIndex));

  // 更新每个主题的有效性
  savedTopics.value.forEach((topic) => {
    topic.isValid = topic.words.some((word) => availableWords.has(word));
  });
};

const updateWordOptions = () => {
  // 从反向索引中提取所有词汇及其出现次数
  const reverseIndex = cutwordCache.value.reverseIndex;
  const wordStats = Object.entries(reverseIndex)
    .filter(([word]) => word.length > 1) // 过滤单字词
    .map(([word, postIds]) => ({
      word,
      count: postIds.length, // 出现次数
      length: word.length, // 词汇长度
    }));

  // 排序：先按长度降序，再按出现次数降序
  const sortedWords = wordStats
    .sort((a, b) => {
      // 首先按长度排序（长词优先）
      if (a.length !== b.length) {
        return b.length - a.length;
      }
      // 长度相同时按出现次数排序（高频优先）
      return b.count - a.count;
    })
    .map(({ word }) => word);

  wordOptions.value = sortedWords;
  // 初始显示排名前30的词汇
  filteredWordOptions.value = wordOptions.value.slice(0, 30);

  if (wordOptions.value.length > 0) {
    // 词汇分析完成
  }
};

const filterWords = (val: string, update: (fn: () => void) => void) => {
  update(() => {
    if (!val) {
      // 没有输入时显示前30个高质量词汇
      filteredWordOptions.value = wordOptions.value.slice(0, 30);
      return;
    }

    const needle = val.toLowerCase();
    const reverseIndex = cutwordCache.value.reverseIndex;

    // 搜索匹配的词汇
    const matchedWords = wordOptions.value
      .filter((word) => word.toLowerCase().includes(needle))
      .map((word) => ({
        word,
        count: reverseIndex[word]?.length || 0,
        length: word.length,
        // 计算匹配相关性分数
        relevance: calculateRelevance(word, needle),
      }))
      .sort((a, b) => {
        // 按相关性排序，然后按长度和出现次数
        if (a.relevance !== b.relevance) {
          return b.relevance - a.relevance;
        }
        if (a.length !== b.length) {
          return b.length - a.length;
        }
        return b.count - a.count;
      })
      .slice(0, 50) // 限制显示前50个匹配结果
      .map(({ word }) => word);

    filteredWordOptions.value = matchedWords;
  });
};

// 计算词汇与搜索词的相关性分数
const calculateRelevance = (word: string, needle: string): number => {
  const wordLower = word.toLowerCase();
  const needleLower = needle.toLowerCase();

  // 完全匹配得分最高
  if (wordLower === needleLower) return 1000;

  // 开头匹配得分很高
  if (wordLower.startsWith(needleLower)) return 800;

  // 结尾匹配得分较高
  if (wordLower.endsWith(needleLower)) return 600;

  // 包含匹配的基础分数
  let score = 400;

  // 匹配字符占比越高分数越高
  const matchRatio = needleLower.length / wordLower.length;
  score += matchRatio * 200;

  // 词汇越短（相对于匹配内容）分数越高
  const lengthPenalty = Math.max(0, wordLower.length - needleLower.length) * 5;
  score -= lengthPenalty;

  return Math.max(0, score);
};

const createTopic = () => {
  if (!newTopicName.value || selectedWords.value.length === 0) {
    return;
  }

  const newTopic: Topic = {
    id: Date.now().toString(),
    name: newTopicName.value,
    words: [...selectedWords.value],
    createdAt: Date.now(),
    isValid: true, // 新创建的主题默认有效
  };

  savedTopics.value.push(newTopic);
  saveTopicsToStorage();

  // 清空表单
  newTopicName.value = '';
  selectedWords.value = [];
};

const deleteTopic = (topicId: string) => {
  const index = savedTopics.value.findIndex((topic) => topic.id === topicId);
  if (index !== -1) {
    const topic = savedTopics.value[index];
    if (topic) {
      const topicName = topic.name;
      savedTopics.value.splice(index, 1);
      saveTopicsToStorage();

      // 如果删除的主题正在被选中，清空选中状态
      if (selectedTopic.value === topicName) {
        selectedTopic.value = '';
      }
    }
  }
};

// 计算分类选项
const categoryOptions = computed(() => {
  return categoryData.value.map((category) => ({
    label: `${category.name} (${category.id})`,
    value: category.id,
  }));
});

// 计算按分类筛选后的帖子数据
const getCategoryFilteredPostView = (posts: Array<Spec.PostView.Type>) => {
  // 如果没有选择分类或没有分类索引数据，返回原始数据
  if (selectedCategoryIds.value.length === 0 || postCategoryMap.value.size === 0) {
    return posts;
  }

  // 获取所有选中分类对应的帖子ID
  const selectedPostIds = new Set<string>();
  selectedCategoryIds.value.forEach((categoryId) => {
    const postIds = postCategoryMap.value.get(categoryId);
    if (postIds) {
      postIds.forEach((postId) => selectedPostIds.add(postId));
    }
  });

  // 筛选帖子
  const filteredPosts = posts.filter((postView) => selectedPostIds.has(postView.post.id));

  return filteredPosts;
};

// 🔥 [优化] 计算筛选后的帖子数据 - 按身份、分类、日期筛选
const getFilteredPostView = () => {
  const startTime = performance.now();

  // 获取基础筛选数据（按身份筛选）
  let filteredAllPostView = allPostView.value.filter((postView) =>
    selectedIdentityIds.value.includes(postView.post.author),
  );

  // 按分类筛选
  filteredAllPostView = getCategoryFilteredPostView(filteredAllPostView);

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

  const endTime = performance.now();
  console.log(
    `📊 getFilteredPostView - 用时: ${(endTime - startTime).toFixed(2)}ms, 原始数据: ${allPostView.value.length}, 筛选后: ${filteredAllPostView.length}, 筛选率: ${((filteredAllPostView.length / allPostView.value.length) * 100).toFixed(1)}%`,
  );

  return filteredAllPostView;
};

// 🔥 [优化] 计算筛选后的分组数据 - 按帖子创建时间筛选
const getFilteredGroupByIdentity = () => {
  const startTime = performance.now();
  const filteredPostViewListGroupByIdentity = [];

  for (const selectedId of selectedIdentityIds.value) {
    // 找到对应的身份信息
    const identity = idList.value.find((id) => id.identity.id === selectedId);
    if (identity) {
      // 从已有的分组数据中查找，避免重复API调用
      // 获取身份的最新存档名称
      let identityName = 'Unknown';
      if (identity.archive && identity.archive.length > 0) {
        const sortedIdentityArchive = identity.archive.sort(
          (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
        );
        identityName = sortedIdentityArchive[0]?.name || 'Unknown';
      }

      const existingGroup = postViewListGroupByIdentity.value.find(
        (group) => group.name === identityName,
      );

      if (existingGroup) {
        // 使用缓存数据

        // 如果有日期筛选，按帖子创建时间对帖子进行筛选
        let postViewList = existingGroup.postViewList;

        // 按分类筛选
        postViewList = getCategoryFilteredPostView(postViewList);

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

  const endTime = performance.now();
  const totalPosts = filteredPostViewListGroupByIdentity.reduce(
    (sum, group) => sum + group.postViewList.length,
    0,
  );
  console.log(
    `👥 getFilteredGroupByIdentity - 用时: ${(endTime - startTime).toFixed(2)}ms, 身份数: ${selectedIdentityIds.value.length}, 筛选后帖子数: ${totalPosts}, 分组数: ${filteredPostViewListGroupByIdentity.length}`,
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
const categoryIndexFile = ref<File | null>(null);
const categoryDataFile = ref<File | null>(null);
const agreementFile = ref<File | null>(null);
const isProcessing = ref(false);
const uploadStatus = ref<{
  type: 'success' | 'error';
  message: string;
} | null>(null);

// 控制上传区域的展开/折叠状态
const showUploadSection = ref(false);

// 控制分类数据上传区域的展开/折叠状态
const showCategoryUploadSection = ref(false);

// 🔥 [身份筛选] 处理选择的身份进行数据分析
const processSelectedData = () => {
  const analysisStartTime = performance.now();
  console.log('🚀 开始数据统计分析...');

  if (selectedIdentityIds.value.length === 0) {
    console.log('❌ 分析取消 - 未选择身份');
    return;
  }

  isProcessingAnalysis.value = true;

  try {
    // 使用 computed 计算筛选后的数据，避免重复计算
    const filteredAllPostView = getFilteredPostView();
    const filteredPostViewListGroupByIdentity = getFilteredGroupByIdentity();

    // 保存分析结果
    analysisResults.value = {
      filteredAllPostView,
      filteredPostViewListGroupByIdentity,
    };

    const analysisEndTime = performance.now();
    const totalTime = analysisEndTime - analysisStartTime;

    console.log(`✅ 数据统计分析完成 - 总用时: ${totalTime.toFixed(2)}ms`);
    console.log(`📈 分析结果概览:`);
    console.log(`   - 总帖子数: ${filteredAllPostView.length}`);
    console.log(`   - 身份组数: ${filteredPostViewListGroupByIdentity.length}`);
    console.log(`   - 选择身份数: ${selectedIdentityIds.value.length}`);
    console.log(`   - 选择日期数: ${selectedDates.value.length}`);
  } catch (error) {
    const analysisEndTime = performance.now();
    const totalTime = analysisEndTime - analysisStartTime;
    console.log(`❌ 数据统计分析失败 - 用时: ${totalTime.toFixed(2)}ms`);
    debugError('身份数据分析失败:', error);
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
  const startTime = performance.now();

  if (allPostView.value.length === 0 || selectedIdentityIds.value.length === 0) {
    return [];
  }

  console.log(
    `📅 [性能监控] filteredDateStats - 开始计算，帖子数量: ${allPostView.value.length}，选中身份: ${selectedIdentityIds.value.length}`,
  );

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

  const endTime = performance.now();
  console.log(
    `📅 [性能监控] filteredDateStats - 计算完成，耗时: ${(endTime - startTime).toFixed(2)}ms，结果: ${stats.length} 天的统计`,
  );

  return stats;
});

// 优化的统计信息，避免在template中重复计算
const dateStatsInfo = computed(() => {
  const startTime = performance.now();
  const stats = filteredDateStats.value;

  if (stats.length === 0) {
    return { totalArchive: 0, totalPost: 0, totalDays: 0 };
  }

  const result = {
    totalArchive: stats.reduce((sum, stat) => sum + stat.archiveCount, 0),
    totalPost: stats.reduce((sum, stat) => sum + stat.postCount, 0),
    totalDays: stats.length,
  };

  const endTime = performance.now();
  console.log(
    `📊 [性能监控] dateStatsInfo - 统计计算完成，耗时: ${(endTime - startTime).toFixed(2)}ms`,
  );

  return result;
});

// 🔥 [日期分析] 分析所有帖子数据的日期统计（用于初始化）
const analyzeDateStats = () => {
  if (allPostView.value.length === 0) {
    dateStats.value = [];
    dateRange.value = null;
    selectedDates.value = [];
    return;
  }

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

// 监听身份选择变化，自动更新日期选择（但不自动计算分析结果）
watch(
  selectedIdentityIds,
  (newIds: string[]) => {
    if (newIds.length > 0) {
      // 当身份选择变化时，默认选择所有可用日期
      selectedDates.value = filteredDateStats.value.map((stat) => stat.date);
    } else {
      // 如果没有选择身份，清空日期选择和分析结果
      selectedDates.value = [];
      analysisResults.value = null;
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
      }
    }
  },
  { immediate: true },
);

// 🔥 [分类筛选] 监听分类选择变化，自动重新计算分析结果
watch(
  selectedCategoryIds,
  (newCategoryIds: string[]) => {
    // 如果有选中的身份，重新处理数据
    if (selectedIdentityIds.value.length > 0) {
      processSelectedData();
    }
  },
  { immediate: false },
);

// 🔥 [日期筛选] 监听日期选择变化（但不自动重新计算分析结果）
watch(
  selectedDates,
  (newDates: string[]) => {
    // 日期选择变化时，需要用户手动点击"开始数据统计分析"按钮
  },
  { immediate: false },
);

// 🔥 [主题分析] 监听分词缓存变化，更新词汇选项和主题有效性
watch(
  cutwordCache,
  () => {
    updateTopicValidity();
  },
  { immediate: false, deep: true },
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
    // 🔥 [修复] 获取最新的存档数据 - archive数组是按capturedAt降序排列的，所以最新的在索引0
    const latestArchive = postView.archive[0]; // 修复：使用索引0而不是length-1

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
    debugError(`获取字段 ${fieldPath} 值时出错:`, error);
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

// 处理推文分类索引文件上传
const onCategoryIndexFileChange = (file: File | null) => {
  categoryIndexFile.value = file;
  uploadStatus.value = null;
};

// 处理推文分类数据文件上传
const onCategoryDataFileChange = (file: File | null) => {
  categoryDataFile.value = file;
  uploadStatus.value = null;
};

// 处理推文认同度文件上传
const onAgreementFileChange = (file: File | null) => {
  agreementFile.value = file;
  uploadStatus.value = null;
};

// 处理上传的数据
const processUploadedData = async () => {
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
    const archiveData = await readFileAsJSON(archiveFile.value);

    // 读取分词缓存文件（如果有）
    let cutwordData: {
      cutWordCache: Array<{ id: string; wordList: Array<string> }>;
      reverseIndex: Record<string, Array<string>>;
    } = { cutWordCache: [], reverseIndex: {} };
    if (cutwordFile.value) {
      try {
        const rawData = await readFileAsJSON(cutwordFile.value);

        // 使用新格式数据
        if (rawData && rawData.cutWordCache && rawData.reverseIndex) {
          cutwordData = rawData;
        } else {
          debugWarn('⚠️ [数据格式] 数据格式不正确，使用默认空值');
          cutwordData = { cutWordCache: [], reverseIndex: {} };
        }
      } catch (error) {
        debugWarn('分词缓存文件读取失败，将使用空缓存:', error);
      }
    }

    // 读取推文分类索引文件（如果有）
    if (categoryIndexFile.value) {
      try {
        const categoryIndexData: Record<string, string> = await readFileAsJSON(
          categoryIndexFile.value,
        );

        // 转换为 Map<CategoryId, Array<PostId>>
        const categoryMap = new Map<string, Array<string>>();
        Object.entries(categoryIndexData).forEach(([postId, categoryId]) => {
          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, []);
          }
          categoryMap.get(categoryId)!.push(postId);
        });

        postCategoryMap.value = categoryMap;
      } catch (error) {
        debugWarn('推文分类索引文件读取失败:', error);
        postCategoryMap.value = new Map();
      }
    }

    // 读取推文分类数据文件（如果有）
    if (categoryDataFile.value) {
      try {
        const categoryDataFromFile = await readFileAsJSON(categoryDataFile.value);

        // 验证数据格式是否为 Array<Category>
        if (Array.isArray(categoryDataFromFile)) {
          categoryData.value = categoryDataFromFile;
        } else {
          debugWarn('推文分类数据格式不正确，期望 Array<Category>');
          categoryData.value = [];
        }
      } catch (error) {
        debugWarn('推文分类数据文件读取失败:', error);
        categoryData.value = [];
      }
    }

    // 读取推文认同度文件（如果有）
    if (agreementFile.value) {
      try {
        const agreementData: Record<string, number> = await readFileAsJSON(agreementFile.value);

        postAgreementData.value = agreementData;
      } catch (error) {
        debugWarn('推文认同度文件读取失败:', error);
        postAgreementData.value = {};
      }
    }

    // 处理数据
    // const dataToProcess = archiveData.slice(0, 10000);
    const dataToProcess = archiveData;

    await processData(dataToProcess, cutwordData);

    uploadStatus.value = {
      type: 'success',
      message: `数据处理成功！加载了 ${allPostView.value.length} 个帖子和 ${idList.value.length} 个身份${postCategoryMap.value.size > 0 ? `，${postCategoryMap.value.size} 个分类索引` : ''}${categoryData.value.length > 0 ? `，${categoryData.value.length} 个分类定义` : ''}${Object.keys(postAgreementData.value).length > 0 ? `，${Object.keys(postAgreementData.value).length} 个认同度记录` : ''}`,
    };

    // 重置分析结果，让用户重新选择
    analysisResults.value = null;
  } catch (error) {
    debugError('Data processing error:', error);
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
  isProcessing.value = true;
  uploadStatus.value = null;

  try {
    const test = await fetch('/data/default.json')
      .then((response) => response.json())
      .catch((error) => {
        debugError('Error fetching data:', error);
        throw new Error('无法加载默认存档数据');
      });

    const testCache = (await fetch('/data/default-jieba.json')
      .then((response) => response.json())
      .catch((error) => {
        debugError('Error fetching cache:', error);
        return []; // 如果缓存加载失败，使用空数组
      })) as Array<{
      id: Spec.PostArchive.Type['id'];
      cut: Array<string>;
    }>;

    await processOldData(test, testCache);

    // 为默认数据设置空的分类和认同度数据
    postCategoryMap.value = new Map();
    postAgreementData.value = {};

    const b = await query.value.Target('fb').getPostViewList();

    uploadStatus.value = {
      type: 'success',
      message: `默认数据加载成功！加载了 ${allPostView.value.length} 个帖子和 ${idList.value.length} 个身份`,
    };

    // 重置分析结果，让用户重新选择
    analysisResults.value = null;

    // 🔥 [主题分析] 更新词汇选项（如果有分词缓存）
    if (cutwordCache.value.cutWordCache.length > 0) {
      updateWordOptions();
    }
  } catch (error) {
    debugError('Default data loading error:', error);
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
  cutwordData: {
    cutWordCache: Array<{ id: string; wordList: Array<string> }>;
    reverseIndex: Record<string, Array<string>>;
  },
) => {
  // 设置分词缓存（使用新格式）
  cutwordCache.value = cutwordData;

  // 解析并设置查询
  const parsedData = parseRippleForQuery(archiveData);
  query.value = Query(parsedData);

  // 获取身份列表和帖子列表
  idList.value = await query.value.Target('fb').getIdentityViewList();

  allPostView.value = await query.value.Target('fb').getPostViewList();

  // 按身份分组帖子
  postViewListGroupByIdentity.value = await Promise.all(
    idList.value.map(async (id, index) => {
      // 获取身份的最新存档名称
      let identityName = 'Unknown';
      if (id.archive && id.archive.length > 0) {
        const sortedIdentityArchive = id.archive.sort(
          (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
        );
        identityName = sortedIdentityArchive[0]?.name || 'Unknown';
      }

      const result = {
        name: identityName,
        postViewList: await query.value.Target('fb').getPostViewListByIdentityId(id.identity.id),
      };
      return result;
    }),
  );

  // 分析日期统计
  analyzeDateStats();

  // 🔥 [主题分析] 更新词汇选项
  updateWordOptions();
};

// 数据处理核心逻辑
const processOldData = async (
  archiveData: any,
  cutwordData: Array<{ id: string; cut: Array<string> }>,
) => {
  // 转换旧格式为新格式
  const normalizedCutwordData = {
    cutWordCache: cutwordData.map((item) => ({
      id: item.id,
      wordList: item.cut,
    })),
    reverseIndex: {},
  };

  // 设置分词缓存
  cutwordCache.value = normalizedCutwordData;

  // 解析并设置查询
  const parsedData = parseForQuery(archiveData);
  query.value = Query(parsedData);

  // 获取身份列表和帖子列表
  idList.value = await query.value.Target('fb').getIdentityViewList();

  allPostView.value = await query.value.Target('fb').getPostViewList();

  // 按身份分组帖子
  postViewListGroupByIdentity.value = await Promise.all(
    idList.value.map(async (id, index) => {
      // 获取身份的最新存档名称
      let identityName = 'Unknown';
      if (id.archive && id.archive.length > 0) {
        const sortedIdentityArchive = id.archive.sort(
          (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
        );
        identityName = sortedIdentityArchive[0]?.name || 'Unknown';
      }

      const result = {
        name: identityName,
        postViewList: await query.value.Target('fb').getPostViewListByIdentityId(id.identity.id),
      };
      return result;
    }),
  );

  // 分析日期统计
  analyzeDateStats();
};

// 🔥 [优化] 简化的 WebGL 上下文清理策略
// 移除主动清理，让浏览器自动管理上下文，避免干扰 ECharts-GL 的内部状态
const handleTabSwitch = (newTab: string, oldTab: string) => {
  if (oldTab && newTab !== oldTab) {
    const switchStartTime = performance.now();
    console.log(`🔄 [性能监控] Tab切换开始：${oldTab} → ${newTab}`);

    // 简单的延迟，让当前标签页的渲染完全停止
    setTimeout(() => {
      const switchEndTime = performance.now();
      console.log(
        `🔄 [性能监控] Tab切换完成：${oldTab} → ${newTab}，总耗时: ${(switchEndTime - switchStartTime).toFixed(2)}ms`,
      );
    }, 100);
  }
};

// 监听标签页切换
watch(activeTab, handleTabSwitch);

// 组件卸载时的清理
onUnmounted(() => {});

onMounted(() => {
  // 页面加载时自动加载默认数据
  // await loadDefaultData();

  // 🔥 [主题分析] 加载保存的主题
  loadSavedTopics();

  // 🔥 [主题分析] 初始化词汇选项
  updateWordOptions();
});
</script>
