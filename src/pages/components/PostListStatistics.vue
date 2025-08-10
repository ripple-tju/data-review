<template>
  <div>
    <!-- 推文统计概览 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">推文统计概览</div>
      <div class="row q-gutter-md">
        <q-card flat bordered class="col-2">
          <q-card-section class="text-center">
            <div class="text-h4 text-primary q-mb-xs">{{ postStatsSummary.totalPosts }}</div>
            <div class="text-body2 text-grey-7">主推文数</div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="col-2">
          <q-card-section class="text-center">
            <div class="text-h4 text-red q-mb-xs">
              {{ postStatsSummary.totalLikes.toLocaleString() }}
            </div>
            <div class="text-body2 text-grey-7">总喜欢数</div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="col-2">
          <q-card-section class="text-center">
            <div class="text-h4 text-blue q-mb-xs">
              {{ postStatsSummary.totalShares.toLocaleString() }}
            </div>
            <div class="text-body2 text-grey-7">总转发数</div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="col-2">
          <q-card-section class="text-center">
            <div class="text-h4 text-orange q-mb-xs">
              {{ postStatsSummary.totalComments.toLocaleString() }}
            </div>
            <div class="text-body2 text-grey-7">总评论数</div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="col-3">
          <q-card-section class="text-center">
            <div class="text-body1 text-grey-8 q-mb-xs">平均互动数</div>
            <div class="row justify-around">
              <div class="text-center">
                <div class="text-body2 text-red">{{ postStatsSummary.avgLikes }}</div>
                <div class="text-caption text-grey-6">喜欢</div>
              </div>
              <div class="text-center">
                <div class="text-body2 text-blue">{{ postStatsSummary.avgShares }}</div>
                <div class="text-caption text-grey-6">转发</div>
              </div>
              <div class="text-center">
                <div class="text-body2 text-orange">{{ postStatsSummary.avgComments }}</div>
                <div class="text-caption text-grey-6">评论</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- 推文排行 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">推文排行</div>

      <q-table
        dense
        flat
        separator="cell"
        :pagination="{
          rowsPerPage: 10,
        }"
        :rows="latestPostArchiveList"
        :columns="columns"
        class="fixed-layout-table"
      >
        <!-- 推文内容列：添加tooltip和点击事件 -->
        <template #body-cell-content="props">
          <q-td
            :props="props"
            class="cursor-pointer text-left"
            @click="openPostDetailDialog(props.row)"
          >
            <q-tooltip class="bg-grey-8" :delay="500" max-width="400px" :offset="[10, 10]">
              {{ props.row.content || '无内容' }}
            </q-tooltip>
            <div class="text-truncate" style="max-width: 280px">
              {{
                (props.row.content || '无内容').substring(0, 50) +
                (props.row.content && props.row.content.length > 50 ? '...' : '')
              }}
            </div>
          </q-td>
        </template>
        <!-- 其他行也添加点击事件 -->
        <template #body="props">
          <q-tr :props="props" class="cursor-pointer" @click="openPostDetailDialog(props.row)">
            <q-td
              v-for="col in props.cols"
              :key="col.name"
              :props="props"
              :style="col.style"
              :class="col.name === 'content' ? 'text-left' : col.align || 'text-right'"
            >
              <!-- 特殊处理内容列 -->
              <div v-if="col.name === 'content'">
                <q-tooltip class="bg-grey-8" :delay="500" max-width="400px" :offset="[10, 10]">
                  {{ props.row.content || '无内容' }}
                </q-tooltip>
                <div class="text-truncate" style="max-width: 280px">
                  {{
                    (props.row.content || '无内容').substring(0, 50) +
                    (props.row.content && props.row.content.length > 50 ? '...' : '')
                  }}
                </div>
              </div>
              <!-- 时间列格式化 -->
              <div v-else-if="col.name === 'createdAt'">
                {{ dayjs(props.row.createdAt).format(Spec.DateFormatTemplate) }}
              </div>
              <div v-else-if="col.name === 'capturedAt'">
                {{ dayjs(props.row.capturedAt).format(Spec.DateFormatTemplate) }}
              </div>
              <!-- 其他列正常显示 -->
              <div v-else>
                {{ col.format ? col.format(props.row[col.name]) : props.row[col.name] }}
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-blue-1">
          <div class="text-subtitle2 q-mb-sm">推文排行批注</div>
          <q-input
            v-model="annotations.table.content"
            type="textarea"
            label="在此输入关于推文排行的分析和观察..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：观察到某些帖子的互动数据异常高，可能与热点事件相关..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 身份排行表 -->
    <div class="q-mb-lg" v-if="identityRankingList.length > 1">
      <div class="text-h6 q-mb-md">身份影响力排行</div>

      <!-- 显示选项控制 -->
      <div class="row items-center q-mb-md">
        <q-toggle
          v-model="showRawValues"
          color="primary"
          label="显示原始值"
          left-label
          class="q-mr-md"
        />
        <div class="text-caption text-grey">
          {{ showRawValues ? '当前显示得分（原始值）格式' : '当前仅显示计算得分' }}
        </div>
      </div>

      <!-- 影响力系数调节面板 -->
      <q-expansion-item
        icon="tune"
        label="影响力系数设置"
        header-class="text-primary"
        class="q-mb-md"
      >
        <q-card class="q-pa-sm bg-grey-1">
          <div class="text-subtitle2 q-mb-md text-center">
            调整各项指标的权重和对数缩放参数来定制影响力计算
          </div>

          <div class="row">
            <!-- 可见度 -->
            <div class="col-4">
              <q-card flat bordered class="q-pa-sm q-mr-xs">
                <div class="text-subtitle2 q-mb-sm text-blue text-center">
                  <q-icon name="visibility" class="q-mr-xs" />
                  可见度
                </div>

                <!-- 大项参数设置 -->
                <div class="q-mb-md">
                  <div class="text-caption q-mb-xs text-weight-bold text-blue">
                    可见度权重和对数缩放参数
                  </div>
                  <div class="row q-gutter-xs q-mb-sm">
                    <q-input
                      :model-value="
                        (influenceCoefficients.categoryWeights.visibility * 100).toFixed(1)
                      "
                      @update:model-value="
                        (val) =>
                          (influenceCoefficients.categoryWeights.visibility =
                            parseFloat(String(val || '0')) / 100)
                      "
                      label="可见度权重(%)"
                      type="number"
                      step="1"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-model.number="influenceCoefficients.categoryScaling.visibility.k"
                      label="敏感度k"
                      type="number"
                      step="10"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-model.number="influenceCoefficients.categoryScaling.visibility.xmax"
                      label="最大值"
                      type="number"
                      step="10"
                      outlined
                      dense
                      class="col"
                    />
                  </div>
                  <q-separator class="q-mb-sm" />
                </div>

                <!-- 小项参数设置 -->
                <div class="text-caption q-mb-xs text-weight-bold">内容发布总量</div>
                <div class="row q-gutter-xs q-mb-sm">
                  <q-input
                    :model-value="
                      (influenceCoefficients.visibility.contentVolume.weight * 100).toFixed(1)
                    "
                    @update:model-value="
                      (val) =>
                        (influenceCoefficients.visibility.contentVolume.weight =
                          parseFloat(String(val || '0')) / 100)
                    "
                    label="权重(%)"
                    type="number"
                    step="1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.visibility.contentVolume.k"
                    label="敏感度k"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.visibility.contentVolume.xmax"
                    label="最大值"
                    type="number"
                    step="10"
                    outlined
                    dense
                    class="col"
                  />
                </div>

                <div class="text-caption q-mb-xs text-weight-bold">内容发布稳定性</div>
                <div class="row q-gutter-xs q-mb-sm">
                  <q-input
                    :model-value="
                      (influenceCoefficients.visibility.contentStability.weight * 100).toFixed(1)
                    "
                    @update:model-value="
                      (val) =>
                        (influenceCoefficients.visibility.contentStability.weight =
                          parseFloat(String(val || '0')) / 100)
                    "
                    label="权重(%)"
                    type="number"
                    step="1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.visibility.contentStability.k"
                    label="敏感度k"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.visibility.contentStability.xmax"
                    label="最大值"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                </div>

                <div class="text-caption q-mb-xs text-weight-bold">内容发布主要领域覆盖率</div>
                <div class="row q-gutter-xs q-mb-sm">
                  <q-input
                    :model-value="
                      (influenceCoefficients.visibility.domainCoverage.weight * 100).toFixed(1)
                    "
                    @update:model-value="
                      (val) =>
                        (influenceCoefficients.visibility.domainCoverage.weight =
                          parseFloat(String(val || '0')) / 100)
                    "
                    label="权重(%)"
                    type="number"
                    step="1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.visibility.domainCoverage.k"
                    label="敏感度k"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.visibility.domainCoverage.xmax"
                    label="最大值"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                </div>

                <!-- 主要领域分类选择 -->
                <div class="text-caption q-mb-xs text-weight-bold">主要领域分类配置</div>
                <q-select
                  v-model="influenceCoefficients.domainCoverage.mainCategoryIds"
                  :options="categoryOptions"
                  multiple
                  emit-value
                  map-options
                  option-value="id"
                  option-label="name"
                  label="选择主要领域分类"
                  filled
                  dense
                  class="q-mb-sm"
                >
                  <template v-slot:selected-item="{ opt }">
                    <q-chip
                      removable
                      dense
                      color="blue"
                      text-color="white"
                      :label="opt.name"
                      @remove="removeMainCategory(opt.id)"
                    />
                  </template>
                </q-select>
                <div class="text-caption text-grey-6">
                  当前已选择:
                  {{ influenceCoefficients.domainCoverage.mainCategoryIds.length }} 个分类
                </div>
              </q-card>
            </div>

            <!-- 讨论度 -->
            <div class="col-4">
              <q-card flat bordered class="q-pa-sm q-mx-xs">
                <div class="text-subtitle2 q-mb-sm text-orange text-center">
                  <q-icon name="forum" class="q-mr-xs" />
                  讨论度
                </div>

                <!-- 大项参数设置 -->
                <div class="q-mb-md">
                  <div class="text-caption q-mb-xs text-weight-bold text-orange">
                    讨论度权重和对数缩放参数
                  </div>
                  <div class="row q-gutter-xs q-mb-sm">
                    <q-input
                      :model-value="
                        (influenceCoefficients.categoryWeights.engagement * 100).toFixed(1)
                      "
                      @update:model-value="
                        (val) =>
                          (influenceCoefficients.categoryWeights.engagement =
                            parseFloat(String(val || '0')) / 100)
                      "
                      label="讨论度权重(%)"
                      type="number"
                      step="1"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-model.number="influenceCoefficients.categoryScaling.engagement.k"
                      label="敏感度k"
                      type="number"
                      step="10"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-model.number="influenceCoefficients.categoryScaling.engagement.xmax"
                      label="最大值"
                      type="number"
                      step="10"
                      outlined
                      dense
                      class="col"
                    />
                  </div>
                  <q-separator class="q-mb-sm" />
                </div>

                <!-- 小项参数设置 -->
                <div class="text-caption q-mb-xs text-weight-bold">推文转发总量</div>
                <div class="row q-gutter-xs q-mb-sm">
                  <q-input
                    :model-value="
                      (influenceCoefficients.engagement.shareVolume.weight * 100).toFixed(1)
                    "
                    @update:model-value="
                      (val) =>
                        (influenceCoefficients.engagement.shareVolume.weight =
                          parseFloat(String(val || '0')) / 100)
                    "
                    label="权重(%)"
                    type="number"
                    step="1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.engagement.shareVolume.k"
                    label="敏感度k"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.engagement.shareVolume.xmax"
                    label="最大值"
                    type="number"
                    step="100"
                    outlined
                    dense
                    class="col"
                  />
                </div>

                <div class="text-caption q-mb-xs text-weight-bold">转发增长周期</div>
                <div class="row q-gutter-xs q-mb-sm">
                  <q-input
                    :model-value="
                      (influenceCoefficients.engagement.shareGrowthCycle.weight * 100).toFixed(1)
                    "
                    @update:model-value="
                      (val) =>
                        (influenceCoefficients.engagement.shareGrowthCycle.weight =
                          parseFloat(String(val || '0')) / 100)
                    "
                    label="权重(%)"
                    type="number"
                    step="1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.engagement.shareGrowthCycle.k"
                    label="敏感度k"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.engagement.shareGrowthCycle.xmax"
                    label="最大值"
                    type="number"
                    step="10"
                    outlined
                    dense
                    class="col"
                  />
                </div>

                <div class="text-caption q-mb-xs text-weight-bold">推文评论总量</div>
                <div class="row q-gutter-xs q-mb-sm">
                  <q-input
                    :model-value="
                      (influenceCoefficients.engagement.commentVolume.weight * 100).toFixed(1)
                    "
                    @update:model-value="
                      (val) =>
                        (influenceCoefficients.engagement.commentVolume.weight =
                          parseFloat(String(val || '0')) / 100)
                    "
                    label="权重(%)"
                    type="number"
                    step="1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.engagement.commentVolume.k"
                    label="敏感度k"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.engagement.commentVolume.xmax"
                    label="最大值"
                    type="number"
                    step="100"
                    outlined
                    dense
                    class="col"
                  />
                </div>

                <div class="text-caption q-mb-xs text-weight-bold">评论增长周期</div>
                <div class="row q-gutter-xs">
                  <q-input
                    :model-value="
                      (influenceCoefficients.engagement.commentGrowthCycle.weight * 100).toFixed(1)
                    "
                    @update:model-value="
                      (val) =>
                        (influenceCoefficients.engagement.commentGrowthCycle.weight =
                          parseFloat(String(val || '0')) / 100)
                    "
                    label="权重(%)"
                    type="number"
                    step="1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.engagement.commentGrowthCycle.k"
                    label="敏感度k"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.engagement.commentGrowthCycle.xmax"
                    label="最大值"
                    type="number"
                    step="10"
                    outlined
                    dense
                    class="col"
                  />
                </div>
              </q-card>
            </div>

            <!-- 认同度 -->
            <div class="col-4">
              <q-card flat bordered class="q-pa-sm q-ml-xs">
                <div class="text-subtitle2 q-mb-sm text-pink text-center">
                  <q-icon name="favorite" class="q-mr-xs" />
                  认同度
                </div>

                <!-- 大项参数设置 -->
                <div class="q-mb-md">
                  <div class="text-caption q-mb-xs text-weight-bold text-pink">
                    认同度权重和对数缩放参数
                  </div>
                  <div class="row q-gutter-xs q-mb-sm">
                    <q-input
                      :model-value="
                        (influenceCoefficients.categoryWeights.sentiment * 100).toFixed(1)
                      "
                      @update:model-value="
                        (val) =>
                          (influenceCoefficients.categoryWeights.sentiment =
                            parseFloat(String(val || '0')) / 100)
                      "
                      label="认同度权重(%)"
                      type="number"
                      step="1"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-model.number="influenceCoefficients.categoryScaling.sentiment.k"
                      label="敏感度k"
                      type="number"
                      step="10"
                      outlined
                      dense
                      class="col"
                    />
                    <q-input
                      v-model.number="influenceCoefficients.categoryScaling.sentiment.xmax"
                      label="最大值"
                      type="number"
                      step="10"
                      outlined
                      dense
                      class="col"
                    />
                  </div>
                  <q-separator class="q-mb-sm" />
                </div>

                <!-- 小项参数设置 -->
                <div class="text-caption q-mb-xs text-weight-bold">点赞总量</div>
                <div class="row q-gutter-xs q-mb-sm">
                  <q-input
                    :model-value="
                      (influenceCoefficients.sentiment.likeVolume.weight * 100).toFixed(1)
                    "
                    @update:model-value="
                      (val) =>
                        (influenceCoefficients.sentiment.likeVolume.weight =
                          parseFloat(String(val || '0')) / 100)
                    "
                    label="权重(%)"
                    type="number"
                    step="1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.sentiment.likeVolume.k"
                    label="敏感度k"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.sentiment.likeVolume.xmax"
                    label="最大值"
                    type="number"
                    step="1000"
                    outlined
                    dense
                    class="col"
                  />
                </div>

                <div class="text-caption q-mb-xs text-weight-bold">评论同向性</div>
                <div class="row q-gutter-xs q-mb-sm">
                  <q-input
                    :model-value="
                      (influenceCoefficients.sentiment.commentAlignment.weight * 100).toFixed(1)
                    "
                    @update:model-value="
                      (val) =>
                        (influenceCoefficients.sentiment.commentAlignment.weight =
                          parseFloat(String(val || '0')) / 100)
                    "
                    label="权重(%)"
                    type="number"
                    step="1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.sentiment.commentAlignment.k"
                    label="敏感度k"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.sentiment.commentAlignment.xmax"
                    label="最大值"
                    type="number"
                    step="10"
                    outlined
                    dense
                    class="col"
                  />
                </div>

                <div class="text-caption q-mb-xs text-weight-bold">评论同向变化</div>
                <div class="row q-gutter-xs">
                  <q-input
                    :model-value="
                      (influenceCoefficients.sentiment.alignmentTrend.weight * 100).toFixed(1)
                    "
                    @update:model-value="
                      (val) =>
                        (influenceCoefficients.sentiment.alignmentTrend.weight =
                          parseFloat(String(val || '0')) / 100)
                    "
                    label="权重(%)"
                    type="number"
                    step="1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.sentiment.alignmentTrend.k"
                    label="敏感度k"
                    type="number"
                    step="0.1"
                    outlined
                    dense
                    class="col"
                  />
                  <q-input
                    v-model.number="influenceCoefficients.sentiment.alignmentTrend.xmax"
                    label="最大值"
                    type="number"
                    step="10"
                    outlined
                    dense
                    class="col"
                  />
                </div>
              </q-card>
            </div>
          </div>
          <!-- 操作按钮 -->
          <div class="row justify-center q-mt-md q-gutter-sm">
            <q-btn flat color="secondary" label="重置为默认" @click="resetCoefficients" />
            <q-btn color="primary" label="应用设置" @click="applyCoefficients" />
          </div>
        </q-card>
      </q-expansion-item>

      <!-- 横向滚动容器 -->
      <div
        class="q-table__container q-table--horizontal-separator q-table--cell-separator"
        style="overflow-x: auto"
      >
        <q-table
          dense
          flat
          separator="cell"
          :pagination="{
            rowsPerPage: 15,
          }"
          :rows="identityRankingList"
          :columns="identityColumns"
          class="fixed-layout-table"
          table-style="min-width: 1800px;"
        >
          <!-- 自定义表头 -->
          <template #header="props">
            <q-tr :props="props">
              <q-th
                v-for="col in props.cols"
                :key="col.name"
                :props="props"
                :style="col.headerStyle"
                class="text-center"
              >
                <div v-if="col.name === 'visibilityScore'" class="text-center">
                  <div>👁️ 可见度</div>
                  <div class="text-caption">
                    权重: {{ (influenceCoefficients.categoryWeights.visibility * 100).toFixed(1) }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'contentVolume'" class="text-center">
                  <div>内容发布总量</div>
                  <div class="text-caption">
                    内部权重:
                    {{ (influenceCoefficients.visibility.contentVolume.weight * 100).toFixed(1) }}%
                  </div>
                  <div class="text-caption">
                    最终权重:
                    {{
                      (
                        influenceCoefficients.visibility.contentVolume.weight *
                        influenceCoefficients.categoryWeights.visibility *
                        100
                      ).toFixed(1)
                    }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'contentStability'" class="text-center">
                  <div>内容发布稳定性</div>
                  <div class="text-caption">
                    内部权重:
                    {{
                      (influenceCoefficients.visibility.contentStability.weight * 100).toFixed(1)
                    }}%
                  </div>
                  <div class="text-caption">
                    最终权重:
                    {{
                      (
                        influenceCoefficients.visibility.contentStability.weight *
                        influenceCoefficients.categoryWeights.visibility *
                        100
                      ).toFixed(1)
                    }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'domainCoverage'" class="text-center">
                  <div>内容发布主要领域覆盖率</div>
                  <div class="text-caption">
                    内部权重:
                    {{ (influenceCoefficients.visibility.domainCoverage.weight * 100).toFixed(1) }}%
                  </div>
                  <div class="text-caption">
                    最终权重:
                    {{
                      (
                        influenceCoefficients.visibility.domainCoverage.weight *
                        influenceCoefficients.categoryWeights.visibility *
                        100
                      ).toFixed(1)
                    }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'engagementScore'" class="text-center">
                  <div>💬 讨论度</div>
                  <div class="text-caption">
                    权重: {{ (influenceCoefficients.categoryWeights.engagement * 100).toFixed(1) }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'shareVolume'" class="text-center">
                  <div>推文转发总量</div>
                  <div class="text-caption">
                    内部权重:
                    {{ (influenceCoefficients.engagement.shareVolume.weight * 100).toFixed(1) }}%
                  </div>
                  <div class="text-caption">
                    最终权重:
                    {{
                      (
                        influenceCoefficients.engagement.shareVolume.weight *
                        influenceCoefficients.categoryWeights.engagement *
                        100
                      ).toFixed(1)
                    }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'shareGrowthCycle'" class="text-center">
                  <div>转发增长周期</div>
                  <div class="text-caption">
                    内部权重:
                    {{
                      (influenceCoefficients.engagement.shareGrowthCycle.weight * 100).toFixed(1)
                    }}%
                  </div>
                  <div class="text-caption">
                    最终权重:
                    {{
                      (
                        influenceCoefficients.engagement.shareGrowthCycle.weight *
                        influenceCoefficients.categoryWeights.engagement *
                        100
                      ).toFixed(1)
                    }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'commentVolume'" class="text-center">
                  <div>推文评论总量</div>
                  <div class="text-caption">
                    内部权重:
                    {{ (influenceCoefficients.engagement.commentVolume.weight * 100).toFixed(1) }}%
                  </div>
                  <div class="text-caption">
                    最终权重:
                    {{
                      (
                        influenceCoefficients.engagement.commentVolume.weight *
                        influenceCoefficients.categoryWeights.engagement *
                        100
                      ).toFixed(1)
                    }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'commentGrowthCycle'" class="text-center">
                  <div>评论增长周期</div>
                  <div class="text-caption">
                    内部权重:
                    {{
                      (influenceCoefficients.engagement.commentGrowthCycle.weight * 100).toFixed(1)
                    }}%
                  </div>
                  <div class="text-caption">
                    最终权重:
                    {{
                      (
                        influenceCoefficients.engagement.commentGrowthCycle.weight *
                        influenceCoefficients.categoryWeights.engagement *
                        100
                      ).toFixed(1)
                    }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'likeVolume'" class="text-center">
                  <div>点赞总量</div>
                  <div class="text-caption">
                    内部权重:
                    {{ (influenceCoefficients.sentiment.likeVolume.weight * 100).toFixed(1) }}%
                  </div>
                  <div class="text-caption">
                    最终权重:
                    {{
                      (
                        influenceCoefficients.sentiment.likeVolume.weight *
                        influenceCoefficients.categoryWeights.sentiment *
                        100
                      ).toFixed(1)
                    }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'sentimentScore'" class="text-center">
                  <div>❤️ 认同度</div>
                  <div class="text-caption">
                    权重: {{ (influenceCoefficients.categoryWeights.sentiment * 100).toFixed(1) }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'commentAlignment'" class="text-center">
                  <div>评论同向性</div>
                  <div class="text-caption">
                    内部权重:
                    {{
                      (influenceCoefficients.sentiment.commentAlignment.weight * 100).toFixed(1)
                    }}%
                  </div>
                  <div class="text-caption">
                    最终权重:
                    {{
                      (
                        influenceCoefficients.sentiment.commentAlignment.weight *
                        influenceCoefficients.categoryWeights.sentiment *
                        100
                      ).toFixed(1)
                    }}%
                  </div>
                </div>
                <div v-else-if="col.name === 'alignmentTrend'" class="text-center">
                  <div>评论同向变化</div>
                  <div class="text-caption">
                    内部权重:
                    {{ (influenceCoefficients.sentiment.alignmentTrend.weight * 100).toFixed(1) }}%
                  </div>
                  <div class="text-caption">
                    最终权重:
                    {{
                      (
                        influenceCoefficients.sentiment.alignmentTrend.weight *
                        influenceCoefficients.categoryWeights.sentiment *
                        100
                      ).toFixed(1)
                    }}%
                  </div>
                </div>
                <div v-else>
                  {{ col.label }}
                </div>
              </q-th>
            </q-tr>
          </template>

          <template #body-cell-rank="props">
            <q-td :props="props">
              <q-badge
                :color="props.row.rank <= 3 ? 'amber' : 'grey-6'"
                :text-color="props.row.rank <= 3 ? 'black' : 'white'"
                :label="props.row.rank"
              />
            </q-td>
          </template>
          <template #body-cell-authorName="props">
            <q-td :props="props">
              <div class="text-weight-medium">{{ props.row.authorName }}</div>
            </q-td>
          </template>
          <template #body-cell-influenceScore="props">
            <q-td :props="props">
              <div class="text-weight-bold text-primary">
                {{
                  typeof props.row.influenceScore === 'number'
                    ? props.row.influenceScore.toFixed(2)
                    : props.row.influenceScore
                }}
              </div>
            </q-td>
          </template>
          <template #body-cell-visibilityScore="props">
            <q-td :props="props">
              <div class="text-center text-weight-bold text-blue">
                {{
                  typeof props.row.visibilityScore === 'number'
                    ? props.row.visibilityScore.toFixed(2)
                    : '0.00'
                }}
              </div>
            </q-td>
          </template>
          <template #body-cell-engagementScore="props">
            <q-td :props="props">
              <div class="text-center text-weight-bold text-orange">
                {{
                  typeof props.row.engagementScore === 'number'
                    ? props.row.engagementScore.toFixed(2)
                    : '0.00'
                }}
              </div>
            </q-td>
          </template>
          <template #body-cell-sentimentScore="props">
            <q-td :props="props">
              <div class="text-center text-weight-bold text-green">
                {{
                  typeof props.row.sentimentScore === 'number'
                    ? props.row.sentimentScore.toFixed(2)
                    : '0.00'
                }}
              </div>
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- 影响力计算模型说明 -->
      <div class="q-mt-lg">
        <q-card class="q-pa-lg bg-grey-1">
          <div class="text-h6 q-mb-md">
            <q-icon name="calculate" class="q-mr-sm" />
            影响力计算模型说明
          </div>

          <div class="q-mb-lg">
            <div class="text-subtitle1 q-mb-sm text-weight-bold">计算公式</div>
            <div class="q-mb-md">
              <div class="text-body1 q-mb-sm">
                <strong>综合影响力 = 可见度 × 30% + 讨论度 × 30% + 认同度 × 40%</strong>
              </div>
              <div class="text-caption text-grey-7">
                每个大项经过内部加权计算后，再使用对数缩放函数归一化到0-100分值
              </div>
            </div>

            <div class="q-mb-lg">
              <div class="text-subtitle2 q-mb-sm text-blue text-weight-bold">可见度 (30%)</div>
              <div class="q-ml-md">
                <div class="q-mb-sm">
                  • <strong>内容发布总量 (40%)</strong>：账号在选定时间范围内发布的内容总量
                </div>
                <div class="q-mb-sm">
                  •
                  <strong>内容发布稳定性 (40%)</strong
                  >：发布量的标准差，值越小表示发布越稳定，得分越高
                </div>
                <div class="q-mb-sm">
                  • <strong>内容发布主要领域覆盖率 (20%)</strong>：在主要领域分类中的内容占比
                </div>
              </div>
            </div>

            <div class="q-mb-lg">
              <div class="text-subtitle2 q-mb-sm text-orange text-weight-bold">讨论度 (30%)</div>
              <div class="q-ml-md">
                <div class="q-mb-sm">
                  • <strong>推文转发总量 (33%)</strong>：账号发布内容的转发总量
                </div>
                <div class="q-mb-sm">
                  • <strong>转发增长周期 (17%)</strong>：转发量持续增长的平均周期，周期越长得分越高
                </div>
                <div class="q-mb-sm">
                  • <strong>推文评论总量 (33%)</strong>：账号发布内容的评论总量
                </div>
                <div class="q-mb-sm">
                  • <strong>评论增长周期 (17%)</strong>：评论量持续增长的平均周期，周期越长得分越高
                </div>
              </div>
            </div>

            <div class="q-mb-lg">
              <div class="text-subtitle2 q-mb-sm text-pink text-weight-bold">认同度 (40%)</div>
              <div class="q-ml-md">
                <div class="q-mb-sm">• <strong>点赞总量 (40%)</strong>：账号发布内容的点赞总量</div>
                <div class="q-mb-sm">
                  •
                  <strong>评论同向性 (40%)</strong
                  >：评论文本与推文文本的同向程度，基于上传的同向度数据计算
                </div>
                <div class="q-mb-sm">
                  •
                  <strong>评论同向变化 (20%)</strong
                  >：同向程度的变化趋势，变化越小（越稳定）得分越高
                </div>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-subtitle1 q-mb-sm text-weight-bold">对数缩放函数</div>
            <div class="q-mb-md">
              <div class="text-body1 q-mb-sm">所有指标均使用对数缩放函数进行归一化处理：</div>
              <div class="bg-white q-pa-md rounded-borders q-mb-sm">
                <div class="text-code">f(x) = log(1 + x/k) / log(1 + x_max/k) × 100</div>
              </div>
              <div class="text-caption text-grey-7">
                其中：x为原始值，k为敏感阈值参数，x_max为最大值参数。该函数可以压缩大数值的差异，突出小数值的变化。
              </div>
            </div>
          </div>

          <div>
            <div class="text-subtitle1 q-mb-sm text-weight-bold">计算步骤</div>
            <div class="q-ml-md">
              <div class="q-mb-sm">1. 收集各项原始数据（内容量、互动数等）</div>
              <div class="q-mb-sm">2. 对每个小项使用对数缩放函数归一化为0-100分值</div>
              <div class="q-mb-sm">3. 在大项内部按权重加权求和</div>
              <div class="q-mb-sm">4. 对大项得分再次使用对数缩放函数归一化</div>
              <div class="q-mb-sm">5. 按大项权重计算综合影响力得分</div>
            </div>
          </div>
        </q-card>
      </div>

      <!-- 对数缩放函数可视化 -->
      <div class="q-mt-lg">
        <q-card class="q-pa-lg bg-blue-1">
          <div class="text-h6 q-mb-md">
            <q-icon name="functions" class="q-mr-sm" />
            对数缩放函数可视化
          </div>

          <div class="q-mb-md">
            <div class="text-body1 q-mb-sm">调整参数查看对数缩放函数的行为特性：</div>
          </div>

          <div class="row q-gutter-md q-mb-md">
            <div class="col-4">
              <q-input
                v-model.number="logScalingDemo.k"
                label="敏感阈值 k"
                type="number"
                step="10"
                min="1"
                outlined
                dense
                hint="控制敏感区与饱和区的分界点"
                @update:model-value="updateLogScalingChart"
              />
            </div>
            <div class="col-4">
              <q-input
                v-model.number="logScalingDemo.xmax"
                label="最大值 x_max"
                type="number"
                step="100"
                min="10"
                outlined
                dense
                hint="用于归一化的最大值"
                @update:model-value="updateLogScalingChart"
              />
            </div>
            <div class="col-4">
              <q-input
                v-model.number="logScalingDemo.testValue"
                label="测试输入值 x"
                type="number"
                step="1"
                min="0"
                outlined
                dense
                hint="输入一个值查看对应的函数输出"
                @update:model-value="updateLogScalingChart"
              />
            </div>
          </div>

          <!-- 实时函数值显示区域 -->
          <div class="row q-gutter-md q-mb-md">
            <div class="col-12">
              <div class="bg-white q-pa-md rounded-borders">
                <div class="text-subtitle2 q-mb-sm">函数计算结果</div>
                <div class="row">
                  <div class="col-4">
                    <div class="bg-blue-1 q-pa-md rounded-borders text-center">
                      <div class="text-caption text-grey-7">敏感阈值</div>
                      <div class="text-h6 text-blue">{{ logScalingDemo.k }}</div>
                      <div class="text-caption">控制敏感区与饱和区分界</div>
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="bg-green-1 q-pa-md rounded-borders text-center">
                      <div class="text-caption text-grey-7">最大值上限</div>
                      <div class="text-h6 text-green">{{ logScalingDemo.xmax }}</div>
                      <div class="text-caption">数据归一化上限</div>
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="bg-purple-1 q-pa-md rounded-borders text-center">
                      <div class="text-caption text-grey-7">
                        x = {{ logScalingDemo.testValue }} 时的得分
                      </div>
                      <div class="text-h6 text-purple">
                        {{
                          toPercentageScore(
                            logarithmicScaling(logScalingDemo.testValue, {
                              k: logScalingDemo.k,
                              xmax: logScalingDemo.xmax,
                            }),
                          ).toFixed(1)
                        }}%
                      </div>
                      <div class="text-caption">函数输出结果</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 函数特性说明 -->
          <div class="row q-gutter-sm q-mb-md">
            <div class="col-12">
              <div class="text-caption text-grey-7">
                <div>
                  • <strong>敏感区 (x &lt; k)</strong>：函数在此区域变化较快，适合突出小数值的差异
                </div>
                <div>• <strong>过渡区 (x ≈ k)</strong>：函数变化速度逐渐减缓</div>
                <div>• <strong>饱和区 (x &gt; k)</strong>：函数变化较慢，压缩大数值间的差异</div>
              </div>
            </div>
          </div>

          <!-- 函数图表 -->
          <div class="q-mb-md">
            <AppKChart
              data-chart="log-scaling-demo"
              title="对数缩放函数曲线"
              :option="logScalingChartOption"
              :height="300"
              :useImageMode="useImageMode"
              @rendered="onChartRendered"
            />
          </div>

          <div class="text-caption text-grey-7 q-mb-md">
            <div class="row">
              <div class="col-6">
                <div><strong>函数曲线对比</strong></div>
                <div>— 对数缩放函数一化</div>
                <div>--- 线性归一化对比</div>
              </div>
              <div class="col-6">
                <div><strong>图表标记说明</strong></div>
                <div>• <span style="color: #ff5722">k值线</span>：敏感区与饱和区分界点</div>
                <div>• <span style="color: #4caf50">x_max线</span>：数据归一化上限</div>
                <div>• <span style="color: #9c27b0">x值点</span>：当前测试值及其函数输出</div>
              </div>
            </div>
          </div>

          <div class="bg-grey-2 q-pa-md rounded-borders">
            <div class="text-subtitle2 q-mb-sm">应用场景</div>
            <div class="text-caption text-grey-8">
              在影响力评估中，对数缩放函数能够：<br />
              1. 让点赞量从0到1000的变化比从5000到6000的变化更敏感<br />
              2. 避免极值对整体评分的过度影响<br />
              3. 更好地区分中小规模账户的表现差异
            </div>
          </div>
        </q-card>
      </div>

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-indigo-1">
          <div class="text-subtitle2 q-mb-sm">身份影响力排行批注</div>
          <q-input
            v-model="annotations.identityRanking.content"
            type="textarea"
            label="在此输入关于身份影响力排行的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：排名前三的身份在互动数据上明显领先，可能是核心意见领袖..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 分类同向度统计 -->
    <div class="q-mb-lg" v-if="categoryAgreementStats.length > 0">
      <div class="text-h6 q-mb-md">分类同向度统计</div>

      <!-- 横向滚动容器 -->
      <div
        class="q-table__container q-table--horizontal-separator q-table--cell-separator"
        style="overflow-x: auto"
      >
        <q-table
          dense
          flat
          separator="cell"
          :pagination="{
            rowsPerPage: 15,
          }"
          :rows="categoryAgreementStats"
          :columns="categoryAgreementColumns"
          class="fixed-layout-table"
          table-style="min-width: 800px;"
        >
          <!-- 自定义表头 -->
          <template #header="props">
            <q-tr :props="props">
              <q-th
                v-for="col in props.cols"
                :key="col.name"
                :props="props"
                :style="col.headerStyle"
                class="text-center"
              >
                {{ col.label }}
              </q-th>
            </q-tr>
          </template>

          <!-- 身份名称列 -->
          <template #body-cell-authorName="props">
            <q-td :props="props">
              <div class="text-weight-medium">{{ props.row.authorName }}</div>
            </q-td>
          </template>

          <!-- 动态分类列 -->
          <template
            v-for="category in availableCategories"
            :key="`body-cell-category-${category.id}`"
            #[`body-cell-category-${category.id}`]="props"
          >
            <q-td :props="props" class="text-center">
              <div
                class="text-weight-bold"
                :class="{
                  'text-positive': props.row[`category-${category.id}`] >= 0.7,
                  'text-warning':
                    props.row[`category-${category.id}`] >= 0.4 &&
                    props.row[`category-${category.id}`] < 0.7,
                  'text-negative':
                    props.row[`category-${category.id}`] < 0.4 &&
                    props.row[`category-${category.id}`] !== null,
                  'text-grey': props.row[`category-${category.id}`] === null,
                }"
              >
                {{
                  props.row[`category-${category.id}`] !== null
                    ? props.row[`category-${category.id}`].toFixed(3)
                    : 'N/A'
                }}
              </div>
            </q-td>
          </template>

          <!-- 平均同向度列 -->
          <template #body-cell-averageAgreement="props">
            <q-td :props="props" class="text-center">
              <div
                class="text-weight-bold text-primary"
                :class="{
                  'text-positive': props.row.averageAgreement >= 0.7,
                  'text-warning':
                    props.row.averageAgreement >= 0.4 && props.row.averageAgreement < 0.7,
                  'text-negative': props.row.averageAgreement < 0.4,
                }"
              >
                {{ props.row.averageAgreement.toFixed(3) }}
              </div>
            </q-td>
          </template>
        </q-table>
      </div>

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-cyan-1">
          <div class="text-subtitle2 q-mb-sm">分类同向度统计批注</div>
          <q-input
            v-model="annotations.categoryAgreement.content"
            type="textarea"
            label="在此输入关于分类同向度统计的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：某些账号在特定分类下的同向度较高，表明其观点立场相对一致..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 点赞趋势图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">点赞趋势</div>

      <AppKChart
        data-chart="like-trend"
        title="点赞趋势"
        :option="likeOption"
        :height="300"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-red-1">
          <div class="text-subtitle2 q-mb-sm">点赞趋势批注</div>
          <q-input
            v-model="annotations.like.content"
            type="textarea"
            label="在此输入关于点赞趋势的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：点赞数在X月X日达到峰值，可能与某个热点话题相关..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 分享趋势图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">分享趋势</div>

      <AppKChart
        data-chart="share-trend"
        title="分享趋势"
        :option="shareOption"
        :height="300"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-teal-1">
          <div class="text-subtitle2 q-mb-sm">分享趋势批注</div>
          <q-input
            v-model="annotations.share.content"
            type="textarea"
            label="在此输入关于分享趋势的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：分享数波动较大，说明内容传播性存在差异..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 评论趋势图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">评论趋势</div>

      <AppKChart
        data-chart="comment-trend"
        title="评论趋势"
        :option="commentOption"
        :height="300"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-orange-1">
          <div class="text-subtitle2 q-mb-sm">评论趋势批注</div>
          <q-input
            v-model="annotations.comment.content"
            type="textarea"
            label="在此输入关于评论趋势的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：评论数与点赞数呈正相关，说明用户参与度较高..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 综合互动趋势图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">综合互动趋势</div>

      <AppKChart
        data-chart="combined-trend"
        title="综合互动趋势"
        :option="combinedTrendOption"
        :height="900"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-purple-1">
          <div class="text-subtitle2 q-mb-sm">综合趋势批注</div>
          <q-input
            v-model="annotations.combinedTrend.content"
            type="textarea"
            label="在此输入关于综合趋势的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：从综合趋势可以看出，三种互动指标的变化趋势基本一致，说明用户行为具有关联性..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 发文量统计 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">发文量统计</div>

      <AppKChart
        data-chart="post-count"
        title="发文量统计"
        :option="postCountOption"
        :height="300"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-green-1">
          <div class="text-subtitle2 q-mb-sm">发文量统计批注</div>
          <q-input
            v-model="annotations.postCount.content"
            type="textarea"
            label="在此输入关于发文量统计的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：发文量在周末时段较高，平日较为平稳..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 交互分布散点图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">交互分布散点图</div>

      <AppKChart
        data-chart="scatter-plot"
        title="交互分布散点图"
        :option="scatterOption"
        :height="400"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-purple-1">
          <div class="text-subtitle2 q-mb-sm">交互分布散点图批注</div>
          <q-input
            v-model="annotations.scatter.content"
            type="textarea"
            label="在此输入关于交互分布散点图的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：散点图显示点赞数与评论数存在明显的聚类现象..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 交互分布热力图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">交互分布热力图</div>

      <AppKChart
        data-chart="heatmap"
        title="交互分布热力图"
        :option="heatmapOption"
        :height="400"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-yellow-1">
          <div class="text-subtitle2 q-mb-sm">交互分布热力图批注</div>
          <q-input
            v-model="annotations.heatmap.content"
            type="textarea"
            label="在此输入关于交互分布热力图的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：热力图显示互动数据主要集中在特定时间段..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 3D散点图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">3D散点图</div>

      <AppKChart
        data-chart="scatter3d"
        title="3D散点图"
        :option="scatter3DOption"
        :height="500"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-pink-1">
          <div class="text-subtitle2 q-mb-sm">3D交互分布图批注</div>
          <q-input
            v-model="annotations.scatter3d.content"
            type="textarea"
            label="在此输入关于3D散点图的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：3D散点图展现出点赞、评论、分享三者的关联性..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 词云图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">词云图</div>

      <AppKChart
        data-chart="wordcloud"
        title="词云图"
        :option="wordCloudOption"
        :height="400"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-cyan-1">
          <div class="text-subtitle2 q-mb-sm">词云图批注</div>
          <q-input
            v-model="annotations.wordCloud.content"
            type="textarea"
            label="在此输入关于词云图的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：词云图反映了帖子内容的主要关键词和热点话题..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 分类占比分析 -->
    <div class="q-mb-lg" v-if="postCategoryMap && categoryData && postCategoryMap.size > 0">
      <!-- 分类占比 - 推文数量 -->
      <div class="q-mb-lg">
        <div class="text-h6 q-mb-md">分类占比 - 推文数量</div>

        <AppKChart
          data-chart="category-post-distribution"
          title="分类推文数量分布"
          :option="categoryDistributionOption"
          :height="400"
          :useImageMode="useImageMode"
          @rendered="onChartRendered"
        />

        <div class="q-mt-md">
          <q-card class="q-pa-md bg-blue-1">
            <div class="text-subtitle2 q-mb-sm">分类推文数量分布批注</div>
            <q-input
              v-model="annotations.categoryPost.content"
              type="textarea"
              label="在此输入关于分类推文数量分布的分析..."
              outlined
              rows="3"
              autogrow
              placeholder="例如：某些分类的推文数量明显较多，可能与该领域的活跃度相关..."
              @update:model-value="saveAnnotationsToStorage"
            />
          </q-card>
        </div>
      </div>

      <!-- 分类占比 - 分享数量 -->
      <div class="q-mb-lg">
        <div class="text-h6 q-mb-md">分类占比 - 分享数量</div>

        <AppKChart
          data-chart="category-share-distribution"
          title="分类分享数量分布"
          :option="categoryShareDistributionOption"
          :height="400"
          :useImageMode="useImageMode"
          @rendered="onChartRendered"
        />

        <div class="q-mt-md">
          <q-card class="q-pa-md bg-teal-1">
            <div class="text-subtitle2 q-mb-sm">分类分享数量分布批注</div>
            <q-input
              v-model="annotations.categoryShare.content"
              type="textarea"
              label="在此输入关于分类分享数量分布的分析..."
              outlined
              rows="3"
              autogrow
              placeholder="例如：分享数分布反映了不同类型内容的传播能力..."
              @update:model-value="saveAnnotationsToStorage"
            />
          </q-card>
        </div>
      </div>

      <!-- 分类占比 - 评论数量 -->
      <div class="q-mb-lg">
        <div class="text-h6 q-mb-md">分类占比 - 评论数量</div>

        <AppKChart
          data-chart="category-comment-distribution"
          title="分类评论数量分布"
          :option="categoryCommentDistributionOption"
          :height="400"
          :useImageMode="useImageMode"
          @rendered="onChartRendered"
        />

        <div class="q-mt-md">
          <q-card class="q-pa-md bg-orange-1">
            <div class="text-subtitle2 q-mb-sm">分类评论数量分布批注</div>
            <q-input
              v-model="annotations.categoryComment.content"
              type="textarea"
              label="在此输入关于分类评论数量分布的分析..."
              outlined
              rows="3"
              autogrow
              placeholder="例如：评论数分布显示了不同类型内容的讨论热度..."
              @update:model-value="saveAnnotationsToStorage"
            />
          </q-card>
        </div>
      </div>

      <!-- 分类占比 - 点赞数量 -->
      <div class="q-mb-lg">
        <div class="text-h6 q-mb-md">分类占比 - 点赞数量</div>

        <AppKChart
          data-chart="category-like-distribution"
          title="分类点赞数量分布"
          :option="categoryLikeDistributionOption"
          :height="400"
          :useImageMode="useImageMode"
          @rendered="onChartRendered"
        />

        <div class="q-mt-md">
          <q-card class="q-pa-md bg-red-1">
            <div class="text-subtitle2 q-mb-sm">分类点赞数量分布批注</div>
            <q-input
              v-model="annotations.categoryLike.content"
              type="textarea"
              label="在此输入关于分类点赞数量分布的分析..."
              outlined
              rows="3"
              autogrow
              placeholder="例如：点赞数分布体现了不同类型内容的受欢迎程度..."
              @update:model-value="saveAnnotationsToStorage"
            />
          </q-card>
        </div>
      </div>

      <!-- 综合分类分析 -->
      <div class="q-mb-lg">
        <div class="text-h6 q-mb-md">综合分类分析</div>

        <AppKChart
          data-chart="combined-category-distribution"
          title="综合分类分析"
          :option="combinedCategoryDistributionOption"
          :height="1000"
          :useImageMode="useImageMode"
          @rendered="onChartRendered"
        />

        <div class="q-mt-md">
          <q-card class="q-pa-md bg-purple-1">
            <div class="text-subtitle2 q-mb-sm">综合分类分析批注</div>
            <q-input
              v-model="annotations.combinedCategory.content"
              type="textarea"
              label="在此输入关于综合分类分析的分析..."
              outlined
              rows="3"
              autogrow
              placeholder="例如：从综合分析可以看出各分类在不同指标上的表现差异..."
              @update:model-value="saveAnnotationsToStorage"
            />
          </q-card>
        </div>
      </div>
    </div>

    <!-- 批注汇总 -->
    <div class="q-mt-xl">
      <q-card class="q-pa-lg bg-grey-1">
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h6">
            <q-icon name="summarize" class="q-mr-sm" />
            批注汇总
          </div>
        </div>

        <div class="row q-gutter-md">
          <q-btn
            color="primary"
            label="导出PDF报告"
            icon="description"
            @click="exportAnnotations"
          />
          <q-btn
            color="secondary"
            label="清空所有批注"
            icon="clear_all"
            outline
            @click="clearAllAnnotations"
          />
        </div>

        <div class="q-mt-md">
          <div class="text-subtitle2 q-mb-sm">批注预览</div>
          <div class="row q-gutter-sm">
            <q-chip
              v-for="(item, key) in annotations"
              :key="key"
              :color="item.content.trim() ? 'positive' : 'grey-5'"
              :text-color="item.content.trim() ? 'white' : 'grey-8'"
              :icon="item.content.trim() ? 'check_circle' : 'radio_button_unchecked'"
              size="sm"
            >
              {{ getAnnotationLabel(key) }}
            </q-chip>
          </div>
        </div>
      </q-card>
    </div>

    <!-- 推文详情对话框 -->
    <q-dialog v-model="showPostDetailDialog" persistent>
      <q-card style="min-width: 600px; max-width: 800px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">
            <q-icon name="article" class="q-mr-sm" />
            推文详情
          </div>
        </q-card-section>

        <q-card-section v-if="selectedPostDetail" class="q-pa-md">
          <!-- 作者信息 -->
          <div class="row q-mb-md">
            <div class="col-6">
              <div class="text-subtitle2 text-grey-7">作者</div>
              <div class="text-body1">
                {{ selectedPostDetail.authorName || selectedPostDetail.authorId || '未知' }}
              </div>
            </div>
            <div class="col-6">
              <div class="text-subtitle2 text-grey-7">作者ID</div>
              <div class="text-body1">{{ selectedPostDetail.authorId || '未知' }}</div>
            </div>
          </div>

          <!-- 时间信息 -->
          <div class="row q-mb-md">
            <div class="col-6">
              <div class="text-subtitle2 text-grey-7">创建时间</div>
              <div class="text-body1">
                {{ dayjs(selectedPostDetail.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
              </div>
            </div>
            <div class="col-6">
              <div class="text-subtitle2 text-grey-7">抓取时间</div>
              <div class="text-body1">
                {{ dayjs(selectedPostDetail.capturedAt).format('YYYY-MM-DD HH:mm:ss') }}
              </div>
            </div>
          </div>

          <!-- 推文内容 -->
          <div class="q-mb-md">
            <div class="text-subtitle2 text-grey-7 q-mb-sm">推文内容</div>
            <q-card flat bordered class="q-pa-md bg-grey-1">
              <div class="text-body1" style="white-space: pre-wrap; word-break: break-word">
                {{ selectedPostDetail.content || '无内容' }}
              </div>
            </q-card>
          </div>

          <!-- 推文链接 -->
          <div class="q-mb-md" v-if="selectedPostDetail.url">
            <div class="text-subtitle2 text-grey-7 q-mb-sm">推文链接</div>
            <q-btn
              flat
              color="primary"
              :href="selectedPostDetail.url"
              target="_blank"
              icon="open_in_new"
              class="q-pa-none text-left"
              style="text-transform: none"
            >
              {{ selectedPostDetail.url }}
            </q-btn>
          </div>

          <!-- 互动数据 -->
          <div class="row q-mb-md">
            <div class="col-3">
              <div class="text-subtitle2 text-grey-7">点赞数</div>
              <div class="text-h6 text-pink">
                <q-icon name="favorite" class="q-mr-xs" />
                {{ selectedPostDetail.like || 0 }}
              </div>
              <div
                class="text-caption text-grey-6"
                v-if="selectedPostDetail.likeGrowthRate !== undefined"
              >
                增速: {{ selectedPostDetail.likeGrowthRate?.toFixed(2) || 0 }}%
              </div>
            </div>
            <div class="col-3">
              <div class="text-subtitle2 text-grey-7">分享数</div>
              <div class="text-h6 text-blue">
                <q-icon name="share" class="q-mr-xs" />
                {{ selectedPostDetail.share || 0 }}
              </div>
              <div
                class="text-caption text-grey-6"
                v-if="selectedPostDetail.shareGrowthRate !== undefined"
              >
                增速: {{ selectedPostDetail.shareGrowthRate?.toFixed(2) || 0 }}%
              </div>
            </div>
            <div class="col-3">
              <div class="text-subtitle2 text-grey-7">评论数</div>
              <div class="text-h6 text-orange">
                <q-icon name="comment" class="q-mr-xs" />
                {{ selectedPostDetail.comment || 0 }}
              </div>
              <div
                class="text-caption text-grey-6"
                v-if="selectedPostDetail.commentGrowthRate !== undefined"
              >
                增速: {{ selectedPostDetail.commentGrowthRate?.toFixed(2) || 0 }}%
              </div>
            </div>
            <div class="col-3">
              <div class="text-subtitle2 text-grey-7">认同度</div>
              <div class="text-h6 text-purple">
                <q-icon name="sentiment_satisfied" class="q-mr-xs" />
                {{ selectedPostDetail.endorsement !== null ? selectedPostDetail.endorsement : '-' }}
              </div>
            </div>
          </div>

          <!-- 其他信息 -->
          <div class="row" v-if="selectedPostDetail.view || selectedPostDetail.favorite">
            <div class="col-6" v-if="selectedPostDetail.view">
              <div class="text-subtitle2 text-grey-7">浏览数</div>
              <div class="text-body1">{{ selectedPostDetail.view || '-' }}</div>
            </div>
            <div class="col-6" v-if="selectedPostDetail.favorite">
              <div class="text-subtitle2 text-grey-7">收藏数</div>
              <div class="text-body1">{{ selectedPostDetail.favorite || '-' }}</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="关闭" color="grey" @click="showPostDetailDialog = false" />
          <q-btn
            v-if="selectedPostDetail?.url"
            color="primary"
            label="查看原文"
            icon="open_in_new"
            :href="selectedPostDetail.url"
            target="_blank"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AppPostListStatistics' });

import z from 'zod';
import dayjs from 'dayjs';
import AppKChart from './KChart.vue';
import { QueryInterface } from 'src/query';
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import {
  debugLog,
  debugWarn,
  debugError,
  debugTime,
  debugTimeEnd,
  debugPerformance,
} from 'src/utils/debug';
import * as Spec from 'src/specification';
import { divideByDay } from 'src/query/utils';
import type { EChartsOption } from 'echarts';
import { useQuasar } from 'quasar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  calculateInfluenceRanking,
  DEFAULT_INFLUENCE_COEFFICIENTS,
  logarithmicScaling,
  toPercentageScore,
} from 'src/utils/influenceCalculator';
import type { InfluenceRankingItem, InfluenceCoefficients } from 'src/utils/influenceCalculator';

const {
  query,
  postViewList,
  cutWordCache,
  idList,
  useImageMode,
  postCategoryMap,
  postAgreementData,
  categoryData,
  selectedDates,
} = defineProps<{
  query: QueryInterface;
  postViewList: Array<Spec.PostView.Type>;
  cutWordCache: {
    cutWordCache: Array<{
      id: Spec.PostArchive.Type['id'];
      wordList: Array<string>;
    }>;
    reverseIndex: Record<string, Array<string>>;
  };
  idList: Array<Spec.IdentityView.Type>;
  useImageMode?: boolean; // 新增：是否使用图片模式
  postCategoryMap?: Map<string, Array<string>>; // 新增：帖子分类数据，类别ID -> 帖子ID列表
  postAgreementData?: Record<string, number>; // 新增：帖子协议数据，帖子ID -> 协议值
  categoryData?: Array<Spec.Category.Type>; // 新增：分类定义数据
  selectedDates?: string[]; // 新增：用户选择的日期列表
}>();

// 定义事件发射器
const emit = defineEmits<{
  rendered: [];
}>();

// 使用 Quasar 的 dialog 和 notify 功能
const $q = useQuasar();

// 影响力系数相关
const influenceCoefficients = ref<InfluenceCoefficients>({ ...DEFAULT_INFLUENCE_COEFFICIENTS });

// 控制是否显示原始值的开关
const showRawValues = ref(false);

// 重置系数为默认值
const resetCoefficients = () => {
  influenceCoefficients.value = { ...DEFAULT_INFLUENCE_COEFFICIENTS };
  $q.notify({
    type: 'positive',
    message: '已重置为默认系数',
    position: 'top',
  });
};

// 应用系数设置
const applyCoefficients = () => {
  $q.notify({
    type: 'positive',
    message: '系数设置已应用',
    position: 'top',
  });
  // 触发重新计算排行榜
  // identityRankingList 是一个 computed，会自动重新计算
};

// 移除主要领域分类
const removeMainCategory = (categoryId: string) => {
  const index = influenceCoefficients.value.domainCoverage.mainCategoryIds.indexOf(categoryId);
  if (index > -1) {
    influenceCoefficients.value.domainCoverage.mainCategoryIds.splice(index, 1);
  }
};

// 批注数据结构
interface AnnotationItem {
  content: string;
}

const annotations = ref<{
  table: AnnotationItem;
  identityRanking: AnnotationItem;
  categoryAgreement: AnnotationItem;
  like: AnnotationItem;
  share: AnnotationItem;
  comment: AnnotationItem;
  postCount: AnnotationItem;
  scatter: AnnotationItem;
  heatmap: AnnotationItem;
  scatter3d: AnnotationItem;
  wordCloud: AnnotationItem;
  combinedTrend: AnnotationItem;
  categoryPost: AnnotationItem;
  categoryShare: AnnotationItem;
  categoryComment: AnnotationItem;
  categoryLike: AnnotationItem;
  combinedCategory: AnnotationItem;
}>({
  table: { content: '' },
  identityRanking: { content: '' },
  categoryAgreement: { content: '' },
  like: { content: '' },
  share: { content: '' },
  comment: { content: '' },
  postCount: { content: '' },
  scatter: { content: '' },
  heatmap: { content: '' },
  scatter3d: { content: '' },
  wordCloud: { content: '' },
  combinedTrend: { content: '' },
  categoryPost: { content: '' },
  categoryShare: { content: '' },
  categoryComment: { content: '' },
  categoryLike: { content: '' },
  combinedCategory: { content: '' },
});

// 对数缩放演示相关
const logScalingDemo = ref({
  k: 100,
  xmax: 1000,
  testValue: 200,
});

// 更新对数缩放图表
const updateLogScalingChart = () => {
  // 强制更新图表，通过修改响应式数据触发重新计算
  logScalingDemo.value = { ...logScalingDemo.value };
};

// 对数缩放演示图表配置
const logScalingChartOption = computed((): EChartsOption => {
  const xData: number[] = [];
  const yDataLog: number[] = [];
  const yDataLinear: number[] = [];

  // 生成数据点，从0到xmax的1.5倍
  const maxX = logScalingDemo.value.xmax * 1.5;
  const step = maxX / 100;

  for (let x = 0; x <= maxX; x += step) {
    xData.push(x);

    // 对数缩放值
    const scaledValue = logarithmicScaling(x, {
      k: logScalingDemo.value.k,
      xmax: logScalingDemo.value.xmax,
    });
    yDataLog.push(toPercentageScore(scaledValue));

    // 线性缩放值 (用于对比)
    const linearValue = Math.min(x / logScalingDemo.value.xmax, 1);
    yDataLinear.push(linearValue * 100);
  }

  return {
    backgroundColor: 'transparent',
    grid: {
      left: '10%',
      right: '5%',
      top: '15%',
      bottom: '15%',
    },
    legend: {
      data: ['对数缩放函数', '线性归一化对比'],
      top: '5%',
      left: 'center',
    },
    xAxis: {
      type: 'value',
      name: '原始数值',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      name: '缩放后得分',
      nameLocation: 'middle',
      nameGap: 40,
      min: 0,
      max: 100,
      axisLabel: {
        fontSize: 11,
        formatter: '{value}',
      },
    },
    series: [
      {
        name: '对数缩放函数',
        type: 'line',
        data: xData.map((x, index) => [x, yDataLog[index]]),
        smooth: true,
        lineStyle: {
          color: '#1976d2',
          width: 3,
        },
        symbol: 'none',
        markLine: {
          silent: true,
          data: [
            {
              xAxis: logScalingDemo.value.k,
              lineStyle: {
                color: '#ff5722',
                type: 'dashed',
                width: 2,
              },
              label: {
                position: 'insideEndTop',
                formatter: `k=${logScalingDemo.value.k}`,
                color: '#ff5722',
                fontSize: 10,
              },
            },
            {
              xAxis: logScalingDemo.value.xmax,
              lineStyle: {
                color: '#4caf50',
                type: 'dashed',
                width: 2,
              },
              label: {
                position: 'insideEndTop',
                formatter: `x_max=${logScalingDemo.value.xmax}`,
                color: '#4caf50',
                fontSize: 10,
              },
            },
            {
              xAxis: logScalingDemo.value.testValue,
              lineStyle: {
                color: '#9c27b0',
                type: 'dashed',
                width: 2,
              },
              label: {
                position: 'insideEndTop',
                formatter: `x=${logScalingDemo.value.testValue}`,
                color: '#9c27b0',
                fontSize: 10,
              },
            },
          ],
        },
        markPoint: {
          silent: true,
          data: [
            {
              name: '测试点',
              coord: [
                logScalingDemo.value.testValue,
                toPercentageScore(
                  logarithmicScaling(logScalingDemo.value.testValue, {
                    k: logScalingDemo.value.k,
                    xmax: logScalingDemo.value.xmax,
                  }),
                ),
              ],
              symbol: 'circle',
              symbolSize: 12,
              itemStyle: {
                color: '#9c27b0',
                borderColor: '#ffffff',
                borderWidth: 2,
              },
              label: {
                show: true,
                position: 'top',
                formatter: `(${logScalingDemo.value.testValue}, ${toPercentageScore(
                  logarithmicScaling(logScalingDemo.value.testValue, {
                    k: logScalingDemo.value.k,
                    xmax: logScalingDemo.value.xmax,
                  }),
                ).toFixed(1)})`,
                color: '#9c27b0',
                fontSize: 10,
                backgroundColor: '#ffffff',
                borderColor: '#9c27b0',
                borderWidth: 1,
                padding: [4, 6],
                borderRadius: 4,
              },
            },
          ] as any,
        },
      },
      {
        name: '线性归一化对比',
        type: 'line',
        data: xData.map((x, index) => [x, yDataLinear[index]]),
        smooth: false,
        lineStyle: {
          color: '#9e9e9e',
          width: 2,
          type: 'dashed',
        },
        symbol: 'none',
      },
    ],
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = `原始值: ${params[0].data[0].toFixed(1)}<br/>`;
        params.forEach((param: any) => {
          result += `${param.seriesName}: ${param.data[1].toFixed(2)}<br/>`;
        });
        return result;
      },
    },
  };
});

// 本地存储相关
const STORAGE_KEY = 'postListStatistics_annotations';

// 保存批注到本地存储
const saveAnnotationsToStorage = () => {
  try {
    const annotationsData = {
      ...annotations.value,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotationsData));
  } catch (error) {
    debugWarn('保存批注到本地存储失败:', error);
  }
};

// 从本地存储加载批注
const loadAnnotationsFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsedData = JSON.parse(stored);
      // 只加载内容，不包括展开状态
      Object.keys(annotations.value).forEach((key) => {
        if (parsedData[key] && parsedData[key].content) {
          (annotations.value as any)[key].content = parsedData[key].content;
        }
      });
    }
  } catch (error) {
    debugWarn('从本地存储加载批注失败:', error);
  }
};

// 监听批注内容变化，自动保存
watch(
  () => annotations.value,
  () => {
    saveAnnotationsToStorage();
  },
  { deep: true },
);

// 导出批注功能
const exportAnnotations = async () => {
  try {
    // 显示加载状态
    $q.loading.show({
      message: '正在生成PDF报告...',
      boxClass: 'bg-grey-2 text-grey-9',
      spinnerColor: 'primary',
      spinnerSize: 40,
    });

    const annotationData = {
      timestamp: new Date().toISOString(),
      exportDate: dayjs().format('YYYY年MM月DD日 HH:mm:ss'),
      dataTableAnnotation: annotations.value.table.content,
      identityRankingAnnotation: annotations.value.identityRanking.content,
      likesTrendAnnotation: annotations.value.like.content,
      sharesTrendAnnotation: annotations.value.share.content,
      commentsTrendAnnotation: annotations.value.comment.content,
      combinedTrendAnnotation: annotations.value.combinedTrend.content,
      postCountAnnotation: annotations.value.postCount.content,
      scatterPlotAnnotation: annotations.value.scatter.content,
      heatmapAnnotation: annotations.value.heatmap.content,
      scatter3DAnnotation: annotations.value.scatter3d.content,
      wordCloudAnnotation: annotations.value.wordCloud.content,
    };

    // 创建 jsPDF 实例
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 加载中文字体
    try {
      const fontResponse = await fetch('/font/SourceHanSansCN-VF.ttf');
      if (!fontResponse.ok) {
        throw new Error('字体文件加载失败');
      }
      const fontArrayBuffer = await fontResponse.arrayBuffer();
      const fontBase64 = arrayBufferToBase64(fontArrayBuffer);

      // 添加字体到 jsPDF - 添加所有需要的字重
      doc.addFileToVFS('SourceHanSansCN-VF.ttf', fontBase64);
      doc.addFont('SourceHanSansCN-VF.ttf', 'SourceHanSansCN', 'normal');
      doc.addFont('SourceHanSansCN-VF.ttf', 'SourceHanSansCN', 'bold');
      doc.addFont('SourceHanSansCN-VF.ttf', 'SourceHanSansCN', 'italic');
      doc.setFont('SourceHanSansCN');
    } catch (fontError) {
      debugWarn('中文字体加载失败，使用默认字体:', fontError);
      // 如果字体加载失败，使用默认字体
    }

    // 设置页面边距
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;

    // 添加标题
    doc.setFontSize(20);
    doc.text('国际传播分析报告', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // 添加导出时间
    doc.setFontSize(12);
    doc.text(`导出时间: ${annotationData.exportDate}`, pageWidth / 2, currentY, {
      align: 'center',
    });
    currentY += 20;

    // 改进的换页检查逻辑
    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - margin - 20) {
        doc.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    // 智能换页检查 - 只在真正需要时换页
    const smartPageBreak = (minHeight: number) => {
      const availableHeight = pageHeight - margin - 20 - currentY;
      if (availableHeight < minHeight) {
        doc.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    // 重新设计的 sections 配置
    const sections = [
      {
        title: '推文排行',
        type: 'table' as const,
        annotation: annotationData.dataTableAnnotation,
        getData: () => {
          return latestPostArchiveList.value
            .slice(0, 10)
            .map((post, index) => [
              (index + 1).toString(),
              post.content
                ? post.content.slice(0, 50) + (post.content.length > 50 ? '...' : '')
                : '',
              post.like?.toString() || '0',
              post.share?.toString() || '0',
              post.comment?.toString() || '0',
              dayjs(post.createdAt).format('YYYY-MM-DD'),
            ]);
        },
        getHeaders: () => ['序号', '内容', '点赞', '分享', '评论', '创建时间'],
        tableColor: [66, 139, 202] as [number, number, number],
      },
      {
        title: '身份影响力排行',
        type: 'table' as const,
        annotation: annotationData.identityRankingAnnotation,
        condition: () => identityRankingList.value.length > 1,
        getData: () => {
          return identityRankingList.value
            .slice(0, 10)
            .map((identity) => [
              identity.rank.toString(),
              identity.authorName,
              identity.postCount.toString(),
              identity.totalLikes.toString(),
              identity.totalShares.toString(),
              identity.totalComments.toString(),
              identity.influenceScore.toString(),
            ]);
        },
        getHeaders: () => ['排名', '身份', '发帖数', '总点赞', '总分享', '总评论', '影响力分数'],
        tableColor: [156, 39, 176] as [number, number, number],
        extraInfo: `影响力评分说明：采用多维度评估体系，包含可见度(30%)、讨论度(30%)、认同度(40%)三个维度的综合评分`,
      },
      {
        title: '点赞趋势',
        type: 'chart' as const,
        annotation: annotationData.likesTrendAnnotation,
        chartSelector: '[data-chart="like-trend"]',
      },
      {
        title: '分享趋势',
        type: 'chart' as const,
        annotation: annotationData.sharesTrendAnnotation,
        chartSelector: '[data-chart="share-trend"]',
      },
      {
        title: '评论趋势',
        type: 'chart' as const,
        annotation: annotationData.commentsTrendAnnotation,
        chartSelector: '[data-chart="comment-trend"]',
      },
      {
        title: '综合互动趋势',
        type: 'chart' as const,
        annotation: annotationData.combinedTrendAnnotation,
        chartSelector: '[data-chart="combined-trend"]',
      },
      {
        title: '发文量统计',
        type: 'chart' as const,
        annotation: annotationData.postCountAnnotation,
        chartSelector: '[data-chart="post-count"]',
      },
      {
        title: '交互分布散点图',
        type: 'chart' as const,
        annotation: annotationData.scatterPlotAnnotation,
        chartSelector: '[data-chart="scatter-plot"]',
      },
      {
        title: '交互分布热力图',
        type: 'chart' as const,
        annotation: annotationData.heatmapAnnotation,
        chartSelector: '[data-chart="heatmap"]',
      },
      {
        title: '3D交互分布图',
        type: 'chart' as const,
        annotation: annotationData.scatter3DAnnotation,
        chartSelector: '[data-chart="scatter3d"]',
      },
      {
        title: '词云图',
        type: 'chart' as const,
        annotation: annotationData.wordCloudAnnotation,
        chartSelector: '[data-chart="wordcloud"]',
      },
    ];

    // 渲染各个 section
    let sectionNumber = 1; // 添加独立的section编号计数器
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section) continue;

      // 检查条件（如果有）
      if ('condition' in section && !section.condition()) {
        continue;
      }

      // 预估整个section的高度（标题 + 内容）
      let estimatedSectionHeight = 20; // 标题高度（更紧凑）

      if (section.type === 'table' && 'getData' in section) {
        const tableData = section.getData();
        estimatedSectionHeight += Math.min(tableData.length * 8 + 20, 120); // 表格高度
      } else if (section.type === 'chart') {
        estimatedSectionHeight += 80; // 图表高度
      }

      if (section.annotation) {
        const annotationLines = doc.splitTextToSize(
          section.annotation || '暂无批注',
          contentWidth - 16,
        );
        estimatedSectionHeight += annotationLines.length * 4 + 12; // 批注高度
      }

      // 检查整个section是否需要换页（避免标题和内容分离）
      smartPageBreak(estimatedSectionHeight);

      // 添加section分隔线（除了第一个section）
      if (sectionNumber > 1) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY - 2, pageWidth - margin, currentY - 2);
        currentY += 4; // 更紧凑的间距
      }

      // 更紧凑的section背景色块
      doc.setFillColor(248, 249, 250);
      doc.rect(margin - 2, currentY - 1, contentWidth + 4, 12, 'F'); // 进一步缩小背景块

      // 添加节标题，使用独立的section编号
      doc.setFontSize(14); // 减小标题字体
      doc.setFont('SourceHanSansCN', 'bold');
      doc.setTextColor(33, 37, 41);
      doc.text(`${sectionNumber}. ${section.title}`, margin, currentY + 7);
      currentY += 15; // 更紧凑的间距

      // section编号递增
      sectionNumber++;

      // 重置文本颜色
      doc.setTextColor(0, 0, 0);

      // 根据类型渲染内容
      if (section.type === 'table') {
        // 渲染表格
        if ('getData' in section && 'getHeaders' in section) {
          const tableData = section.getData();
          const headers = section.getHeaders();

          if (tableData.length > 0) {
            // 表格渲染（换页已在section层面处理）
            autoTable(doc, {
              head: [headers],
              body: tableData,
              startY: currentY,
              styles: {
                font: 'SourceHanSansCN',
                fontSize: 8, // 更小的字体
                cellPadding: 1.5, // 更紧凑的单元格内边距
                lineColor: [200, 200, 200],
                lineWidth: 0.3,
              },
              headStyles: {
                fillColor: 'tableColor' in section ? section.tableColor : [66, 139, 202],
                textColor: [255, 255, 255],
                fontSize: 9, // 更小的标题字体
                fontStyle: 'bold',
                cellPadding: 2,
              },
              bodyStyles: {
                fontSize: 8,
                cellPadding: 1.5,
              },
              alternateRowStyles: {
                fillColor: [248, 249, 250],
              },
              margin: { left: margin, right: margin },
              pageBreak: 'avoid', // 避免表格被分页（因为已经在section层面处理）
              showHead: 'everyPage', // 每页都显示表头
            });

            currentY = (doc as any).lastAutoTable.finalY + 6; // 更紧凑的间距

            // 添加额外信息（如权重说明）
            if ('extraInfo' in section && section.extraInfo) {
              doc.setFontSize(9);
              doc.setFont('SourceHanSansCN', 'italic');
              doc.setTextColor(108, 117, 125);
              doc.text(section.extraInfo, margin, currentY);
              doc.setTextColor(0, 0, 0);
              currentY += 10; // 更紧凑的间距
            }
          }
        }
      } else if (section.type === 'chart') {
        // 渲染图表
        if ('chartSelector' in section && section.chartSelector) {
          try {
            const chartElement = document.querySelector(section.chartSelector);
            if (chartElement) {
              const canvas = chartElement.querySelector('canvas');
              if (canvas) {
                // 使用高质量设置生成图片
                const imgData = canvas.toDataURL('image/png', 1.0); // 最高质量

                // 计算最优尺寸：使用完整内容区宽度，保持原始比例
                const imgWidth = contentWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                // 如果图片高度超过页面剩余空间，进行智能分页
                const remainingHeight = pageHeight - currentY - margin - 20;
                if (imgHeight > remainingHeight) {
                  smartPageBreak(imgHeight + 20);
                }

                // 直接添加图片到PDF，不添加边框避免错位
                doc.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 12; // 适当增加间距
              }
            }
          } catch (error) {
            debugWarn(`无法获取图表图片: ${section.title}`, error);
            // 如果无法获取图片，显示简洁的占位符
            const placeholderHeight = 120; // 固定占位符高度

            // 添加占位符背景
            doc.setFillColor(248, 249, 250);
            doc.rect(margin, currentY, contentWidth, placeholderHeight, 'F');

            // 添加占位符文本
            doc.setFontSize(14);
            doc.setFont('SourceHanSansCN', 'normal');
            doc.setTextColor(108, 117, 125);
            const placeholderText = `[图表: ${section.title}]`;
            const textWidth = doc.getTextWidth(placeholderText);
            doc.text(
              placeholderText,
              margin + (contentWidth - textWidth) / 2,
              currentY + placeholderHeight / 2,
            );

            doc.setTextColor(0, 0, 0);
            currentY += placeholderHeight + 10;
          }
        }
      }

      // 添加批注
      if (section.annotation) {
        // 预估批注高度
        const annotationLines = doc.splitTextToSize(
          section.annotation || '暂无批注',
          contentWidth - 16,
        );
        const annotationHeight = annotationLines.length * 4 + 12; // 更紧凑的行高

        // 添加批注背景色块
        doc.setFillColor(252, 248, 227); // 淡黄色背景
        doc.rect(margin - 3, currentY - 2, contentWidth + 6, annotationHeight, 'F');

        // 添加批注左边框
        doc.setDrawColor(255, 193, 7);
        doc.setLineWidth(2);
        doc.line(margin - 3, currentY - 2, margin - 3, currentY - 2 + annotationHeight);

        doc.setFontSize(10); // 更小的字体
        doc.setFont('SourceHanSansCN', 'bold');
        doc.setTextColor(133, 100, 4);
        doc.text(`${section.title}批注：`, margin, currentY + 6);
        currentY += 10; // 更紧凑的间距

        doc.setFontSize(9); // 更小的字体
        doc.setFont('SourceHanSansCN', 'normal');
        doc.setTextColor(102, 77, 3);

        annotationLines.forEach((line: string) => {
          doc.text(line, margin, currentY);
          currentY += 4; // 更紧凑的行间距
        });

        // 重置文本颜色
        doc.setTextColor(0, 0, 0);
        currentY += 8; // 更紧凑的section间距
      } else {
        currentY += 6; // 更紧凑的没有批注时的间距
      }
    }

    // 添加页脚
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); // 更小的页脚字体
      doc.setTextColor(108, 117, 125); // 灰色文本
      doc.text(`第 ${i} 页 / 共 ${pageCount} 页`, pageWidth / 2, pageHeight - 8, {
        align: 'center',
      });
      doc.text(`生成时间: ${annotationData.timestamp}`, pageWidth - margin, pageHeight - 8, {
        align: 'right',
      });
    }

    // 保存 PDF
    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
    doc.save(`国际传播分析报告_${timestamp}.pdf`);

    // 关闭加载状态并显示成功消息
    $q.loading.hide();
    $q.notify({
      type: 'positive',
      message: 'PDF报告已成功导出',
      icon: 'download',
      position: 'top',
      timeout: 3000,
    });
  } catch (error) {
    debugError('PDF生成失败:', error);
    // 关闭加载状态并显示失败消息
    $q.loading.hide();
    $q.notify({
      type: 'negative',
      message: 'PDF生成失败: ' + (error as Error).message,
      icon: 'error',
      position: 'top',
      timeout: 5000,
    });
  }
};

// 工具函数：将 ArrayBuffer 转换为 Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return window.btoa(binary);
};

