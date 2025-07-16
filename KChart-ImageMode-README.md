# KChart 组件 - 图片模式使用说明

## 概述

KChart 组件现在支持图片模式，通过 `useImageMode` prop 可以启用此功能。启用后，组件会在图表渲染完成后自动将其转换为图片显示，并销毁原图表实例以释放 WebGL 上下文。

## 新增功能

### Props

- `useImageMode?: boolean` - 是否使用图片模式，默认为 `false`

### 行为变化

1. **图片模式启用时 (`useImageMode: true`)**:
   - 图表渲染完成后自动转换为高质量PNG图片
   - 销毁ECharts实例以释放WebGL上下文
   - 显示图片而不是交互式图表
   - 复制和下载功能仍然可用

2. **图片模式禁用时 (`useImageMode: false`，默认)**:
   - 保持原有的交互式图表行为
   - 图表可以交互（缩放、平移等）
   - 实时更新和动画效果正常

## 使用示例

### 基本使用（交互式图表）

\`\`\`vue
<template>
<KChart
    title="交互式柱状图"
    :option="chartOption"
    :height="400"
  />
</template>
\`\`\`

### 图片模式使用（节省WebGL上下文）

\`\`\`vue
<template>
<KChart
    title="静态柱状图"
    :option="chartOption"
    :height="400"
    :useImageMode="true"
  />
</template>
\`\`\`

### 条件使用图片模式

\`\`\`vue
<template>
<KChart
    title="条件图表"
    :option="chartOption"
    :height="400"
    :useImageMode="shouldUseImageMode"
  />
</template>

<script setup>
import { computed } from 'vue';

// 根据图表数量决定是否使用图片模式
const chartCount = ref(10);
const shouldUseImageMode = computed(() => chartCount.value > 5);
</script>

\`\`\`

## 适用场景

### 推荐使用图片模式的场景：

1. **大量图表展示** - 当页面需要显示多个图表时
2. **静态报表** - 图表主要用于展示，不需要交互
3. **WebGL上下文限制** - 浏览器WebGL上下文有限制时
4. **性能优化** - 需要减少内存占用和提高页面性能

### 不推荐使用图片模式的场景：

1. **需要交互** - 图表需要缩放、平移、点击等交互
2. **实时更新** - 图表数据需要频繁更新
3. **动画效果** - 需要图表动画和过渡效果
4. **少量图表** - 页面只有少量图表，WebGL上下文足够

## 技术细节

### 图片生成过程

1. ECharts实例正常创建和渲染
2. 等待100ms确保图表完全渲染
3. 调用 `getDataURL()` 生成高质量PNG图片
4. 销毁ECharts实例释放WebGL上下文
5. 显示生成的图片

### 内存管理

- 图片URL会在组件销毁时自动清理
- Blob URL会正确释放避免内存泄漏
- 图表实例会及时销毁释放WebGL上下文

### 性能优化

- 图片使用2倍像素比确保高清显示
- 设置白色背景确保图片清晰
- 使用 `object-fit: contain` 确保图片正确缩放

## 注意事项

1. **选项更新**: 图片模式下，当props.option更新时，会重新创建图表并生成新图片
2. **复制和下载**: 图片模式下仍然支持复制和下载功能
3. **WebGL上下文**: 图片模式主要用于节省WebGL上下文，适合有大量图表的场景
4. **交互性**: 图片模式下图表失去所有交互能力，请根据需求选择使用
