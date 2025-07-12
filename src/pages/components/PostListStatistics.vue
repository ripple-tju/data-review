<template>
  <div>
    <q-table
      dense
      flat
      separator="cell"
      :pagination="{
        rowsPerPage: 10,
      }"
      :rows="postArchiveList"
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
      <h6>点赞</h6>
    </div>
    <div>
      <h6>分享</h6>
    </div>
    <div>
      <h6>评论</h6>
    </div>
    <div>
      <h6>每天发文量</h6>
    </div>
    <div>
      <h6>词云</h6>
    </div>
    <div>
      <h6>推文交互分布散点图</h6>
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
  return postViewList.map((post) => post.archive[0]);
});
</script>

<style lang="scss">
.fixed-layout-table {
  table {
    table-layout: fixed;
  }
}
</style>