// 清空所有批注
const clearAllAnnotations = () => {
  $q.dialog({
    title: '确认清空',
    message: '您确定要清空所有批注吗？此操作不可撤销。',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    Object.keys(annotations.value).forEach((key) => {
      (annotations.value as any)[key].content = '';
    });

    // 清空本地存储
    localStorage.removeItem(STORAGE_KEY);

    $q.notify({
      type: 'positive',
      message: '所有批注已清空',
      icon: 'clear_all',
      position: 'top',
      timeout: 2000,
    });
  });
};

// 获取批注标签
const getAnnotationLabel = (key: string): string => {
  const labelMap: Record<string, string> = {
    table: '推文排行',
    identityRanking: '身份影响力排行',
    categoryAgreement: '分类同向度统计',
    like: '点赞趋势',
    share: '分享趋势',
    comment: '评论趋势',
    postCount: '发文量统计',
    scatter: '交互分布散点图',
    heatmap: '交互分布热力图',
    scatter3d: '3D交互分布图',
    wordCloud: '词云图',
    combinedTrend: '综合互动趋势',
    categoryPost: '分类推文数量分布',
    categoryShare: '分类分享数量分布',
    categoryComment: '分类评论数量分布',
    categoryLike: '分类点赞数量分布',
    combinedCategory: '综合分类分析',
  };
  return labelMap[key] || key;
};

