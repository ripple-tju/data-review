<template>
  <q-page class="row items-center justify-evenly">
    {{ idList.map((id) => id.archive[0]?.name).join(', ') }}
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Todo, Meta } from 'components/models';
import ExampleComponent from 'components/ExampleComponent.vue';
import { Query } from 'src/query';
import * as Spec from 'src/specification';

const query = ref(Query([]));
const idList = ref<Array<Spec.IdentityView.Type>>([]);

onMounted(async () => {
  const data = await fetch('/data/default.json')
    .then((response) => response.json())
    .catch((error) => {
      console.error('Error fetching data:', error);
    });

  query.value = Query(data);
  idList.value = await query.value.Target('fb').getIdentityViewList();
});

const meta = ref<Meta>({
  totalCount: 1200,
});
</script>
