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
      <AppKChart title="词云" :option="wordCloudOption" :height="400" />
    </div>
    <div>
      <AppKChart title="推文交互分布散点图 (点赞 vs 评论)" :option="scatterOption" :height="500" />
    </div>
    <div>
      <AppKChart title="推文交互分布热力图 (点赞 vs 评论)" :option="heatmapOption" :height="500" />
    </div>
    <div>
      <AppKChart
        title="推文交互分布3D散点图 (点赞 : 评论 : 分享)"
        :option="scatter3DOption"
        :height="600"
      />
    </div>
    <div>
      <AppKChart title="词云" :option="wordCloudOption" :height="400" />
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

const { query, postViewList, cutWordCache } = defineProps<{
  query: QueryInterface;
  postViewList: Array<Spec.PostView.Type>;
  cutWordCache: Array<{
    id: Spec.PostArchive.Type['id'];
    cut: Array<string>;
  }>;
}>();

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

const postArchiveList = computed(() => {
  return postViewList.flatMap((postView) => postView.archive);
});

const calcPercentageGrowth = (latest: number, earliest: number, dayCount: number) => {
  if (earliest === 0) return 0;
  const growth = (latest - earliest) / dayCount;
  // if (growth < 0) {
  //   console.log(
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
  return growth.toFixed(3);
};

const latestPostArchiveList = computed(() => {
  return postViewList.map((post) => {
    const sortedArchive = post.archive;
    // .sort(
    //   (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    // );
    const latestArchive = sortedArchive.at(0);
    const earliestArchive = sortedArchive.at(-1);

    const likeGrowthRate = calcPercentageGrowth(
      latestArchive?.like ?? 0,
      earliestArchive?.like ?? 0,
      latestArchive?.capturedAt && earliestArchive?.capturedAt
        ? (latestArchive.capturedAt.getTime() - earliestArchive.capturedAt.getTime()) /
            (1000 * 60 * 60 * 24)
        : 1, // 默认1天，避免除以0
    );
    const shareGrowthRate = calcPercentageGrowth(
      latestArchive?.share ?? 0,
      earliestArchive?.share ?? 0,
      latestArchive?.capturedAt && earliestArchive?.capturedAt
        ? (latestArchive.capturedAt.getTime() - earliestArchive.capturedAt.getTime()) /
            (1000 * 60 * 60 * 24)
        : 1, // 默认1天，避免除以0
    );
    const commentGrowthRate = calcPercentageGrowth(
      latestArchive?.comment ?? 0,
      earliestArchive?.comment ?? 0,
      latestArchive?.capturedAt && earliestArchive?.capturedAt
        ? (latestArchive.capturedAt.getTime() - earliestArchive.capturedAt.getTime()) /
            (1000 * 60 * 60 * 24)
        : 1, // 默认1天，避免除以0
    );

    return {
      ...latestArchive,
      likeGrowthRate,
      shareGrowthRate,
      commentGrowthRate,
    };
  });
});

const latestPostArchiveCutWordList = computed(() => {
  return latestPostArchiveList.value.map((post) => {
    const cut = cutWordCache.find((item) => item.id === post.id)?.cut || [];
    return {
      ...post,
      cut,
    };
  });
});

const wordOccurrence = computed(() => {
  console.time('wordOccurrence');
  const groupByed = Object.groupBy(
    latestPostArchiveCutWordList.value
      .flatMap((post) => post.cut)
      .filter((word) => {
        // 过滤长度、URL、@用户名
        if (word.length <= 1 || word.startsWith('http') || word.startsWith('@')) {
          return false;
        }

        // 过滤中英文标点符号
        const punctuationRegex =
          /^[\u3000-\u303F\uFF00-\uFFEF\u2000-\u206F\u0020-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]+$/;
        if (punctuationRegex.test(word)) {
          return false;
        }

        // 过滤纯数字
        if (/^\d+$/.test(word)) {
          return false;
        }

        return true;
      }),
    (word) => word,
  );
  console.timeEnd('wordOccurrence');

  return Object.entries(groupByed).map(([word, occurrences]) => ({
    word,
    count: occurrences?.length ?? 0,
  }));
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
</style>