// 图表渲染完成计数器
const renderedChartsCount = ref(0);
const totalChartsCount = 13; // 当前组件中的图表总数（包括分类相关图表）

// 图表渲染完成的回调
const onChartRendered = () => {
  renderedChartsCount.value++;
  debugLog(
    `📊 [PostListStatistics] 图表渲染完成: ${renderedChartsCount.value}/${totalChartsCount}`,
  );

  // 如果所有图表都已渲染完成，发射 rendered 事件
  if (renderedChartsCount.value >= totalChartsCount) {
    debugLog('📊 [PostListStatistics] 所有图表渲染完成，发射 rendered 事件');
    emit('rendered');
  }
};

// 在组件挂载时，如果不是图片模式，立即发射 rendered 事件
onMounted(() => {
  // 加载本地存储的批注数据
  loadAnnotationsFromStorage();

  if (!useImageMode) {
    void nextTick(() => {
      emit('rendered');
    });
  } else {
    // 如果是图片模式，重置计数器
    renderedChartsCount.value = 0;
  }
});

// 当 useImageMode 改变时，重置计数器
watch(
  () => useImageMode,
  (newMode: boolean | undefined) => {
    if (newMode) {
      renderedChartsCount.value = 0;
    } else {
      void nextTick(() => {
        emit('rendered');
      });
    }
  },
);

