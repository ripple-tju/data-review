<template>
  <div class="report-generator">
    <div class="text-h5 q-mb-md">
      <q-icon name="assessment" class="q-mr-sm" />
      数据分析报告
    </div>

    <div v-if="!analysisResults" class="text-center q-pa-xl">
      <q-icon name="info" size="4rem" color="grey-5" class="q-mb-md" />
      <div class="text-h6 q-mb-md text-grey-6">暂无数据</div>
      <div class="text-body2 text-grey">请先选择身份并进行数据分析</div>
    </div>

    <div v-else class="q-gutter-md">
      <!-- 身份排行表 -->
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6 q-mb-md">
            <q-icon name="leaderboard" class="q-mr-sm" />
            身份影响力排行榜
          </div>
          <div class="text-caption text-grey q-mb-md">
            基于点赞、分享、评论的加权评分排序（权重：点赞×1.0，分享×3.0，评论×2.0）
          </div>

          <q-table
            :rows="identityRankingData"
            :columns="rankingColumns"
            row-key="name"
            :pagination="{ rowsPerPage: 10 }"
            flat
            bordered
            dense
          >
            <template #body-cell-rank="props">
              <q-td :props="props">
                <q-chip
                  :color="getRankColor(props.row.rank)"
                  text-color="white"
                  size="sm"
                  :label="props.row.rank"
                />
              </q-td>
            </template>

            <template #body-cell-score="props">
              <q-td :props="props">
                <div class="text-weight-bold">{{ props.row.score.toFixed(2) }}</div>
              </q-td>
            </template>

            <template #body-cell-like="props">
              <q-td :props="props">
                <q-chip outline color="pink" size="sm" :label="props.row.like" />
              </q-td>
            </template>

            <template #body-cell-share="props">
              <q-td :props="props">
                <q-chip outline color="blue" size="sm" :label="props.row.share" />
              </q-td>
            </template>

            <template #body-cell-comment="props">
              <q-td :props="props">
                <q-chip outline color="green" size="sm" :label="props.row.comment" />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>

      <!-- 3D散点图 -->
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6 q-mb-md">
            <q-icon name="scatter_plot" class="q-mr-sm" />
            身份互动数据3D散点图
          </div>
          <div class="text-caption text-grey q-mb-md">
            X轴：点赞总数，Y轴：分享总数，Z轴：评论总数
          </div>

          <KChart
            title="身份互动数据3D散点图"
            :option="scatterPlot3DOption"
            :height="500"
            :useImageMode="true"
          />
        </q-card-section>
      </q-card>

      <!-- 词云图 -->
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6 q-mb-md">
            <q-icon name="cloud" class="q-mr-sm" />
            所有身份帖子词云
          </div>
          <div class="text-caption text-grey q-mb-md">基于所有身份的帖子内容生成的词云图</div>

          <KChart
            title="所有身份帖子词云"
            :option="wordCloudOption"
            :height="400"
            :useImageMode="true"
          />
        </q-card-section>
      </q-card>

      <!-- 按身份统计汇总 -->
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6 q-mb-md">
            <q-icon name="people" class="q-mr-sm" />
            按身份统计汇总
          </div>
          <div class="text-caption text-grey q-mb-md">所有选中身份的详细统计信息</div>

          <div class="q-gutter-lg">
            <div
              v-for="identity in analysisResults.filteredPostViewListGroupByIdentity"
              :key="identity.name"
              class="identity-section"
            >
              <q-card flat bordered>
                <q-card-section>
                  <div class="row items-center q-mb-md">
                    <div class="text-h6 q-ma-none">{{ identity.name }}</div>
                    <q-chip
                      color="info"
                      text-color="white"
                      icon="article"
                      :label="`${identity.postViewList.length} 个帖子`"
                      class="q-ml-sm"
                    />
                  </div>

                  <!-- 使用 AppPostListStatistics 组件显示详细统计 -->
                  <AppPostListStatistics
                    :query="query"
                    :postViewList="identity.postViewList"
                    :cutWordCache="[]"
                    :useImageMode="true"
                    :key="'identity-stats-' + identity.name"
                  />
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import KChart from 'src/pages/components/KChart.vue';
import AppPostListStatistics from 'src/pages/components/PostListStatistics.vue';
import * as Spec from 'src/specification';
import { QueryInterface } from 'src/query';

interface AnalysisResults {
  filteredAllPostView: Array<Spec.PostView.Type>;
  filteredPostViewListGroupByIdentity: Array<{
    name: string;
    postViewList: Array<Spec.PostView.Type>;
  }>;
}

const props = defineProps<{
  analysisResults: AnalysisResults | null;
  query: QueryInterface;
}>();

// 影响力评分权重配置
const WEIGHT_CONFIG = {
  like: 1.0, // 点赞权重
  share: 3.0, // 分享权重（分享比点赞影响更大）
  comment: 2.0, // 评论权重
};

