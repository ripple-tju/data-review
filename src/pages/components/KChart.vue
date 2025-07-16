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
    <div ref="chartRef" class="full-width" :style="{ height: height + 'px' }"></div>
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
}>();

const $q = useQuasar();

const chartRef = ref<HTMLDivElement>();
const chartInstance = ref<echarts.ECharts | null>(null);

const height = props.height || 400;

const initChart = () => {
  console.log(`📊 [KChart] 开始初始化图表: ${props.title}`, {
    hasChartRef: !!chartRef.value,
    hasInstance: !!chartInstance.value,
  });

  if (chartRef.value && !chartInstance.value) {
    chartInstance.value = echarts.init(chartRef.value);
    chartInstance.value.setOption(props.option);
    console.log(`📊 [KChart] 图表初始化完成: ${props.title}`);
    console.log(`📊 [KChart] 图表实例详情:`, {
      title: props.title,
      instanceExists: !!chartInstance.value,
      instanceType: typeof chartInstance.value,
      hasGetDataURL: chartInstance.value && typeof chartInstance.value.getDataURL === 'function',
      hasResize: chartInstance.value && typeof chartInstance.value.resize === 'function',
      hasDispose: chartInstance.value && typeof chartInstance.value.dispose === 'function',
      instanceId: chartInstance.value?.id || 'unknown',
      dom: chartInstance.value?.getDom() || null,
      width: chartInstance.value?.getWidth() || 0,
      height: chartInstance.value?.getHeight() || 0,
    });
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

// Method to get chart instance for PDF export
const getChart = () => {
  console.log(`📊 [KChart] 获取图表实例: ${props.title}`, {
    hasInstance: !!chartInstance.value,
    instanceType: typeof chartInstance.value,
  });

  // 确保图表已完全渲染
  if (chartInstance.value) {
    try {
      // 先调用resize确保图表完全渲染
      chartInstance.value.resize();

      // 验证图表是否有必要的方法
      if (typeof chartInstance.value.getDataURL === 'function') {
        console.log(`📊 [KChart] 图表实例验证通过: ${props.title}`);
      } else {
        console.warn(`📊 [KChart] 图表实例缺少getDataURL方法: ${props.title}`);
      }

      // 详细的图表实例信息
      console.log(`📊 [KChart] 图表实例状态:`, {
        title: props.title,
        instanceId: chartInstance.value.id,
        isDisposed: chartInstance.value.isDisposed?.() || false,
        width: chartInstance.value.getWidth(),
        height: chartInstance.value.getHeight(),
        dom: !!chartInstance.value.getDom(),
        canvasContext: !!chartInstance.value.getRenderedCanvas?.(),
      });
    } catch (error) {
      console.warn(`📊 [KChart] 图表resize失败: ${props.title}`, error);
    }
  } else {
    console.warn(`📊 [KChart] 图表实例不存在: ${props.title}`);
  }

  return chartInstance.value;
};

// Expose methods to parent component
defineExpose({
  getChart,
});

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