const LabelMap = {
  'specification.data.PostArchive.content': '推文内容',
  'specification.data.PostArchive.like': '点赞',
  'specification.data.PostArchive.likeGrowthRate': '点赞增速',
  'specification.data.PostArchive.share': '分享',
  'specification.data.PostArchive.shareGrowthRate': '分享增速',
  'specification.data.PostArchive.comment': '评论',
  'specification.data.PostArchive.commentGrowthRate': '评论增速',
  'specification.data.PostArchive.endorsement': '认同度',
  'specification.data.PostArchive.view': '浏览',
  'specification.data.PostArchive.favorite': '收藏',
  'specification.data.PostArchive.createdAt': '创建时间',
  'specification.data.PostArchive.capturedAt': '抓取时间',
};

const GetLabel = (key: string) => {
  return (LabelMap as any)[key] ?? key;
};

const ViewDataSchema = Spec.PostArchive.Schema.extend({
  likeGrowthRate: z.number().optional().describe('点赞增速'),
  shareGrowthRate: z.number().optional().describe('分享增速'),
  commentGrowthRate: z.number().optional().describe('评论增速'),
  endorsement: z.number().optional().describe('认同度'),
  author: Spec.IdentityArchive.Schema.optional(),
  authorId: Spec.Identity.Schema.shape.id.optional().describe('身份ID'),
  authorName: Spec.IdentityArchive.Schema.shape.name.optional().describe('身份名称'),
});