// 获取身份统计数据
const getIdentityStats = (identity: { name: string; postViewList: Array<Spec.PostView.Type> }) => {
  let totalLike = 0;
  let totalShare = 0;
  let totalComment = 0;

  identity.postViewList.forEach((postView) => {
    // 获取最新的存档数据
    const latestArchive = postView.archive[postView.archive.length - 1];
    if (latestArchive) {
      totalLike += latestArchive.like || 0;
      totalShare += latestArchive.share || 0;
      totalComment += latestArchive.comment || 0;
    }
  });

  return {
    like: totalLike,
    share: totalShare,
    comment: totalComment,
  };
};

// 身份排行榜数据
const identityRankingData = computed(() => {
  if (!props.analysisResults) return [];

  const rankingData = props.analysisResults.filteredPostViewListGroupByIdentity.map((identity) => {
    const stats = getIdentityStats(identity);

    // 计算加权评分
    const score =
      stats.like * WEIGHT_CONFIG.like +
      stats.share * WEIGHT_CONFIG.share +
      stats.comment * WEIGHT_CONFIG.comment;

    return {
      name: identity.name,
      postCount: identity.postViewList.length,
      like: stats.like,
      share: stats.share,
      comment: stats.comment,
      score: score,
    };
  });

  // 按评分降序排序并添加排名
  return rankingData
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
});

// 排行榜表格列配置
const rankingColumns = [
  {
    name: 'rank',
    label: '排名',
    field: 'rank',
    align: 'center' as const,
    sortable: true,
    style: 'width: 80px',
  },
  {
    name: 'name',
    label: '身份名称',
    field: 'name',
    align: 'left' as const,
    sortable: true,
  },
  {
    name: 'score',
    label: '影响力评分',
    field: 'score',
    align: 'center' as const,
    sortable: true,
    style: 'width: 120px',
  },
  {
    name: 'like',
    label: '点赞总数',
    field: 'like',
    align: 'center' as const,
    sortable: true,
    style: 'width: 100px',
  },
  {
    name: 'share',
    label: '分享总数',
    field: 'share',
    align: 'center' as const,
    sortable: true,
    style: 'width: 100px',
  },
  {
    name: 'comment',
    label: '评论总数',
    field: 'comment',
    align: 'center' as const,
    sortable: true,
    style: 'width: 100px',
  },
  {
    name: 'postCount',
    label: '帖子数量',
    field: 'postCount',
    align: 'center' as const,
    sortable: true,
    style: 'width: 100px',
  },
];

// 获取排名颜色
const getRankColor = (rank: number) => {
  if (rank === 1) return 'amber';
  if (rank === 2) return 'grey-6';
  if (rank === 3) return 'deep-orange';
  if (rank <= 5) return 'blue';
  return 'grey-5';
};

// 3D散点图配置
const scatterPlot3DOption = computed(() => {
  if (!props.analysisResults) return {};

  const scatterData = props.analysisResults.filteredPostViewListGroupByIdentity.map((identity) => {
    const stats = getIdentityStats(identity);
    return {
      name: identity.name,
      value: [stats.like, stats.share, stats.comment],
      itemStyle: {
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      },
    };
  });

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data;
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${data.name}</div>
            <div>点赞: ${data.value[0]}</div>
            <div>分享: ${data.value[1]}</div>
            <div>评论: ${data.value[2]}</div>
          </div>
        `;
      },
    },
    xAxis3D: {
      name: '点赞总数',
      type: 'value',
    },
    yAxis3D: {
      name: '分享总数',
      type: 'value',
    },
    zAxis3D: {
      name: '评论总数',
      type: 'value',
    },
    grid3D: {
      viewControl: {
        autoRotate: true,
        autoRotateSpeed: 2,
      },
      environment: 'auto',
      light: {
        main: {
          intensity: 1,
          shadow: true,
        },
        ambient: {
          intensity: 0.3,
        },
      },
    },
    series: [
      {
        type: 'scatter3D',
        data: scatterData,
        symbolSize: 12,
        emphasis: {
          itemStyle: {
            borderColor: '#000',
            borderWidth: 2,
          },
        },
      },
    ],
  };
});

// 词云图配置
const wordCloudOption = computed(() => {
  if (!props.analysisResults) return {};

  // 收集所有帖子内容
  const allContent = props.analysisResults.filteredAllPostView
    .map((postView) => {
      const latestArchive = postView.archive[postView.archive.length - 1];
      return latestArchive?.content || '';
    })
    .join(' ');

  // 简单的词频统计（这里可以接入更复杂的分词逻辑）
  const words = allContent
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .reduce(
      (acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

  const wordCloudData = Object.entries(words)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([word, count]) => ({
      name: word,
      value: count,
    }));

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.data.name}: ${params.data.value}`;
      },
    },
    series: [
      {
        type: 'wordCloud',
        sizeRange: [12, 60],
        rotationRange: [-90, 90],
        rotationStep: 45,
        gridSize: 8,
        shape: 'pentagon',
        width: '100%',
        height: '100%',
        drawOutOfBound: false,
        textStyle: {
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          color: () => {
            return `hsl(${Math.random() * 360}, 70%, 60%)`;
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
  };
});
</script>

<style scoped>
.report-generator {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.identity-section {
  margin-bottom: 24px;
}

.identity-section:last-child {
  margin-bottom: 0;
}
</style>
