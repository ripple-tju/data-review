<template>
  <div>
    <h6>{{ title }}</h6>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const { title } = defineProps<{
  title: string;
}>();
</script>