export type ViewDataType = z.infer<typeof ViewDataSchema>;
type Key = keyof typeof ViewDataSchema.shape;

// 推文详情对话框相关
const showPostDetailDialog = ref(false);
const selectedPostDetail = ref<ViewDataType | null>(null);

// 打开推文详情对话框
const openPostDetailDialog = (postData: ViewDataType) => {
  selectedPostDetail.value = postData;
  showPostDetailDialog.value = true;
};

const defaultOrder: Array<Key> = [
  'content',
  'like',
  'share',
  'comment',
  'likeGrowthRate',
  'shareGrowthRate',
  'commentGrowthRate',
  'endorsement',
  // 'view',
  // 'favorite',
  'createdAt',
  'capturedAt',
  // 'authorName',
];
const order = ref<Array<Key>>(defaultOrder);

const _columns = [
  {
    name: 'authorName',
    align: 'left' as const,
  },
  {
    name: 'content',
    headerStyle: 'width: 300px;',
    align: 'left' as const,
  },
  {
    name: 'like',
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'share',
    headerStyle: 'width: 60px;',
    sortable: true,
  },
  {
    name: 'comment',
    headerStyle: 'width: 60px;',
    sortable: true,
  },
  {
    name: 'likeGrowthRate',
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'shareGrowthRate',
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'commentGrowthRate',
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'endorsement',
    headerStyle: 'width: 60px;',
    format: (v: number | null) => (v !== null ? v : '-'),
  },
  {
    name: 'view',
    headerStyle: 'width: 60px;',
    format: () => '-',
  },
  {
    name: 'favorite',
    headerStyle: 'width: 40px;',
    format: () => '-',
  },
  {
    name: 'createdAt',
    headerStyle: 'width: 120px;',
  },
  {
    name: 'capturedAt',
    headerStyle: 'width: 120px;',
  },
];

const columns = Object.entries(ViewDataSchema.shape)
  .filter(([key]) => order.value.includes(key as Key))
  .sort(([a], [b]) => order.value.indexOf(a as Key) - order.value.indexOf(b as Key))
  .map(([key, value]) => {
    const column = _columns.find((item) => item.name === key);
    return {
      name: key,
      label: GetLabel(value.description!),
      field: key,
      align: 'right' as const,
      style: 'text-overflow: ellipsis;overflow: hidden;',
      ...column,
    };
  })
  .concat([
    {
      name: '',
      label: '',
    } as any,
  ]);

const calcPercentageGrowth = (latest: number, earliest: number, dayCount: number) => {
  if (dayCount === 0) return latest;
  if (earliest === 0) return 0;
  const growth = (latest - earliest) / dayCount;
  // if (growth < 0) {
  //   debugLog(
  //     `Negative growth detected: latest=${latest}, earliest=${earliest}, a=${JSON.stringify(
  //       {
  //         capturedAt: a.capturedAt,
  //         like: a.like,
  //         share: a.share,
  //         comment: a.comment,
  //       },
  //       null,
  //       2,
  //     )}, b=${JSON.stringify(
  //       {
  //         capturedAt: b.capturedAt,
  //         like: b.like,
  //         share: b.share,
  //         comment: b.comment,
  //       },
  //       null,
  //       2,
  //     )}`,
  //   );
  // }
  if (Number.isNaN(growth)) {
    debugLog(
      `Negative growth detected: latest=${latest}, earliest=${earliest}, dayCount=${dayCount}`,
    );
  }
  return growth.toFixed(3);
};

