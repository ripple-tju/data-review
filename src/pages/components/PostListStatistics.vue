<template>
  <div>
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
      <template #body-cell-createdAt="props">
        <q-td :props="props">{{ dayjs(props.row.createdAt).format(Spec.DateFormatTemplate) }}</q-td>
      </template>
      <template #body-cell-capturedAt="props">
        <q-td :props="props">{{
          dayjs(props.row.capturedAt).format(Spec.DateFormatTemplate)
        }}</q-td>
      </template>
    </q-table>
    <div>
      <AppKChart title="点赞趋势" :option="likeOption" :height="300" />
    </div>
    <div>
      <AppKChart title="分享趋势" :option="shareOption" :height="300" />
    </div>
    <div>
      <AppKChart title="评论趋势" :option="commentOption" :height="300" />
    </div>
    <div>
      <AppKChart title="点赞、分享、评论趋势对比" :option="interactionTrendOption" :height="400" />
    </div>
    <div>
      <AppKChart title="每天发文量" :option="postCountOption" :height="300" />
    </div>
    <div>
      <h6>词云</h6>
    </div>
    <div>
      <AppKChart title="推文交互分布散点图 (点赞 vs 评论)" :option="scatterOption" :height="500" />
    </div>
    <div>
      <AppKChart title="推文交互分布热力图 (点赞 vs 评论)" :option="heatmapOption" :height="500" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AppPostListStatistics' });

import z from 'zod';
import dayjs from 'dayjs';
import AppKChart from './KChart.vue';
import { QueryInterface } from 'src/query';
import { computed, ref } from 'vue';
import * as Spec from 'src/specification';
import { divideByDay } from 'src/query/utils';
import type { EChartsOption } from 'echarts';

const LabelMap = {
  'specification.data.PostArchive.content': '推文内容',
  'specification.data.PostArchive.like': '点赞',
  'specification.data.PostArchive.likeGrowthRate': '点赞增速',
  'specification.data.PostArchive.share': '分享',
  'specification.data.PostArchive.shareGrowthRate': '分享增速',
  'specification.data.PostArchive.comment': '评论',
  'specification.data.PostArchive.commentGrowthRate': '评论增速',
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
  author: Spec.IdentityArchive.Schema.optional(),
  authorId: Spec.Identity.Schema.shape.id.optional().describe('身份ID'),
  authorName: Spec.IdentityArchive.Schema.shape.name.optional().describe('身份名称'),
});

export type ViewDataType = z.infer<typeof ViewDataSchema>;
type Key = keyof typeof ViewDataSchema.shape;

const defaultOrder: Array<Key> = [
  'content',
  'like',
  'share',
  'comment',
  'likeGrowthRate',
  'shareGrowthRate',
  'commentGrowthRate',
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

const { query, postViewList } = defineProps<{
  query: QueryInterface;
  postViewList: Array<Spec.PostView.Type>;
}>();

const postArchiveList = computed(() => {
  return postViewList.flatMap((postView) => postView.archive);
});

const latestPostArchiveList = computed(() => {
  return postViewList.map((post) => post.archive[0]!);
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

const postArchiveListDividedByDay = computed(() => {
  return divideByDay(postArchiveList.value, (postArchive) =>
    dayjs(postArchive.capturedAt).format('YYYY-MM-DD'),
  );
});

const totalStatsDivided = computed(() => {
  return postArchiveListDividedByDay.value.map((day) => {
    const date = day.date;
    const stat = day.itemList.reduce(
      (stats, post) => ({
        like: stats.like + (post.like ?? 0),
        share: stats.share + (post.share ?? 0),
        comment: stats.comment + (post.comment ?? 0),
      }),
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
          opacity: 0.7,
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
</script>

<style lang="scss">
.fixed-layout-table {
  table {
    table-layout: fixed;
  }
}
</style>
