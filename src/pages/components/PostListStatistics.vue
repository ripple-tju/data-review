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
      <h6>推文交互分布散点图</h6>
      {{
        latestPostArchiveList.map((post) => {
          return {
            like: post.like,
            comment: post.comment,
            id: post.id,
          };
        })
      }}
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
</script>

<style lang="scss">
.fixed-layout-table {
  table {
    table-layout: fixed;
  }
}
</style>