const latestPostArchiveList = computed(() => {
  const startTime = debugPerformance.now();
  debugLog('🔄 [PostStatistics] 开始计算 latestPostArchiveList...');

  const result = postViewList
    .map((post) => {
      // 按 capturedAt 时间降序排序，获取最新的存档
      const sortedArchive = post.archive.sort(
        (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      );
      const latestArchive = sortedArchive.at(0);
      const earliestArchive = sortedArchive.at(-1);

      if (!latestArchive) {
        debugWarn('⚠️ [PostStatistics] 发现没有存档数据的帖子:', post.post.id);
        return null;
      }

      // const likeGrowthRate = calcPercentageGrowth(
      //   latestArchive?.like ?? 0,
      //   earliestArchive?.like ?? 0,
      //   latestArchive?.capturedAt && earliestArchive?.capturedAt
      //     ? (latestArchive.capturedAt.getTime() - earliestArchive.capturedAt.getTime()) /
      //         (1000 * 60 * 60 * 24)
      //     : 1, // 默认1天，避免除以0
      // );
      // const shareGrowthRate = calcPercentageGrowth(
      //   latestArchive?.share ?? 0,
      //   earliestArchive?.share ?? 0,
      //   latestArchive?.capturedAt && earliestArchive?.capturedAt
      //     ? (latestArchive.capturedAt.getTime() - earliestArchive.capturedAt.getTime()) /
      //         (1000 * 60 * 60 * 24)
      //     : 1, // 默认1天，避免除以0
      // );
      // const commentGrowthRate = calcPercentageGrowth(
      //   latestArchive?.comment ?? 0,
      //   earliestArchive?.comment ?? 0,
      //   latestArchive?.capturedAt && earliestArchive?.capturedAt
      //     ? (latestArchive.capturedAt.getTime() - earliestArchive.capturedAt.getTime()) /
      //         (1000 * 60 * 60 * 24)
      //     : 1, // 默认1天，避免除以0
      // );

      const likeGrowthRate = latestArchive.like / 5;
      const shareGrowthRate = latestArchive.share / 5;
      const commentGrowthRate = latestArchive.comment / 5;

      // 从上传的认同度数据中获取真实认同度，如果没有则为null
      const endorsement = postAgreementData?.[latestArchive.post] ?? null;

      return {
        ...latestArchive,
        likeGrowthRate,
        shareGrowthRate,
        commentGrowthRate,
        endorsement,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const endTime = debugPerformance.now();
  debugLog(
    `🔄 [PostStatistics] latestPostArchiveList 计算完成，耗时: ${(endTime - startTime).toFixed(2)}ms，处理了 ${result.length} 条记录`,
  );
  return result;
});

// 推文统计汇总
const postStatsSummary = computed(() => {
  const posts = latestPostArchiveList.value;
  const totalPosts = posts.length;
  const totalLikes = posts.reduce((sum, post) => sum + (post.like || 0), 0);
  const totalShares = posts.reduce((sum, post) => sum + (post.share || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (post.comment || 0), 0);

  // 计算平均值，保留一位小数
  const avgLikes = totalPosts > 0 ? (totalLikes / totalPosts).toFixed(1) : '0.0';
  const avgShares = totalPosts > 0 ? (totalShares / totalPosts).toFixed(1) : '0.0';
  const avgComments = totalPosts > 0 ? (totalComments / totalPosts).toFixed(1) : '0.0';

  return {
    totalPosts,
    totalLikes,
    totalShares,
    totalComments,
    avgLikes,
    avgShares,
    avgComments,
  };
});

// 身份排行计算 - 使用新的影响力计算算法
const identityRankingList = computed(() => {
  const startTime = debugPerformance.now();
  debugLog('🔄 [PostStatistics] 开始计算 identityRankingList (新算法)...');

  // 按身份分组帖子
  const identityGroups = new Map<string, Array<Spec.PostView.Type>>();

  postViewList.forEach((postView) => {
    const authorId = postView.post.author;
    if (!identityGroups.has(authorId)) {
      identityGroups.set(authorId, []);
    }
    identityGroups.get(authorId)!.push(postView);
  });

  debugLog('identityGroups: ', identityGroups);

  // 转换为影响力计算所需的格式
  const identityGroupsArray = Array.from(identityGroups.entries()).map(
    ([authorId, postViewList]) => {
      // 从 idList 中查找身份的真实名称
      const identityView = idList.find((id) => id.identity.id === authorId);

      // 获取身份的最新存档名称
      let identityName = `身份-${authorId.slice(0, 8)}`;
      if (identityView?.archive && identityView.archive.length > 0) {
        // 按 capturedAt 时间降序排序，获取最新的存档
        const sortedIdentityArchive = identityView.archive.sort(
          (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
        );
        identityName = sortedIdentityArchive[0]?.name || identityName;
      }

      return {
        name: identityName,
        postViewList,
      };
    },
  );

  // 使用新的影响力计算算法，传入用户设置的系数和权重
  const influenceRanking = calculateInfluenceRanking(
    identityGroupsArray,
    postAgreementData || {},
    categoryData || [],
    selectedDates || [], // 使用用户选择的日期
    7, // 如果没有选择日期，则分析最近7天的数据
    influenceCoefficients.value, // 使用用户设置的系数
    postCategoryMap, // 传递帖子分类映射数据用于计算主要领域覆盖率
  );

  // 转换为组件所需的格式，保持向后兼容
  const result = influenceRanking.map((item) => ({
    rank: item.rank,
    authorId:
      identityGroupsArray.find((g) => g.name === item.name)?.postViewList[0]?.post.author || '',
    authorName: item.name,
    postCount: identityGroupsArray.find((g) => g.name === item.name)?.postViewList.length || 0,
    totalLikes: item.influence.sentiment.likeVolume,
    totalShares: item.influence.engagement.shareVolume,
    totalComments: item.influence.engagement.commentVolume,
    influenceScore: item.influence.overallScore,
    // 新增：详细的影响力指标
    visibilityScore: item.influence.visibility.visibilityScore,
    engagementScore: item.influence.engagement.engagementScore,
    sentimentScore: item.influence.sentiment.sentimentScore,
    // 可见度指标
    contentVolume: item.influence.visibility.contentVolume,
    contentVolumeScore: item.influence.visibility.contentVolumeScore,
    contentStability: item.influence.visibility.contentStability,
    contentStabilityScore: item.influence.visibility.contentStabilityScore,
    domainCoverage: item.influence.visibility.domainCoverage,
    domainCoverageScore: item.influence.visibility.domainCoverageScore,
    // 讨论度指标
    shareVolume: item.influence.engagement.shareVolume,
    shareVolumeScore: item.influence.engagement.shareVolumeScore,
    shareGrowthCycle: item.influence.engagement.shareGrowthCycle,
    shareGrowthCycleScore: item.influence.engagement.shareGrowthCycleScore,
    commentVolume: item.influence.engagement.commentVolume,
    commentVolumeScore: item.influence.engagement.commentVolumeScore,
    commentGrowthCycle: item.influence.engagement.commentGrowthCycle,
    commentGrowthCycleScore: item.influence.engagement.commentGrowthCycleScore,
    // 认同度指标
    likeVolume: item.influence.sentiment.likeVolume,
    likeVolumeScore: item.influence.sentiment.likeVolumeScore,
    commentAlignment: item.influence.sentiment.commentAlignment,
    commentAlignmentScore: item.influence.sentiment.commentAlignmentScore,
    alignmentTrend: item.influence.sentiment.alignmentTrend,
    alignmentTrendScore: item.influence.sentiment.alignmentTrendScore,
  }));

  const endTime = debugPerformance.now();
  debugLog(
    `🔄 [PostStatistics] identityRankingList (新算法) 计算完成，耗时: ${(endTime - startTime).toFixed(2)}ms，处理了 ${result.length} 个身份`,
  );

  // 输出前5名的详细信息
  result.slice(0, 5).forEach((item, index) => {
    debugLog(`🏆 第${index + 1}名: ${item.authorName}`, {
      综合影响力: item.influenceScore,
      可见度: item.visibilityScore,
      讨论度: item.engagementScore,
      认同度: item.sentimentScore,
      内容量: item.contentVolume,
      稳定性: item.contentStability,
      转发增长周期: item.shareGrowthCycle,
      评论增长周期: item.commentGrowthCycle,
    });
  });

  return result;
});

// 身份排行表格列定义 - 增强版
const identityColumns = computed(() => [
  {
    name: 'rank',
    label: '排名',
    field: 'rank',
    align: 'center' as const,
    headerStyle: 'width: 60px;',
    sortable: true,
  },
  {
    name: 'authorName',
    label: '身份',
    field: 'authorName',
    align: 'left' as const,
    headerStyle: 'width: 120px;',
  },
  {
    name: 'influenceScore',
    label: '🏆 综合影响力',
    field: 'influenceScore',
    align: 'center' as const,
    headerStyle: 'width: 120px; font-weight: bold; background-color: #f5f5f5;',
    sortable: true,
    format: (val: number) => val.toFixed(2),
  },
  // 可见度大项
  {
    name: 'visibilityScore',
    label: '👁️ 可见度',
    field: 'visibilityScore',
    align: 'center' as const,
    headerStyle: 'width: 100px; font-weight: bold; background-color: #e3f2fd;',
    sortable: true,
    format: (val: number) => val.toFixed(2),
  },
  {
    name: 'contentVolume',
    label: '内容发布总量',
    field: 'contentVolume',
    align: 'center' as const,
    headerStyle: 'width: 110px; background-color: #e3f2fd;',
    sortable: true,
    format: (val: number, row: any) =>
      showRawValues.value
        ? `${row.contentVolumeScore.toFixed(0)}(${val.toFixed(0)})`
        : row.contentVolumeScore.toFixed(0),
  },
  {
    name: 'contentStability',
    label: '内容发布稳定性',
    field: 'contentStability',
    align: 'center' as const,
    headerStyle: 'width: 110px; background-color: #e3f2fd;',
    sortable: true,
    format: (val: number, row: any) =>
      showRawValues.value
        ? `${row.contentStabilityScore.toFixed(1)}(${val.toFixed(2)})`
        : row.contentStabilityScore.toFixed(1),
  },
  {
    name: 'domainCoverage',
    label: '内容发布主要领域覆盖率',
    field: 'domainCoverage',
    align: 'center' as const,
    headerStyle: 'width: 130px; background-color: #e3f2fd;',
    sortable: true,
    format: (val: number, row: any) =>
      showRawValues.value
        ? `${row.domainCoverageScore.toFixed(1)}(${val.toFixed(2)})`
        : row.domainCoverageScore.toFixed(1),
  },
  // 讨论度大项
  {
    name: 'engagementScore',
    label: '💬 讨论度',
    field: 'engagementScore',
    align: 'center' as const,
    headerStyle: 'width: 100px; font-weight: bold; background-color: #fff3e0;',
    sortable: true,
    format: (val: number) => val.toFixed(2),
  },
  {
    name: 'shareVolume',
    label: '推文转发总量',
    field: 'shareVolume',
    align: 'center' as const,
    headerStyle: 'width: 120px; background-color: #fff3e0;',
    sortable: true,
    format: (val: number, row: any) =>
      showRawValues.value
        ? `${row.shareVolumeScore.toFixed(0)}(${val.toFixed(0)})`
        : row.shareVolumeScore.toFixed(0),
  },
  {
    name: 'shareGrowthCycle',
    label: '转发增长周期',
    field: 'shareGrowthCycle',
    align: 'center' as const,
    headerStyle: 'width: 120px; background-color: #fff3e0;',
    sortable: true,
    format: (val: number, row: any) =>
      showRawValues.value
        ? `${row.shareGrowthCycleScore.toFixed(1)}(${val.toFixed(1)})`
        : row.shareGrowthCycleScore.toFixed(1),
  },
  {
    name: 'commentVolume',
    label: '推文评论总量',
    field: 'commentVolume',
    align: 'center' as const,
    headerStyle: 'width: 120px; background-color: #fff3e0;',
    sortable: true,
    format: (val: number, row: any) =>
      showRawValues.value
        ? `${row.commentVolumeScore.toFixed(0)}(${val.toFixed(0)})`
        : row.commentVolumeScore.toFixed(0),
  },
  {
    name: 'commentGrowthCycle',
    label: '评论增长周期',
    field: 'commentGrowthCycle',
    align: 'center' as const,
    headerStyle: 'width: 120px; background-color: #fff3e0;',
    sortable: true,
    format: (val: number, row: any) =>
      showRawValues.value
        ? `${row.commentGrowthCycleScore.toFixed(1)}(${val.toFixed(1)})`
        : row.commentGrowthCycleScore.toFixed(1),
  },
  // 认同度大项
  {
    name: 'sentimentScore',
    label: '❤️ 认同度',
    field: 'sentimentScore',
    align: 'center' as const,
    headerStyle: 'width: 100px; font-weight: bold; background-color: #f3e5f5;',
    sortable: true,
    format: (val: number) => val.toFixed(2),
  },
  {
    name: 'likeVolume',
    label: '点赞总量',
    field: 'likeVolume',
    align: 'center' as const,
    headerStyle: 'width: 110px; background-color: #f3e5f5;',
    sortable: true,
    format: (val: number, row: any) =>
      showRawValues.value
        ? `${row.likeVolumeScore.toFixed(0)}(${val.toFixed(0)})`
        : row.likeVolumeScore.toFixed(0),
  },
  {
    name: 'commentAlignment',
    label: '评论同向性',
    field: 'commentAlignment',
    align: 'center' as const,
    headerStyle: 'width: 100px; background-color: #f3e5f5;',
    sortable: true,
    format: (val: number, row: any) =>
      showRawValues.value
        ? `${row.commentAlignmentScore.toFixed(1)}(${val.toFixed(3)})`
        : row.commentAlignmentScore.toFixed(1),
  },
  {
    name: 'alignmentTrend',
    label: '评论同向变化',
    field: 'alignmentTrend',
    align: 'center' as const,
    headerStyle: 'width: 120px; background-color: #f3e5f5;',
    sortable: true,
    format: (val: number, row: any) =>
      showRawValues.value
        ? `${row.alignmentTrendScore.toFixed(1)}(${val.toFixed(3)})`
        : row.alignmentTrendScore.toFixed(1),
  },
]);

// 分类同向度统计
// 获取有数据的分类列表
const availableCategories = computed(() => {
  if (!categoryData || !postCategoryMap) return [];

  return categoryData.filter(
    (category) => postCategoryMap.has(category.id) && postCategoryMap.get(category.id)!.length > 0,
  );
});

// 主要领域分类选择器选项
const categoryOptions = computed(() => {
  if (!categoryData) return [];

  return categoryData.map((category) => ({
    id: category.id,
    name: `${category.name || '未知'} (${category.id})`,
  }));
});

// 分类同向度统计数据
const categoryAgreementStats = computed(() => {
  if (
    !postAgreementData ||
    !postCategoryMap ||
    !categoryData ||
    availableCategories.value.length === 0
  ) {
    return [];
  }

  debugLog('🔄 [分类同向度] 开始计算分类同向度统计...');

  // 按身份分组统计
  const identityGroups = new Map<
    string,
    {
      authorName: string;
      categoryAgreements: Map<string, number[]>;
    }
  >();

  // 数据处理统计
  let totalPosts = 0;
  let validAgreementCount = 0;
  let filteredCount = 0;

  // 初始化身份分组
  postViewList.forEach((postView) => {
    const authorId = postView.post.author;
    if (!identityGroups.has(authorId)) {
      // 获取作者名称
      const identity = idList.find((id) => id.identity.id === authorId);
      let authorName = 'Unknown';
      if (identity && identity.archive && identity.archive.length > 0) {
        const sortedArchive = identity.archive.sort(
          (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
        );
        authorName = sortedArchive[0]?.name || 'Unknown';
      }

      identityGroups.set(authorId, {
        authorName,
        categoryAgreements: new Map(),
      });
    }
  });

  // 收集每个身份在各分类下的同向度数据
  postCategoryMap.forEach((postIds, categoryId) => {
    postIds.forEach((postId) => {
      // 找到对应的 postView
      const postView = postViewList.find((p) => p.post.id === postId);
      if (!postView) return;

      totalPosts++;
      const authorId = postView.post.author;
      const identity = identityGroups.get(authorId);
      if (!identity) return;

      // 🔥 [修改] 使用帖子ID获取同向度数据
      const agreementValue = postAgreementData[postView.post.id];

      if (typeof agreementValue === 'number') {
        if (agreementValue === -1) {
          // 🔥 [修改] 过滤掉同向度为-1的数据
          filteredCount++;
        } else {
          // 只保留有效的同向度值
          validAgreementCount++;
          if (!identity.categoryAgreements.has(categoryId)) {
            identity.categoryAgreements.set(categoryId, []);
          }
          identity.categoryAgreements.get(categoryId)!.push(agreementValue);
        }
      }
    });
  });
  const result = Array.from(identityGroups.entries())
    .map(([authorId, identity]) => {
      const row: any = {
        authorId,
        authorName: identity.authorName,
        averageAgreement: 0,
      };

      let totalAgreement = 0;
      let totalCategories = 0;

      // 为每个分类计算平均同向度
      availableCategories.value.forEach((category) => {
        const agreements = identity.categoryAgreements.get(category.id);
        if (agreements && agreements.length > 0) {
          const average = agreements.reduce((sum, val) => sum + val, 0) / agreements.length;
          row[`category-${category.id}`] = average;
          totalAgreement += average;
          totalCategories++;
        } else {
          row[`category-${category.id}`] = null;
        }
      });

      // 计算总体平均同向度（只考虑有数据的分类）
      row.averageAgreement = totalCategories > 0 ? totalAgreement / totalCategories : 0;

      return row;
    })
    .filter((row) => row.averageAgreement > 0); // 只保留有同向度数据的身份

  debugLog(
    `🔄 [分类同向度] 计算完成，共 ${result.length} 个身份，${availableCategories.value.length} 个分类`,
  );
  debugLog(
    `📊 [分类同向度] 数据统计: 总帖子${totalPosts}个，有效同向度${validAgreementCount}个，过滤-1数据${filteredCount}个`,
  );
  return result;
});

// 分类同向度统计表格列定义
const categoryAgreementColumns = computed(() => {
  const baseColumns = [
    {
      name: 'authorName',
      label: '身份',
      field: 'authorName',
      align: 'left' as const,
      headerStyle: 'width: 120px; font-weight: bold;',
    },
  ];

  // 动态添加分类列
  const categoryColumns = availableCategories.value.map((category) => ({
    name: `category-${category.id}`,
    label: category.name || `分类${category.id}`,
    field: `category-${category.id}`,
    align: 'center' as const,
    headerStyle: 'width: 100px; font-weight: bold;',
    sortable: true,
    format: (val: number | null) => (val !== null ? val.toFixed(3) : 'N/A'),
  }));

  const endColumns = [
    {
      name: 'averageAgreement',
      label: '平均同向度',
      field: 'averageAgreement',
      align: 'center' as const,
      headerStyle: 'width: 120px; font-weight: bold; background-color: #f5f5f5;',
      sortable: true,
      format: (val: number) => val.toFixed(3),
    },
  ];

  return [...baseColumns, ...categoryColumns, ...endColumns];
});

const latestPostArchiveCutWordList = computed(() => {
  const startTime = debugPerformance.now();
  debugLog('🔄 [PostStatistics] 开始计算 latestPostArchiveCutWordList...');

  // 🔥 [性能优化] 将cutWordCache转换为Map索引，避免O(n²)查找
  const indexBuildStart = debugPerformance.now();
  const cutWordMap = new Map<string, Array<string>>();
  for (const item of cutWordCache.cutWordCache) {
    cutWordMap.set(item.id, item.wordList);
  }
  const indexBuildEnd = debugPerformance.now();
  debugLog(
    `🔥 [性能优化] cutWordCache索引构建耗时: ${(indexBuildEnd - indexBuildStart).toFixed(2)}ms，索引了 ${cutWordMap.size} 个条目`,
  );

  const mapStart = debugPerformance.now();
  const result = latestPostArchiveList.value.map((post) => {
    // 🔥 [性能优化] 使用Map直接查找，O(1)时间复杂度，添加空值检查
    const cut = post.id ? cutWordMap.get(post.id) || [] : [];
    return {
      ...post,
      cut,
    };
  });
  const mapEnd = debugPerformance.now();
  debugLog(`🔥 [性能优化] 数据映射耗时: ${(mapEnd - mapStart).toFixed(2)}ms`);

  const endTime = debugPerformance.now();
  debugLog(
    `🔄 [PostStatistics] latestPostArchiveCutWordList 计算完成，总耗时: ${(endTime - startTime).toFixed(2)}ms，处理了 ${result.length} 条记录`,
  );
  return result;
});

const wordOccurrence = computed(() => {
  const startTime = debugPerformance.now();
  debugLog('🔄 [PostStatistics] 开始计算 wordOccurrence...');
  debugTime('wordOccurrence');

  const flatMapStart = debugPerformance.now();
  const words = latestPostArchiveCutWordList.value.flatMap((post) => post.cut);
  const flatMapEnd = debugPerformance.now();
  debugLog(
    `🔄 [PostStatistics] 词汇展平完成，耗时: ${(flatMapEnd - flatMapStart).toFixed(2)}ms，获得 ${words.length} 个词汇`,
  );

  // 🔥 [性能优化] 预编译正则表达式，避免重复编译
  const punctuationRegex =
    /^[\u3000-\u303F\uFF00-\uFFEF\u2000-\u206F\u0020-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]+$/;
  const digitRegex = /^\d+$/;

  // 🔥 [性能优化] 预定义停用词集合，使用Set进行O(1)查找
  const stopWords = new Set([
    // 中文连接词和介词
    '的',
    '了',
    '在',
    '是',
    '我',
    '有',
    '和',
    '就',
    '不',
    '人',
    '都',
    '一',
    '一个',
    '上',
    '也',
    '很',
    '到',
    '说',
    '要',
    '去',
    '你',
    '会',
    '着',
    '没有',
    '看',
    '好',
    '自己',
    '这',
    '那',
    '可以',
    '但是',
    '如果',
    '因为',
    '所以',
    '然后',
    '还是',
    '或者',
    '虽然',
    '不过',
    '而且',
    '但',
    '与',
    '及',
    '以及',
    '以',
    '为',
    '被',
    '把',
    '从',
    '向',
    '朝',
    '往',
    '由',
    '于',
    '对',
    '对于',
    '关于',
    '根据',
    '按照',
    '依据',
    '通过',
    '经过',
    '沿着',
    '随着',
    '除了',
    '除',
    '之外',
    '之',
    '之后',
    '之前',
    '以后',
    '以前',
    '当',
    '当时',
    '正在',
    '已经',
    '曾经',
    '将要',
    '即将',
    '刚刚',
    '马上',
    '立刻',
    '突然',
    '渐渐',
    '慢慢',
    '快速',
    '迅速',
    // 英文连接词和介词
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'up',
    'about',
    'into',
    'over',
    'after',
    'beneath',
    'under',
    'above',
    'below',
    'between',
    'among',
    'through',
    'during',
    'before',
    'since',
    'until',
    'while',
    'where',
    'when',
    'why',
    'how',
    'what',
    'which',
    'who',
    'whom',
    'whose',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'me',
    'him',
    'her',
    'us',
    'them',
    'my',
    'your',
    'his',
    'her',
    'its',
    'our',
    'their',
    'mine',
    'yours',
    'ours',
    'theirs',
    'am',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'can',
    'shall',
    'need',
    'dare',
    'ought',
    'used',
    'able',
    'if',
    'unless',
    'because',
    'so',
    'as',
    'than',
    'then',
    'now',
    'here',
    'there',
    'where',
    'everywhere',
    'anywhere',
    'somewhere',
    'nowhere',
    'when',
    'whenever',
    'always',
    'never',
    'sometimes',
    'often',
    'usually',
    'seldom',
    'rarely',
    'hardly',
    'scarcely',
    'barely',
    'just',
    'only',
    'even',
    'still',
    'yet',
    'already',
    'again',
    'once',
    'twice',
    'first',
    'second',
    'third',
    'last',
    'next',
    'previous',
    'other',
    'another',
    'some',
    'any',
    'many',
    'much',
    'few',
    'little',
    'several',
    'all',
    'both',
    'each',
    'every',
    'either',
    'neither',
    'none',
    'no',
    'not',
    'yes',
    'ok',
    'okay',
  ]);

  const filterStart = debugPerformance.now();
  const filteredWords = words.filter((word) => {
    // 🔥 [性能优化] 快速基本检查（最常见的过滤条件优先）
    if (word.length <= 1) return false;

    // 快速字符检查，避免正则表达式
    const firstChar = word[0];
    if (firstChar === 'h' && word.startsWith('http')) return false;
    if (firstChar === '@') return false;

    // 🔥 [性能优化] 使用预编译的正则表达式
    if (punctuationRegex.test(word)) return false;
    if (digitRegex.test(word)) return false;

    // 🔥 [性能优化] 过滤停用词（连接词、介词等），使用Set的O(1)查找
    const lowerWord = word.toLowerCase();
    if (stopWords.has(word) || stopWords.has(lowerWord)) return false;

    return true;
  });
  const filterEnd = debugPerformance.now();
  debugLog(
    `🔄 [PostStatistics] 词汇过滤完成，耗时: ${(filterEnd - filterStart).toFixed(2)}ms，剩余 ${filteredWords.length} 个有效词汇`,
  );

  // 🔥 [性能优化] 使用Map手动统计词频，比Object.groupBy更高效
  const groupStart = debugPerformance.now();
  const wordCountMap = new Map<string, number>();
  for (const word of filteredWords) {
    const count = wordCountMap.get(word) || 0;
    wordCountMap.set(word, count + 1);
  }
  const groupEnd = debugPerformance.now();
  debugLog(
    '🔥 [性能优化] 词汇分组完成，耗时:',
    (groupEnd - groupStart).toFixed(2) + 'ms，获得',
    wordCountMap.size,
    '个不同词汇',
  );

  const mapStart = debugPerformance.now();
  const result = Array.from(wordCountMap.entries()).map(([word, count]) => ({
    word,
    count,
  }));
  const mapEnd = debugPerformance.now();
  debugLog(`🔄 [PostStatistics] 词频统计完成，耗时: ${(mapEnd - mapStart).toFixed(2)}ms`);

  debugTimeEnd('wordOccurrence');
  const totalTime = debugPerformance.now() - startTime;
  debugLog(`🔄 [PostStatistics] wordOccurrence 计算完成，总耗时: ${totalTime.toFixed(2)}ms`);

  return result;
});

const postViewDivideByDay = computed(() => {
  return divideByDay(postViewList, (postView) =>
    dayjs(postView.post.createdAt).format('YYYY-MM-DD'),
  );
});

const postCountByDay = computed(() => {
  return postViewDivideByDay.value.map((day) => ({
    date: day.date,
    count: day.itemList.length,
  }));
});

const totalStatsDivided = computed(() => {
  debugLog('postViewDivideByDay.value', postViewDivideByDay.value);
  return postViewDivideByDay.value.map((day) => {
    const date = day.date;
    const stat = day.itemList.reduce(
      (stats, post) => {
        // 按 capturedAt 时间降序排序，获取最新的存档
        const sortedArchive = post.archive.sort(
          (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
        );
        const latestArchive = sortedArchive[0];

        if (latestArchive) {
          return {
            like: stats.like + (latestArchive.like ?? 0),
            share: stats.share + (latestArchive.share ?? 0),
            comment: stats.comment + (latestArchive.comment ?? 0),
          };
        }
        return stats;
      },
      { like: 0, share: 0, comment: 0 },
    );
    return {
      date,
      ...stat,
    };
  });
});

// ECharts 配置选项
const interactionTrendOption = computed<EChartsOption>(() => {
  const dates = totalStatsDivided.value.map((item) => item.date);
  const likes = totalStatsDivided.value.map((item) => item.like);
  const shares = totalStatsDivided.value.map((item) => item.share);
  const comments = totalStatsDivided.value.map((item) => item.comment);

  return {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['点赞', '分享', '评论'],
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '点赞',
        type: 'line',
        data: likes,
        smooth: true,
        itemStyle: {
          color: '#ff6b6b',
        },
      },
      {
        name: '分享',
        type: 'line',
        data: shares,
        smooth: true,
        itemStyle: {
          color: '#4ecdc4',
        },
      },
      {
        name: '评论',
        type: 'line',
        data: comments,
        smooth: true,
        itemStyle: {
          color: '#45b7d1',
        },
      },
    ],
  };
});

const postCountOption = computed<EChartsOption>(() => {
  const dates = postCountByDay.value.map((item) => item.date);
  const counts = postCountByDay.value.map((item) => item.count);

  return {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '发文量',
        type: 'bar',
        data: counts,
        itemStyle: {
          color: '#95de64',
        },
      },
    ],
  };
});

// 单独的点赞趋势图
const likeOption = computed<EChartsOption>(() => {
  const dates = totalStatsDivided.value.map((item) => item.date);
  const likes = totalStatsDivided.value.map((item) => item.like);

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c} 点赞',
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
      name: '点赞数',
    },
    series: [
      {
        name: '点赞',
        type: 'line',
        data: likes,
        smooth: true,
        itemStyle: {
          color: '#ff6b6b',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
              { offset: 1, color: 'rgba(255, 107, 107, 0.1)' },
            ],
          },
        },
      },
    ],
  };
});

