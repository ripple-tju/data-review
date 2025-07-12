<template>
  <q-page class="column items-center justify-evenly">
    <div>
      <h3>全平台身份</h3>
      <AppPostListStatistics :query="query" :postViewList="allPostView" />
    </div>
    <div v-for="(item, index) in postViewListGroupByIdentity" :key="index">
      <h3>身份：{{ item.name }}</h3>
      <AppPostListStatistics :query="query" :postViewList="item.postViewList" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppPostListStatistics from './components/PostListStatistics.vue';
import { Query, QueryInterface } from 'src/query';
import * as Spec from 'src/specification';

const query = ref<QueryInterface>(Query([]));
const idList = ref<Array<Spec.IdentityView.Type>>([]);
const allPostView = ref<Array<Spec.PostView.Type>>([]);
const postViewListGroupByIdentity = ref<
  Array<{
    name: string;
    postViewList: Array<Spec.PostView.Type>;
  }>
>([]);

onMounted(async () => {
  const data = await fetch('/data/default.json')
    .then((response) => response.json())
    .catch((error) => {
      console.error('Error fetching data:', error);
    });

  query.value = Query(data);
  idList.value = await query.value.Target('fb').getIdentityViewList();
  allPostView.value = await query.value.Target('fb').getPostViewList();
  postViewListGroupByIdentity.value = await Promise.all(
    idList.value.map(async (id) => ({
      name: id.archive[0]?.name || 'Unknown',
      postViewList: await query.value.Target('fb').getPostViewListByIdentityId(id.identity.id),
    })),
  );
});
</script>
