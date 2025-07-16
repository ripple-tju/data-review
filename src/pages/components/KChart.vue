<template>
  <div>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h6 q-ma-none">{{ title }}</div>
      <div class="row q-gutter-sm">
        <q-btn
          size="sm"
          outline
          color="secondary"
          icon="content_copy"
          label="复制图片"
          @click="copyChart"
          :disable="!chartInstance && !chartImageUrl"
        />
        <q-btn
          size="sm"
          outline
          color="primary"
          icon="download"
          label="下载图片"
          @click="downloadChart"
          :disable="!chartInstance && !chartImageUrl"
        />
      </div>
    </div>
    <!-- 根据useImageMode决定显示图片还是图表 -->
    <div v-if="useImageMode && chartImageUrl" class="full-width">
      <img
        :src="chartImageUrl"
        :alt="title"
        class="full-width"
        :style="{ height: height + 'px', objectFit: 'contain' }"
      />
    </div>
    <div v-else ref="chartRef" class="full-width" :style="{ height: height + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts';
import 'echarts-gl'; // 引入3D图表支持
import 'echarts-wordcloud'; // 引入词云图支持
import type { EChartsOption } from 'echarts';
import { useQuasar } from 'quasar';

const props = defineProps<{
  title: string;
  option: any; // 支持包括3D图表在内的所有ECharts选项
  height?: number;
  useImageMode?: boolean; // 新增：是否使用图片模式，默认为false
}>();

const $q = useQuasar();

const chartRef = ref<HTMLDivElement>();
const chartInstance = ref<echarts.ECharts | null>(null);
const chartImageUrl = ref<string | null>(null); // 新增：图片URL

const height = props.height || 400;

const initChart = () => {
  if (chartRef.value && !chartInstance.value) {
    chartInstance.value = echarts.init(chartRef.value);
    chartInstance.value.setOption(props.option);

    // 如果启用了图片模式，生成图片并销毁图表实例
    if (props.useImageMode) {
      generateChartImage();
    }
  }
};

// 新增：生成图片并销毁图表实例以节省WebGL上下文
const generateChartImage = () => {
  if (chartInstance.value) {
    // 等待图表完全渲染
    setTimeout(() => {
      if (chartInstance.value) {
        // 生成图片
        chartImageUrl.value = chartInstance.value.getDataURL({
          type: 'png',
          pixelRatio: 2, // 提高图片质量
          backgroundColor: '#fff', // 设置背景色为白色
        });

        // 销毁图表实例以释放WebGL上下文
        chartInstance.value.dispose();
        chartInstance.value = null;

        console.log('📊 [KChart] 图表已转换为图片，WebGL上下文已释放');
      }
    }, 100);
  }
};

const resizeChart = () => {
  if (chartInstance.value) {
    chartInstance.value.resize();
  }
};

const downloadChart = () => {
  // 如果是图片模式且有图片URL，直接下载图片
  if (props.useImageMode && chartImageUrl.value) {
    const link = document.createElement('a');
    link.href = chartImageUrl.value;
    link.download = `${props.title}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // 原有的图表下载逻辑
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
  try {
    let imageUrl: string;

    // 如果是图片模式且有图片URL，直接使用
    if (props.useImageMode && chartImageUrl.value) {
      imageUrl = chartImageUrl.value;
    } else if (chartInstance.value) {
      // 原有的图表复制逻辑
      imageUrl = chartInstance.value.getDataURL({
        type: 'png',
        pixelRatio: 2, // 提高图片质量
        backgroundColor: '#fff', // 设置背景色为白色
      });
    } else {
      throw new Error('没有可复制的图表或图片');
    }

    // 将 data URL 转换为 Blob
    const response = await fetch(imageUrl);
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
  // 清理图片URL
  if (chartImageUrl.value) {
    // 如果是blob URL，需要释放
    if (chartImageUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(chartImageUrl.value);
    }
    chartImageUrl.value = null;
  }
  window.removeEventListener('resize', resizeChart);
});

watch(
  () => props.option,
  (newOption) => {
    if (props.useImageMode) {
      // 图片模式下，重新创建图表并生成图片
      if (chartRef.value) {
        // 清理旧的图片URL
        if (chartImageUrl.value && chartImageUrl.value.startsWith('blob:')) {
          URL.revokeObjectURL(chartImageUrl.value);
        }
        chartImageUrl.value = null;

        // 重新创建图表实例
        chartInstance.value = echarts.init(chartRef.value);
        chartInstance.value.setOption(newOption);
        generateChartImage();
      }
    } else if (chartInstance.value) {
      // 原有的图表更新逻辑
      chartInstance.value.setOption(newOption, true);
    }
  },
  { deep: true },
);
</script>