// 单独的分享趋势图
const shareOption = computed<EChartsOption>(() => {
  const dates = totalStatsDivided.value.map((item) => item.date);
  const shares = totalStatsDivided.value.map((item) => item.share);

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c} 分享',
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
      name: '分享数',
    },
    series: [
      {
        name: '分享',
        type: 'line',
        data: shares,
        smooth: true,
        itemStyle: {
          color: '#4ecdc4',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(78, 205, 196, 0.3)' },
              { offset: 1, color: 'rgba(78, 205, 196, 0.1)' },
            ],
          },
        },
      },
    ],
  };
});

// 单独的评论趋势图
const commentOption = computed<EChartsOption>(() => {
  const dates = totalStatsDivided.value.map((item) => item.date);
  const comments = totalStatsDivided.value.map((item) => item.comment);

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c} 评论',
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
      name: '评论数',
    },
    series: [
      {
        name: '评论',
        type: 'line',
        data: comments,
        smooth: true,
        itemStyle: {
          color: '#45b7d1',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69, 183, 209, 0.3)' },
              { offset: 1, color: 'rgba(69, 183, 209, 0.1)' },
            ],
          },
        },
      },
    ],
  };
});

// 综合互动趋势图（垂直排列的三个子图）
const combinedTrendOption = computed<EChartsOption>(() => {
  const dates = totalStatsDivided.value.map((item) => item.date);
  const likes = totalStatsDivided.value.map((item) => item.like);
  const shares = totalStatsDivided.value.map((item) => item.share);
  const comments = totalStatsDivided.value.map((item) => item.comment);

  return {
    title: {
      text: '综合互动趋势',
      left: 'center',
      top: 10,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
    },
    grid: [
      {
        left: '10%',
        right: '10%',
        top: '10%',
        height: '22%',
      },
      {
        left: '10%',
        right: '10%',
        top: '40%',
        height: '22%',
      },
      {
        left: '10%',
        right: '10%',
        top: '70%',
        height: '22%',
      },
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        gridIndex: 0,
        axisLabel: { show: false },
      },
      {
        type: 'category',
        data: dates,
        gridIndex: 1,
        axisLabel: { show: false },
      },
      {
        type: 'category',
        data: dates,
        gridIndex: 2,
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '点赞数',
        gridIndex: 0,
        nameTextStyle: {
          color: '#ff6b6b',
          fontWeight: 'bold',
        },
      },
      {
        type: 'value',
        name: '分享数',
        gridIndex: 1,
        nameTextStyle: {
          color: '#4ecdc4',
          fontWeight: 'bold',
        },
      },
      {
        type: 'value',
        name: '评论数',
        gridIndex: 2,
        nameTextStyle: {
          color: '#45b7d1',
          fontWeight: 'bold',
        },
      },
    ],
    series: [
      {
        name: '点赞',
        type: 'line',
        data: likes,
        smooth: true,
        xAxisIndex: 0,
        yAxisIndex: 0,
        itemStyle: {
          color: '#ff6b6b',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
              { offset: 1, color: 'rgba(255, 107, 107, 0.1)' },
            ],
          },
        },
      },
      {
        name: '分享',
        type: 'line',
        data: shares,
        smooth: true,
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: {
          color: '#4ecdc4',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(78, 205, 196, 0.3)' },
              { offset: 1, color: 'rgba(78, 205, 196, 0.1)' },
            ],
          },
        },
      },
      {
        name: '评论',
        type: 'line',
        data: comments,
        smooth: true,
        xAxisIndex: 2,
        yAxisIndex: 2,
        itemStyle: {
          color: '#45b7d1',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69, 183, 209, 0.3)' },
              { offset: 1, color: 'rgba(69, 183, 209, 0.1)' },
            ],
          },
        },
      },
    ],
  };
});

// 推文交互散点图 (点赞 vs 评论)
const scatterOption = computed<EChartsOption>(() => {
  const scatterData = latestPostArchiveList.value
    .filter((post) => (post.like ?? 0) > 0 || (post.comment ?? 0) > 0) // 过滤掉没有互动的推文
    .map((post) => [
      Math.max(post.like ?? 1, 1), // 点赞数，最小值为1以适配对数轴
      Math.max(post.comment ?? 1, 1), // 评论数，最小值为1以适配对数轴
      post.content?.substring(0, 50) + '...' || '无内容', // 推文内容预览
      post.id, // 推文ID
    ]);

  return {
    title: {
      text: '推文互动分布',
      subtext: '横轴: 点赞数 (对数轴) | 纵轴: 评论数 (对数轴)',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: function (params: any) {
        const [likes, comments, content] = params.data;
        return `
          <div style="max-width: 300px;">
            <strong>推文内容:</strong><br/>
            ${content}<br/>
            <strong>点赞:</strong> ${likes}<br/>
            <strong>评论:</strong> ${comments}
          </div>
        `;
      },
    },
    xAxis: {
      type: 'log',
      name: '点赞数',
      nameLocation: 'middle',
      nameGap: 30,
      min: 1,
      axisLabel: {
        formatter: '{value}',
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#e0e0e0',
          type: 'dashed',
        },
      },
    },
    yAxis: {
      type: 'log',
      name: '评论数',
      nameLocation: 'middle',
      nameGap: 50,
      min: 1,
      axisLabel: {
        formatter: '{value}',
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#e0e0e0',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '推文互动',
        type: 'scatter',
        data: scatterData,
        symbolSize: function (data: any) {
          // 根据点赞数和评论数的总和调整点的大小
          const total = data[0] + data[1];
          return Math.min(Math.max(Math.log10(total) * 8, 6), 25);
        },
        itemStyle: {
          color: function (params: any) {
            // 根据互动强度使用不同颜色
            const total = params.data[0] + params.data[1];
            if (total > 100) return '#ff4757'; // 高互动 - 红色
            if (total > 50) return '#ffa726'; // 中高互动 - 橙色
            if (total > 20) return '#66bb6a'; // 中等互动 - 绿色
            return '#42a5f5'; // 低互动 - 蓝色
          },
          opacity: 0.2,
        },
        emphasis: {
          itemStyle: {
            opacity: 1,
            borderColor: '#333',
            borderWidth: 2,
          },
        },
      },
    ],
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%',
      top: '20%',
    },
  };
});

