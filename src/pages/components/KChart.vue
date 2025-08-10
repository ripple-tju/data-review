<template>
  <div class="k-chart-container">
    <div class="row items-center justify-between q-mb-md">
      <!-- 暂时隐藏标题 -->
      <!-- <div class="text-h6 q-ma-none">{{ title }}</div> -->
      <div class="text-h6 q-ma-none"></div>
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

    <!-- 图片生成提示 -->
    <div v-if="imageGenerating" class="image-generating-hint">
      <q-icon name="image" class="q-mr-xs" />
      正在生成图片...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import 'echarts-gl'; // 引入3D图表支持
import 'echarts-wordcloud'; // 引入词云图支持
import type { EChartsOption } from 'echarts';
import { useQuasar } from 'quasar';

// 导入调试工具
import { debugLog, debugWarn, debugError } from 'src/utils/debug';

const props = defineProps<{
  title: string;
  option: any; // 支持包括3D图表在内的所有ECharts选项
  height?: number;
  useImageMode?: boolean; // 新增：是否使用图片模式，默认为false
}>();

// 定义事件发射器
const emit = defineEmits<{
  rendered: [];
}>();

const $q = useQuasar();

const chartRef = ref<HTMLDivElement>();
const chartInstance = ref<echarts.ECharts | null>(null);
const chartImageUrl = ref<string | null>(null); // 新增：图片URL
const imageGenerating = ref<boolean>(false); // 新增：图片生成状态

const height = props.height || 400;

const initChart = () => {
  if (chartRef.value && !chartInstance.value) {
    chartInstance.value = echarts.init(chartRef.value);
    chartInstance.value.setOption(props.option);

    // 如果启用了图片模式，生成图片并销毁图表实例
    if (props.useImageMode) {
      generateChartImage();
    } else {
      // 如果不是图片模式，图表初始化完成后发射 rendered 事件
      nextTick(() => {
        emit('rendered');
      }).catch(debugError);
    }
  }
};

// 新增：生成图片并销毁图表实例以节省WebGL上下文
const generateChartImage = () => {
  if (chartInstance.value) {
    imageGenerating.value = true; // 开始生成图片

    // 等待图表完全渲染 - 使用多重检查机制
    const waitForRender = () => {
      return new Promise<void>((resolve) => {
        let attempts = 0;
        const maxAttempts = 100; // 最多等待10秒
        const startTime = Date.now();

        const checkRender = () => {
          attempts++;
          const elapsed = Date.now() - startTime;

          if (!chartInstance.value) {
            resolve();
            return;
          }

          // 检查图表是否已经渲染完成
          // 1. 检查是否有可见的DOM元素
          const chartDom = chartInstance.value.getDom();
          if (!chartDom || chartDom.offsetWidth === 0 || chartDom.offsetHeight === 0) {
            if (attempts < maxAttempts) {
              setTimeout(checkRender, 100);
              return;
            }
          }

          // 2. 检查是否有series数据
          const option = chartInstance.value.getOption();
          if (
            !option ||
            !option.series ||
            !Array.isArray(option.series) ||
            option.series.length === 0
          ) {
            if (attempts < maxAttempts) {
              setTimeout(checkRender, 100);
              return;
            }
          }

          // 3. 对于3D图表，额外等待一段时间确保WebGL渲染完成
          const has3DSeries =
            Array.isArray(option.series) &&
            option.series.some(
              (series: any) =>
                series &&
                series.type &&
                (series.type.includes('3D') || series.type === 'scatter3D'),
            );

          if (has3DSeries && attempts < 5) {
            setTimeout(checkRender, 500);
            return;
          }

          // 4. 对于词云图，检查是否有wordCloud类型
          const hasWordCloud =
            Array.isArray(option.series) &&
            option.series.some((series: any) => series && series.type === 'wordCloud');

          if (hasWordCloud && attempts < 3) {
            setTimeout(checkRender, 600);
            return;
          }

          // 5. 根据图表类型设置最小等待时间
          let minWaitTime = 1000; // 普通图表最少等待1秒
          if (has3DSeries) {
            minWaitTime = 4000; // 3D图表最少等待4秒
          } else if (hasWordCloud) {
            minWaitTime = 5000; // 词云图最少等待5秒
          }

          if (elapsed < minWaitTime) {
            setTimeout(checkRender, minWaitTime - elapsed);
            return;
          }

          resolve();
        };

        checkRender();
      });
    };

    void waitForRender()
      .then(() => {
        if (chartInstance.value) {
          try {
            // 生成高质量图片
            chartImageUrl.value = chartInstance.value.getDataURL({
              type: 'png',
              pixelRatio: 3, // 进一步提高图片质量，适合PDF打印
              backgroundColor: '#fff', // 设置背景色为白色
            });

            // 销毁图表实例以释放WebGL上下文
            chartInstance.value.dispose();
            chartInstance.value = null;

            debugLog('📊 [KChart] 图表已转换为图片，WebGL上下文已释放');
          } catch (error) {
            debugError('📊 [KChart] 图片生成失败:', error);
            // 即使生成失败，也要清理图表实例
            if (chartInstance.value) {
              chartInstance.value.dispose();
              chartInstance.value = null;
            }
          } finally {
            imageGenerating.value = false; // 结束生成图片状态
            // 图片生成完成后发射 rendered 事件
            emit('rendered');
          }
        }
      })
      .catch((error) => {
        debugError('📊 [KChart] 等待渲染失败:', error);
        // 确保清理图表实例
        if (chartInstance.value) {
          chartInstance.value.dispose();
          chartInstance.value = null;
        }
        imageGenerating.value = false; // 结束生成图片状态
        // 即使失败也要发射 rendered 事件，防止阻塞后续渲染
        emit('rendered');
      });
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
      pixelRatio: 3, // 进一步提高图片质量，适合PDF打印
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
        pixelRatio: 3, // 进一步提高图片质量，适合PDF打印
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
    debugError('复制到剪贴板失败:', error);

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

        // 等待一个tick确保setOption完成
        setTimeout(() => {
          generateChartImage();
        }, 0);
      }
    } else if (chartInstance.value) {
      // 原有的图表更新逻辑
      chartInstance.value.setOption(newOption, true);
    }
  },
  { deep: true },
);
</script>

<style scoped>
.k-chart-container {
  position: relative;
}

.image-generating-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
  z-index: 100;
}

.image-generating-hint .q-icon {
  font-size: 16px;
  color: #2196f3;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
</style>
