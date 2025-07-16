<template>
  <div class="q-pa-md">
    <div class="text-h4 q-mb-md">KChart 图片模式测试</div>

    <div class="q-mb-md">
      <q-toggle v-model="useImageMode" label="启用图片模式（节省WebGL上下文）" color="primary" />
    </div>

    <div class="row q-gutter-md">
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">柱状图示例</div>
            <div class="text-caption">
              {{ useImageMode ? '图片模式 - 静态显示' : '交互模式 - 可交互' }}
            </div>
          </q-card-section>
          <q-card-section>
            <KChart
              title="销售数据"
              :option="barChartOption"
              :height="300"
              :useImageMode="useImageMode"
            />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6">折线图示例</div>
            <div class="text-caption">
              {{ useImageMode ? '图片模式 - 静态显示' : '交互模式 - 可交互' }}
            </div>
          </q-card-section>
          <q-card-section>
            <KChart
              title="趋势分析"
              :option="lineChartOption"
              :height="300"
              :useImageMode="useImageMode"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="q-mt-md">
      <q-btn @click="updateData" color="primary" label="更新数据" icon="refresh" />
      <span class="q-ml-md text-body2"> 点击更新数据，观察图片模式下的重新渲染 </span>
    </div>

    <div class="q-mt-md">
      <q-card>
        <q-card-section>
          <div class="text-h6">使用说明</div>
          <ul class="text-body2">
            <li><strong>交互模式</strong>：图表可以缩放、平移、hover等，消耗WebGL上下文</li>
            <li>
              <strong>图片模式</strong>：图表转换为静态图片，节省WebGL上下文，适合大量图表场景
            </li>
            <li><strong>复制和下载</strong>：两种模式都支持复制到剪贴板和下载PNG图片</li>
            <li><strong>数据更新</strong>：图片模式下数据更新时会重新生成图片</li>
          </ul>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import KChart from 'src/pages/components/KChart.vue';

const useImageMode = ref(false);

// 柱状图数据
const barData = reactive({
  categories: ['一月', '二月', '三月', '四月', '五月', '六月'],
  values: [120, 200, 150, 80, 70, 110],
});

const barChartOption = reactive({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: barData.categories,
    axisTick: {
      alignWithLabel: true,
    },
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      name: '销售额',
      type: 'bar',
      data: barData.values,
      itemStyle: {
        color: '#3498db',
      },
    },
  ],
});

// 折线图数据
const lineData = reactive({
  categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  values: [820, 932, 901, 934, 1290, 1330, 1320],
});

const lineChartOption = reactive({
  tooltip: {
    trigger: 'axis',
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: lineData.categories,
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      name: '访问量',
      type: 'line',
      data: lineData.values,
      smooth: true,
      itemStyle: {
        color: '#e74c3c',
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: 'rgba(231, 76, 60, 0.3)',
            },
            {
              offset: 1,
              color: 'rgba(231, 76, 60, 0.1)',
            },
          ],
        },
      },
    },
  ],
});

// 更新数据
const updateData = () => {
  // 更新柱状图数据
  barData.values = barData.values.map(() => Math.floor(Math.random() * 300 + 50));
  if (barChartOption.series && barChartOption.series[0]) {
    barChartOption.series[0].data = barData.values;
  }

  // 更新折线图数据
  lineData.values = lineData.values.map(() => Math.floor(Math.random() * 2000 + 500));
  if (lineChartOption.series && lineChartOption.series[0]) {
    lineChartOption.series[0].data = lineData.values;
  }
};
</script>

<style scoped>
.q-card {
  height: 100%;
}
</style>