// 推文交互热力图 (点赞 vs 评论)
const heatmapOption = computed<EChartsOption>(() => {
  // 获取有效的互动数据
  const validPosts = latestPostArchiveList.value.filter(
    (post) => (post.like ?? 0) > 0 || (post.comment ?? 0) > 0,
  );

  // 确定数据范围
  const maxLikes = Math.max(...validPosts.map((post) => post.like ?? 0));
  const maxComments = Math.max(...validPosts.map((post) => post.comment ?? 0));

  // 创建分组区间
  const likeBins = 20; // 点赞数分20个区间
  const commentBins = 20; // 评论数分20个区间

  const likeStep = Math.ceil(maxLikes / likeBins);
  const commentStep = Math.ceil(maxComments / commentBins);

  // 创建热力图数据矩阵
  const heatmapData: number[][] = [];
  const likeLabels: string[] = [];
  const commentLabels: string[] = [];

  // 生成标签
  for (let i = 0; i < likeBins; i++) {
    const start = i * likeStep;
    const end = (i + 1) * likeStep;
    likeLabels.push(`${start}-${end}`);
  }

  for (let i = 0; i < commentBins; i++) {
    const start = i * commentStep;
    const end = (i + 1) * commentStep;
    commentLabels.push(`${start}-${end}`);
  }

  // 初始化数据矩阵
  const dataMatrix: number[][] = Array(commentBins)
    .fill(0)
    .map(() => Array(likeBins).fill(0));

  // 填充数据
  validPosts.forEach((post) => {
    const likes = post.like ?? 0;
    const comments = post.comment ?? 0;

    const likeIndex = Math.min(Math.floor(likes / likeStep), likeBins - 1);
    const commentIndex = Math.min(Math.floor(comments / commentStep), commentBins - 1);

    if (dataMatrix[commentIndex] && dataMatrix[commentIndex][likeIndex] !== undefined) {
      dataMatrix[commentIndex][likeIndex]++;
    }
  });

  // 转换为ECharts热力图数据格式
  for (let i = 0; i < commentBins; i++) {
    for (let j = 0; j < likeBins; j++) {
      const value = dataMatrix[i]?.[j];
      if (value && value > 0) {
        heatmapData.push([j, i, value]);
      }
    }
  }

  return {
    title: {
      text: '推文互动分布热力图',
      subtext: '颜色深度表示该区间内推文数量密度',
      left: 'center',
    },
    tooltip: {
      position: 'top',
      formatter: function (params: any) {
        const [likeIndex, commentIndex, count] = params.data;
        const likeRange = likeLabels[likeIndex];
        const commentRange = commentLabels[commentIndex];
        return `
          <div>
            <strong>点赞范围:</strong> ${likeRange}<br/>
            <strong>评论范围:</strong> ${commentRange}<br/>
            <strong>推文数量:</strong> ${count}
          </div>
        `;
      },
    },
    grid: {
      height: '70%',
      top: '15%',
      left: '15%',
      right: '15%',
    },
    xAxis: {
      type: 'category',
      data: likeLabels,
      name: '点赞数区间',
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: {
        rotate: 45,
        fontSize: 10,
      },
      splitArea: {
        show: true,
      },
    },
    yAxis: {
      type: 'category',
      data: commentLabels,
      name: '评论数区间',
      nameLocation: 'middle',
      nameGap: 60,
      axisLabel: {
        fontSize: 10,
      },
      splitArea: {
        show: true,
      },
    },
    visualMap: {
      min: 0,
      max: heatmapData.length > 0 ? Math.max(...heatmapData.map((item) => item[2] ?? 0)) : 10,
      calculable: true,
      orient: 'vertical',
      left: 'right',
      top: 'middle',
      inRange: {
        color: [
          '#313695',
          '#4575b4',
          '#74add1',
          '#abd9e9',
          '#e0f3f8',
          '#ffffbf',
          '#fee090',
          '#fdae61',
          '#f46d43',
          '#d73027',
          '#a50026',
        ],
      },
      text: ['高密度', '低密度'],
      textStyle: {
        fontSize: 12,
      },
    },
    series: [
      {
        name: '推文分布',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
});

// 推文交互3D散点图 (点赞 : 评论 : 分享)
const scatter3DOption = computed(() => {
  // 获取有效的互动数据，确保至少有一种互动
  const validPosts = latestPostArchiveList.value.filter(
    (post) => (post.like ?? 0) > 0 || (post.comment ?? 0) > 0 || (post.share ?? 0) > 0,
  );

  // 准备3D散点图数据
  const scatter3DData = validPosts.map((post) => ({
    value: [
      Math.max(post.like ?? 1, 1), // X轴: 点赞数，最小值为1
      Math.max(post.comment ?? 1, 1), // Y轴: 评论数，最小值为1
      Math.max(post.share ?? 1, 1), // Z轴: 分享数，最小值为1
    ],
    name: post.content?.substring(0, 30) + '...' || '无内容',
    itemStyle: {
      opacity: 0.8,
    },
  }));

  return {
    title: {
      text: '推文互动3D分布',
      subtext: 'X轴: 点赞数 | Y轴: 评论数 | Z轴: 分享数',
      left: 'center',
    },
    tooltip: {
      formatter: function (params: any) {
        const [likes, comments, shares] = params.data.value;
        return `
          <div style="max-width: 300px;">
            <strong>推文内容:</strong><br/>
            ${params.data.name}<br/>
            <strong>点赞:</strong> ${likes}<br/>
            <strong>评论:</strong> ${comments}<br/>
            <strong>分享:</strong> ${shares}
          </div>
        `;
      },
    },
    grid3D: {
      boxWidth: 100,
      boxHeight: 100,
      boxDepth: 100,
      alpha: 20,
      beta: 40,
      viewControl: {
        projection: 'perspective',
        autoRotate: false,
        distance: 200,
        alpha: 20,
        beta: 40,
        center: [0, 0, 0],
        panMouseButton: 'left',
        rotateMouseButton: 'right',
      },
      light: {
        main: {
          intensity: 1.2,
          shadow: true,
          shadowQuality: 'high',
        },
        ambient: {
          intensity: 0.3,
        },
      },
    },
    xAxis3D: {
      name: '点赞数',
      type: 'log',
      min: 1,
      axisLabel: {
        formatter: '{value}',
      },
    },
    yAxis3D: {
      name: '评论数',
      type: 'log',
      min: 1,
      axisLabel: {
        formatter: '{value}',
      },
    },
    zAxis3D: {
      name: '分享数',
      type: 'log',
      min: 1,
      axisLabel: {
        formatter: '{value}',
      },
    },
    series: [
      {
        type: 'scatter3D',
        data: scatter3DData,
        symbolSize: function (data: any) {
          // 根据总互动量调整点的大小
          const total = data[0] + data[1] + data[2];
          return Math.min(Math.max(Math.log10(total) * 5, 4), 20);
        },
        itemStyle: {
          color: function (params: any) {
            // 根据总互动强度使用不同颜色
            const [likes, comments, shares] = params.data.value;
            const total = likes + comments + shares;

            if (total > 200) return '#e74c3c'; // 超高互动 - 红色
            if (total > 100) return '#f39c12'; // 高互动 - 橙色
            if (total > 50) return '#f1c40f'; // 中高互动 - 黄色
            if (total > 20) return '#2ecc71'; // 中等互动 - 绿色
            if (total > 10) return '#3498db'; // 中低互动 - 蓝色
            return '#9b59b6'; // 低互动 - 紫色
          },
          opacity: 0.8,
        },
        emphasis: {
          itemStyle: {
            opacity: 1,
          },
        },
      },
    ],
  };
});

// 分类占比饼图相关计算

// 通用的分类饼图生成函数
const generateCategoryPieChart = (
  title: string,
  metricName: string,
  getMetricValue: (post: Spec.PostView.Type) => number,
  formatter: string = '{a} <br/>{b}: {c} ({d}%)',
): EChartsOption => {
  // 如果没有分类数据或帖子数据，返回空饼图
  if (
    !postCategoryMap ||
    !categoryData ||
    postCategoryMap.size === 0 ||
    categoryData.length === 0 ||
    postViewList.length === 0
  ) {
    return {
      title: {
        text: title,
        left: 'center',
        top: 20,
      },
      tooltip: {
        trigger: 'item',
        formatter,
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
      },
      series: [
        {
          name: metricName,
          type: 'pie',
          radius: '50%',
          center: ['60%', '50%'],
          data: [
            {
              value: 100,
              name: '暂无分类数据',
              itemStyle: {
                color: '#e0e0e0',
              },
            },
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }

  // 创建帖子ID到帖子对象的映射
  const postMap = new Map<string, Spec.PostView.Type>();
  postViewList.forEach((post) => {
    postMap.set(post.post.id, post);
  });

  // 统计各分类的指标总数
  const categoryStats = new Map<string, number>();

  // 初始化所有分类的计数为0
  categoryData.forEach((category) => {
    categoryStats.set(category.id, 0);
  });

  // 统计各分类下的指标总数
  postCategoryMap.forEach((postIds, categoryId) => {
    if (categoryStats.has(categoryId)) {
      const totalMetric = postIds.reduce((sum, postId) => {
        const post = postMap.get(postId);
        return sum + (post ? getMetricValue(post) : 0);
      }, 0);
      categoryStats.set(categoryId, totalMetric);
    }
  });

  // 计算未分类的指标总数
  const categorizedPostIds = new Set<string>();
  postCategoryMap.forEach((postIds) => {
    postIds.forEach((postId) => categorizedPostIds.add(postId));
  });

  const uncategorizedTotal = postViewList
    .filter((post) => !categorizedPostIds.has(post.post.id))
    .reduce((sum, post) => sum + getMetricValue(post), 0);

  // 准备饼图数据
  const pieData = [];

  // 添加各分类数据
  categoryData.forEach((category) => {
    const total = categoryStats.get(category.id) || 0;
    if (total > 0) {
      pieData.push({
        value: total,
        name: category.name,
      });
    }
  });

  // 添加未分类数据
  if (uncategorizedTotal > 0) {
    pieData.push({
      value: uncategorizedTotal,
      name: '未分类',
      itemStyle: {
        color: '#bdbdbd',
      },
    });
  }

  // 如果没有任何数据，显示提示
  if (pieData.length === 0) {
    pieData.push({
      value: 100,
      name: '无数据',
      itemStyle: {
        color: '#e0e0e0',
      },
    });
  }

  return {
    title: {
      text: title,
      left: 'center',
      top: 20,
    },
    tooltip: {
      trigger: 'item',
      formatter,
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
    },
    series: [
      {
        name: metricName,
        type: 'pie',
        radius: '50%',
        center: ['60%', '50%'],
        data: pieData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          show: true,
          formatter: '{b}: {d}%',
        },
      },
    ],
  };
};

// 计算分类占比饼图数据
const categoryDistributionOption = computed<EChartsOption>(() => {
  // 如果没有分类数据或帖子数据，返回空饼图
  if (
    !postCategoryMap ||
    !categoryData ||
    postCategoryMap.size === 0 ||
    categoryData.length === 0 ||
    postViewList.length === 0
  ) {
    return {
      title: {
        text: '分类推文数量分布',
        left: 'center',
        top: 20,
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
      },
      series: [
        {
          name: '分类占比',
          type: 'pie',
          radius: '50%',
          center: ['60%', '50%'],
          data: [
            {
              value: 100,
              name: '暂无分类数据',
              itemStyle: {
                color: '#e0e0e0',
              },
            },
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }

  // 统计各分类的帖子数量
  const categoryStats = new Map<string, number>();

  // 初始化所有分类的计数为0
  categoryData.forEach((category) => {
    categoryStats.set(category.id, 0);
  });

  // 统计各分类下的帖子数量
  postCategoryMap.forEach((postIds, categoryId) => {
    if (categoryStats.has(categoryId)) {
      categoryStats.set(categoryId, postIds.length);
    }
  });

  // 计算未分类的帖子数量
  const categorizedPostIds = new Set<string>();
  postCategoryMap.forEach((postIds) => {
    postIds.forEach((postId) => categorizedPostIds.add(postId));
  });
  const uncategorizedCount = postViewList.length - categorizedPostIds.size;

  // 准备饼图数据
  const pieData = [];

  // 添加各分类数据
  categoryData.forEach((category) => {
    const count = categoryStats.get(category.id) || 0;
    if (count > 0) {
      pieData.push({
        value: count,
        name: category.name,
      });
    }
  });

  // 添加未分类数据
  if (uncategorizedCount > 0) {
    pieData.push({
      value: uncategorizedCount,
      name: '未分类',
      itemStyle: {
        color: '#bdbdbd',
      },
    });
  }

  // 如果没有任何数据，显示提示
  if (pieData.length === 0) {
    pieData.push({
      value: 100,
      name: '无数据',
      itemStyle: {
        color: '#e0e0e0',
      },
    });
  }

  return {
    title: {
      text: '分类推文数量分布',
      left: 'center',
      top: 20,
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} 个帖子 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
    },
    series: [
      {
        name: '分类占比',
        type: 'pie',
        radius: '50%',
        center: ['60%', '50%'],
        data: pieData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          show: true,
          formatter: '{b}: {d}%',
        },
      },
    ],
  };
});

// 分类分享数量分布饼图
const categoryShareDistributionOption = computed<EChartsOption>(() => {
  return generateCategoryPieChart(
    '分类分享数量分布',
    '分享分布',
    (post) => {
      const latestArchive = post.archive.sort(
        (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      )[0];
      return latestArchive?.share || 0;
    },
    '{a} <br/>{b}: {c} 次分享 ({d}%)',
  );
});

// 分类评论数量分布饼图
const categoryCommentDistributionOption = computed<EChartsOption>(() => {
  return generateCategoryPieChart(
    '分类评论数量分布',
    '评论分布',
    (post) => {
      const latestArchive = post.archive.sort(
        (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      )[0];
      return latestArchive?.comment || 0;
    },
    '{a} <br/>{b}: {c} 条评论 ({d}%)',
  );
});

// 分类点赞数量分布饼图
const categoryLikeDistributionOption = computed<EChartsOption>(() => {
  return generateCategoryPieChart(
    '分类点赞数量分布',
    '点赞分布',
    (post) => {
      const latestArchive = post.archive.sort(
        (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      )[0];
      return latestArchive?.like || 0;
    },
    '{a} <br/>{b}: {c} 次点赞 ({d}%)',
  );
});

// 综合分类分析饼图（2x2布局）
const combinedCategoryDistributionOption = computed<EChartsOption>(() => {
  // 如果没有分类数据或帖子数据，返回空图表
  if (
    !postCategoryMap ||
    !categoryData ||
    postCategoryMap.size === 0 ||
    categoryData.length === 0 ||
    postViewList.length === 0
  ) {
    return {
      title: {
        text: '综合分类分析',
        left: 'center',
        top: 20,
      },
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: '暂无分类数据',
          fontSize: 16,
          fill: '#999',
        },
      },
    };
  }

  // 创建帖子ID到帖子对象的映射
  const postMap = new Map<string, Spec.PostView.Type>();
  postViewList.forEach((post) => {
    postMap.set(post.post.id, post);
  });

  // 统计各分类的各项指标
  const categoryPostStats = new Map<string, number>();
  const categoryShareStats = new Map<string, number>();
  const categoryCommentStats = new Map<string, number>();
  const categoryLikeStats = new Map<string, number>();

  // 初始化所有分类的计数为0
  categoryData.forEach((category) => {
    categoryPostStats.set(category.id, 0);
    categoryShareStats.set(category.id, 0);
    categoryCommentStats.set(category.id, 0);
    categoryLikeStats.set(category.id, 0);
  });

  // 统计各分类的数据
  postCategoryMap.forEach((postIds, categoryId) => {
    if (categoryPostStats.has(categoryId)) {
      categoryPostStats.set(categoryId, postIds.length);

      const shareTotal = postIds.reduce((sum, postId) => {
        const post = postMap.get(postId);
        if (post) {
          const latestArchive = post.archive.sort(
            (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
          )[0];
          return sum + (latestArchive?.share || 0);
        }
        return sum;
      }, 0);
      categoryShareStats.set(categoryId, shareTotal);

      const commentTotal = postIds.reduce((sum, postId) => {
        const post = postMap.get(postId);
        if (post) {
          const latestArchive = post.archive.sort(
            (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
          )[0];
          return sum + (latestArchive?.comment || 0);
        }
        return sum;
      }, 0);
      categoryCommentStats.set(categoryId, commentTotal);

      const likeTotal = postIds.reduce((sum, postId) => {
        const post = postMap.get(postId);
        if (post) {
          const latestArchive = post.archive.sort(
            (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
          )[0];
          return sum + (latestArchive?.like || 0);
        }
        return sum;
      }, 0);
      categoryLikeStats.set(categoryId, likeTotal);
    }
  });

  // 计算未分类的数据
  const categorizedPostIds = new Set<string>();
  postCategoryMap.forEach((postIds) => {
    postIds.forEach((postId) => categorizedPostIds.add(postId));
  });

  const uncategorizedPosts = postViewList.filter((post) => !categorizedPostIds.has(post.post.id));
  const uncategorizedPostCount = uncategorizedPosts.length;
  const uncategorizedShareTotal = uncategorizedPosts.reduce((sum, post) => {
    const latestArchive = post.archive.sort(
      (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    )[0];
    return sum + (latestArchive?.share || 0);
  }, 0);
  const uncategorizedCommentTotal = uncategorizedPosts.reduce((sum, post) => {
    const latestArchive = post.archive.sort(
      (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    )[0];
    return sum + (latestArchive?.comment || 0);
  }, 0);
  const uncategorizedLikeTotal = uncategorizedPosts.reduce((sum, post) => {
    const latestArchive = post.archive.sort(
      (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    )[0];
    return sum + (latestArchive?.like || 0);
  }, 0);

  // 生成各个饼图的数据
  const generatePieData = (statsMap: Map<string, number>, uncategorizedValue: number) => {
    const pieData = [];

    categoryData.forEach((category) => {
      const value = statsMap.get(category.id) || 0;
      if (value > 0) {
        pieData.push({
          value,
          name: category.name,
        });
      }
    });

    if (uncategorizedValue > 0) {
      pieData.push({
        value: uncategorizedValue,
        name: '未分类',
        itemStyle: {
          color: '#bdbdbd',
        },
      });
    }

    if (pieData.length === 0) {
      pieData.push({
        value: 100,
        name: '无数据',
        itemStyle: {
          color: '#e0e0e0',
        },
      });
    }

    return pieData;
  };

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{a}<br/>{b}: {c} ({d}%)',
    },
    series: [
      {
        name: '推文数量分布',
        type: 'pie',
        radius: '35%',
        center: ['25%', '30%'],
        data: generatePieData(categoryPostStats, uncategorizedPostCount),
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%',
          fontSize: 9,
          color: '#333',
        },
        labelLine: {
          show: true,
          length: 6,
          length2: 2,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
      {
        name: '分享数量分布',
        type: 'pie',
        radius: '35%',
        center: ['75%', '30%'],
        data: generatePieData(categoryShareStats, uncategorizedShareTotal),
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%',
          fontSize: 9,
          color: '#333',
        },
        labelLine: {
          show: true,
          length: 6,
          length2: 2,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
      {
        name: '评论数量分布',
        type: 'pie',
        radius: '35%',
        center: ['25%', '75%'],
        data: generatePieData(categoryCommentStats, uncategorizedCommentTotal),
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%',
          fontSize: 9,
          color: '#333',
        },
        labelLine: {
          show: true,
          length: 6,
          length2: 2,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
      {
        name: '点赞数量分布',
        type: 'pie',
        radius: '35%',
        center: ['75%', '75%'],
        data: generatePieData(categoryLikeStats, uncategorizedLikeTotal),
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%',
          fontSize: 9,
          color: '#333',
        },
        labelLine: {
          show: true,
          length: 6,
          length2: 2,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
    graphic: [
      {
        type: 'text',
        left: '25%',
        top: '8%',
        style: {
          text: '推文数量占比',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 'bold',
          fill: '#1976d2',
        },
      },
      {
        type: 'text',
        left: '75%',
        top: '8%',
        style: {
          text: '分享数量占比',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 'bold',
          fill: '#388e3c',
        },
      },
      {
        type: 'text',
        left: '25%',
        top: '53%',
        style: {
          text: '评论数量占比',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 'bold',
          fill: '#f57c00',
        },
      },
      {
        type: 'text',
        left: '75%',
        top: '53%',
        style: {
          text: '点赞数量占比',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 'bold',
          fill: '#d32f2f',
        },
      },
    ],
  };
});

// 词云图配置
const wordCloudOption = computed(() => {
  // 过滤出现频率较高的词汇，避免词云过于拥挤
  const filteredWords = wordOccurrence.value
    .filter((item) => item.count > 1) // 只显示出现2次以上的词汇
    .sort((a, b) => b.count - a.count) // 按频率降序排列
    .slice(0, 100); // 最多显示100个词汇

  // 转换为词云数据格式
  const wordCloudData = filteredWords.map((item) => ({
    name: item.word,
    value: item.count,
  }));

  return {
    tooltip: {
      formatter: function (params: any) {
        return `<strong>${params.data.name}</strong><br/>出现次数: ${params.data.value}`;
      },
    },
    series: [
      {
        type: 'wordCloud',
        gridSize: 2,
        sizeRange: [12, 50],
        rotationRange: [-90, 90],
        shape: 'pentagon',
        width: '100%',
        height: '100%',
        drawOutOfBound: false,
        layoutAnimation: true,
        textStyle: {
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          color: function () {
            // 随机颜色
            const colors = [
              '#ff6b6b',
              '#4ecdc4',
              '#45b7d1',
              '#96ceb4',
              '#ffd93d',
              '#ff8a80',
              '#82b1ff',
              '#b39ddb',
              '#f8bbd9',
              '#c5e1a5',
            ];
            return colors[Math.floor(Math.random() * colors.length)];
          },
        },
        emphasis: {
          focus: 'self',
          textStyle: {
            shadowBlur: 10,
            shadowColor: '#333',
          },
        },
        data: wordCloudData,
      },
    ],
  } as any; // 使用 any 类型避免 TypeScript 类型检查问题
});
</script>

<style lang="scss">
.fixed-layout-table {
  table {
    table-layout: fixed;
  }
}

// 横向滚动表格优化样式
.q-table__container {
  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;

    &:hover {
      background: #a8a8a8;
    }
  }

  // 为表格头部添加粘性定位以确保在滚动时保持可见
  .q-table__top {
    position: sticky;
    left: 0;
    z-index: 1;
    background: white;
  }
}

// 表格列宽度优化
.q-table th,
.q-table td {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  // 为第一列（身份名称）添加粘性定位
  &:first-child {
    position: sticky;
    left: 0;
    background: white;
    z-index: 2;
    box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  }
}

// 响应式设计 - 在较小屏幕上提供更好的滚动体验
@media (max-width: 1200px) {
  .q-table__container[style*='overflow-x: auto'] {
    // 添加滚动提示
    &::before {
      content: '👈 左右滑动查看更多列';
      position: absolute;
      top: -30px;
      right: 0;
      font-size: 12px;
      color: #666;
      background: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
      z-index: 3;
    }
  }
}
</style>
