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
      :hide-pagination="true"
      class="fixed-layout-table"
    ></q-table>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AppPostListStatistics' });
import { QueryInterface } from 'src/query';
import { computed, ref } from 'vue';
import * as Spec from 'src/specification';
import z from 'zod';

const ViewDataSchema = Spec.PostArchive.Schema.extend({
  author: Spec.IdentityArchive.Schema.optional(),
  authorId: Spec.Identity.Schema.shape.id.describe('身份ID').optional(),
  authorName: Spec.IdentityArchive.Schema.shape.name.describe('身份名称').optional(),
});

export type ViewDataType = z.infer<typeof ViewDataSchema>;
type Key = keyof typeof ViewDataSchema.shape;

const defaultOrder: Array<Key> = ['like', 'share', 'comment', 'view', 'favorite', 'createdAt'];
const order = ref<Array<Key>>(defaultOrder);

const _columns = [
  {
    name: 'authorName',
    align: 'left' as const,
  },
  {
    name: 'content',
    align: 'left' as const,
  },
  {
    name: 'like',
    headerStyle: 'width: 80px;',
  },
  {
    name: 'share',
    headerStyle: 'width: 60px;',
  },
  {
    name: 'comment',
    headerStyle: 'width: 60px;',
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
];

const columns = Object.entries(ViewDataSchema.shape)
  .filter(([key]) => order.value.includes(key as Key))
  .sort(([a], [b]) => order.value.indexOf(a as Key) - order.value.indexOf(b as Key))
  .map(([key, value]) => {
    const column = _columns.find((item) => item.name === key);
    return {
      name: key,
      label: value.description!,
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

const totalPosts = computed(() => postViewList.length);
const archivedPosts = computed(
  () => postViewList.filter((post) => post.archive.length !== 0).length,
);
</script>
