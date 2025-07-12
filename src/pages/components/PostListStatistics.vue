<template>
  <div>
    <h2>Post List Statistics</h2>
    <p>Total Posts: {{ totalPosts }}</p>
    <p>Archived Posts: {{ archivedPosts }}</p>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AppPostListStatistics' });
import { QueryInterface } from 'src/query';
import { computed } from 'vue';
import * as Spec from 'src/specification';

const { query, postViewList } = defineProps<{
  query: QueryInterface;
  postViewList: Array<Spec.PostView.Type>;
}>();

const totalPosts = computed(() => postViewList.length);
const archivedPosts = computed(
  () => postViewList.filter((post) => post.archive.length !== 0).length,
);
</script>
