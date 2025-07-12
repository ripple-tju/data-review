<template>
  <div>
    <div
      style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      "
    >
      <h6 style="margin: 0">{{ title }}</h6>
      <div style="display: flex; gap: 8px">
        <q-btn
          size="sm"
          outline
          color="secondary"
          icon="content_copy"
          label="复制图片"
          @click="copyChart"
          :disable="!chartInstance"
        />
        <q-btn
          size="sm"
          outline
          color="primary"
          icon="download"
          label="下载图片"
          @click="downloadChart"
          :disable="!chartInstance"
        />
      </div>
    </div>
    <div ref="chartRef" :style="{ width: '100%', height: height + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { useQuasar } from 'quasar';

const props = defineProps<{
  title: string;
  option: EChartsOption;
  height?: number;
}>();

const $q = useQuasar();

const chartRef = ref<HTMLDivElement>();
const chartInstance = ref<echarts.ECharts | null>(null);

const height = props.height || 400;

const initChart = () => {
  if (chartRef.value && !chartInstance.value) {
    chartInstance.value = echarts.init(chartRef.value);
    chartInstance.value.setOption(props.option);
  }
};

const resizeChart = () => {
  if (chartInstance.value) {
    chartInstance.value.resize();
  }
};

const downloadChart = () => {
  if (chartInstance.value) {
    const url = chartInstance.value.getDataURL({
      type: 'png',
      pixelRatio: 2, // 提高图片质量
      backgroundColor: '#fff', // 设置背景色为白色
    });

    // 创建下载链接
    const link = document.createElement('a');
    link.href = url;
    link.download = `${props.title}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const copyChart = async () => {
  if (chartInstance.value) {
    try {
      const url = chartInstance.value.getDataURL({
        type: 'png',
        pixelRatio: 2, // 提高图片质量
        backgroundColor: '#fff', // 设置背景色为白色
      });

      // 将 data URL 转换为 Blob
      const response = await fetch(url);
      const blob = await response.blob();

      // 使用 Clipboard API 复制图片
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      // 显示成功通知
      $q.notify({
        type: 'positive',
        message: '图片已复制到剪贴板',
        icon: 'content_copy',
        position: 'top',
        timeout: 2000,
      });
    } catch (error) {
      console.error('复制到剪贴板失败:', error);

      // 显示错误通知
      $q.notify({
        type: 'negative',
        message: '复制失败，请稍后重试',
        icon: 'error',
        position: 'top',
        timeout: 3000,
      });
    }
  }
};

onMounted(() => {
  initChart();
  window.addEventListener('resize', resizeChart);
});

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.dispose();
    chartInstance.value = null;
  }
  window.removeEventListener('resize', resizeChart);
});

watch(
  () => props.option,
  (newOption) => {
    if (chartInstance.value) {
      chartInstance.value.setOption(newOption, true);
    }
  },
  { deep: true },
);
</script>
