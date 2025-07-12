<template>
  <q-page class="column items-center justify-evenly">
    <div>
      <h3>全平台身份</h3>
      <AppPostListStatistics
        :query="query"
        :postViewList="allPostView"
        :cutWordCache="cutwordCache"
      />
    </div>
    <div v-for="(item, index) in postViewListGroupByIdentity" :key="index">
      <h3>身份：{{ item.name }}</h3>
      <AppPostListStatistics
        :query="query"
        :postViewList="item.postViewList"
        :cutWordCache="cutwordCache"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppPostListStatistics from './components/PostListStatistics.vue';
import { Query, QueryInterface } from 'src/query';
import { parseForQuery } from 'src/query/transform';
import { parseRippleForQuery } from 'src/query/transformRipple';
import * as Spec from 'src/specification';

const query = ref<QueryInterface>(Query(parseRippleForQuery([])));
const idList = ref<Array<Spec.IdentityView.Type>>([]);
const allPostView = ref<Array<Spec.PostView.Type>>([]);
const postViewListGroupByIdentity = ref<
  Array<{
    name: string;
    postViewList: Array<Spec.PostView.Type>;
  }>
>([]);
const cutwordCache = ref<
  Array<{
    id: Spec.PostArchive.Type['id'];
    cut: Array<string>;
  }>
>([]);

onMounted(async () => {
  const data = await fetch('/data/default.json')
    .then((response) => response.json())
    .catch((error) => {
      console.error('Error fetching data:', error);
    });

  const test = await fetch('/data/facebook.gen.json')
    .then((response) => response.json())
    .catch((error) => {
      console.error('Error fetching data:', error);
    });

  const cache = (await fetch('/data/archive-cutwords-cache.json')
    .then((response) => response.json())
    .catch((error) => {
      console.error('Error fetching cache:', error);
    })) as Array<{
    id: Spec.PostArchive.Type['id'];
    cut: Array<string>;
  }>;

  cutwordCache.value = cache;

  console.log('test', test);

  // query.value = Query(parseForQuery(data));
  const bb = parseRippleForQuery(test);
  console.log('bb', bb);
  const seeAllPostView = await Query(bb).Target('fb').getPostViewList();
  console.log('seeAllPostView', seeAllPostView);
  query.value = Query(parseRippleForQuery(test.slice(0, 15000)));
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
