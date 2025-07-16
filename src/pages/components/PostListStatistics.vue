<template>
  <div>
    <!-- 推文排行 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">推文排行</div>

      <q-table
        dense
        flat
        separator="cell"
        :pagination="{
          rowsPerPage: 10,
        }"
        :rows="latestPostArchiveList"
        :columns="columns"
        class="fixed-layout-table"
      >
        <template #body-cell-createdAt="props">
          <q-td :props="props">{{
            dayjs(props.row.createdAt).format(Spec.DateFormatTemplate)
          }}</q-td>
        </template>
        <template #body-cell-capturedAt="props">
          <q-td :props="props">{{
            dayjs(props.row.capturedAt).format(Spec.DateFormatTemplate)
          }}</q-td>
        </template>
      </q-table>

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-blue-1">
          <div class="text-subtitle2 q-mb-sm">📝 推文排行批注</div>
          <q-input
            v-model="annotations.table.content"
            type="textarea"
            label="在此输入关于推文排行的分析和观察..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：观察到某些帖子的互动数据异常高，可能与热点事件相关..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 身份排行表 -->
    <div class="q-mb-lg" v-if="identityRankingList.length > 1">
      <div class="text-h6 q-mb-md">身份影响力排行</div>

      <q-table
        dense
        flat
        separator="cell"
        :pagination="{
          rowsPerPage: 15,
        }"
        :rows="identityRankingList"
        :columns="identityColumns"
        class="fixed-layout-table"
      >
        <template #body-cell-rank="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.rank <= 3 ? 'amber' : 'grey-6'"
              :text-color="props.row.rank <= 3 ? 'black' : 'white'"
              :label="props.row.rank"
            />
          </q-td>
        </template>
        <template #body-cell-authorName="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.authorName }}</div>
          </q-td>
        </template>
        <template #body-cell-influenceScore="props">
          <q-td :props="props">
            <div class="text-weight-bold text-primary">{{ props.row.influenceScore }}</div>
          </q-td>
        </template>
      </q-table>

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-indigo-1">
          <div class="text-subtitle2 q-mb-sm">🏆 身份影响力排行批注</div>
          <q-input
            v-model="annotations.identityRanking.content"
            type="textarea"
            label="在此输入关于身份影响力排行的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：排名前三的身份在互动数据上明显领先，可能是核心意见领袖..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 点赞趋势图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">点赞趋势分析</div>

      <AppKChart
        data-chart="like-trend"
        title="点赞趋势"
        :option="likeOption"
        :height="300"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-red-1">
          <div class="text-subtitle2 q-mb-sm">❤️ 点赞趋势分析批注</div>
          <q-input
            v-model="annotations.like.content"
            type="textarea"
            label="在此输入关于点赞趋势的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：点赞数在X月X日达到峰值，可能与某个热点话题相关..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 分享趋势图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">分享趋势分析</div>

      <AppKChart
        data-chart="share-trend"
        title="分享趋势"
        :option="shareOption"
        :height="300"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-teal-1">
          <div class="text-subtitle2 q-mb-sm">🔄 分享趋势分析批注</div>
          <q-input
            v-model="annotations.share.content"
            type="textarea"
            label="在此输入关于分享趋势的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：分享数波动较大，说明内容传播性存在差异..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 评论趋势图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">评论趋势分析</div>

      <AppKChart
        data-chart="comment-trend"
        title="评论趋势"
        :option="commentOption"
        :height="300"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-orange-1">
          <div class="text-subtitle2 q-mb-sm">💬 评论趋势分析批注</div>
          <q-input
            v-model="annotations.comment.content"
            type="textarea"
            label="在此输入关于评论趋势的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：评论数与点赞数呈正相关，说明用户参与度较高..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 发文量统计 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">发文量统计</div>

      <AppKChart
        data-chart="post-count"
        title="发文量统计"
        :option="postCountOption"
        :height="300"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-green-1">
          <div class="text-subtitle2 q-mb-sm">📊 发文量统计批注</div>
          <q-input
            v-model="annotations.postCount.content"
            type="textarea"
            label="在此输入关于发文量统计的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：发文量在周末时段较高，平日较为平稳..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 交互分布散点图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">交互分布散点图</div>

      <AppKChart
        data-chart="scatter-plot"
        title="交互分布散点图"
        :option="scatterOption"
        :height="400"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-purple-1">
          <div class="text-subtitle2 q-mb-sm">🎯 交互分布散点图批注</div>
          <q-input
            v-model="annotations.scatter.content"
            type="textarea"
            label="在此输入关于交互分布散点图的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：散点图显示点赞数与评论数存在明显的聚类现象..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 交互分布热力图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">交互分布热力图</div>

      <AppKChart
        data-chart="heatmap"
        title="交互分布热力图"
        :option="heatmapOption"
        :height="400"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-yellow-1">
          <div class="text-subtitle2 q-mb-sm">🔥 交互分布热力图批注</div>
          <q-input
            v-model="annotations.heatmap.content"
            type="textarea"
            label="在此输入关于交互分布热力图的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：热力图显示互动数据主要集中在特定时间段..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 3D散点图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">3D散点图</div>

      <AppKChart
        data-chart="scatter3d"
        title="3D散点图"
        :option="scatter3DOption"
        :height="500"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-pink-1">
          <div class="text-subtitle2 q-mb-sm">🎨 3D散点图批注</div>
          <q-input
            v-model="annotations.scatter3d.content"
            type="textarea"
            label="在此输入关于3D散点图的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：3D散点图展现出点赞、评论、分享三者的关联性..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 词云图 -->
    <div class="q-mb-lg">
      <div class="text-h6 q-mb-md">词云图</div>

      <AppKChart
        data-chart="wordcloud"
        title="词云图"
        :option="wordCloudOption"
        :height="400"
        :useImageMode="useImageMode"
        @rendered="onChartRendered"
      />

      <div class="q-mt-md">
        <q-card class="q-pa-md bg-cyan-1">
          <div class="text-subtitle2 q-mb-sm">☁️ 词云图批注</div>
          <q-input
            v-model="annotations.wordCloud.content"
            type="textarea"
            label="在此输入关于词云图的分析..."
            outlined
            rows="3"
            autogrow
            placeholder="例如：词云图反映了帖子内容的主要关键词和热点话题..."
            @update:model-value="saveAnnotationsToStorage"
          />
        </q-card>
      </div>
    </div>

    <!-- 批注汇总 -->
    <div class="q-mt-xl">
      <q-card class="q-pa-lg bg-grey-1">
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h6">
            <q-icon name="summarize" class="q-mr-sm" />
            批注汇总
          </div>
          <q-chip
            :color="filledAnnotationsCount === totalAnnotationsCount ? 'positive' : 'info'"
            text-color="white"
            icon="edit_note"
          >
            {{ filledAnnotationsCount }}/{{ totalAnnotationsCount }} 已填写
          </q-chip>
        </div>

        <div class="q-mb-md">
          <div class="text-subtitle2 q-mb-sm">批注完成度</div>
          <q-linear-progress
            :value="filledAnnotationsCount / totalAnnotationsCount"
            color="positive"
            size="8px"
            rounded
            stripe
            animation-speed="1000"
          />
        </div>

        <div class="row q-gutter-md">
          <q-btn
            color="primary"
            label="导出PDF报告"
            icon="description"
            @click="exportAnnotations"
            :disable="filledAnnotationsCount === 0"
          />
          <q-btn
            color="secondary"
            label="清空所有批注"
            icon="clear_all"
            outline
            @click="clearAllAnnotations"
            :disable="filledAnnotationsCount === 0"
          />
        </div>

        <div v-if="filledAnnotationsCount > 0" class="q-mt-md">
          <div class="text-subtitle2 q-mb-sm">批注预览</div>
          <div class="row q-gutter-sm">
            <q-chip
              v-for="(item, key) in annotations"
              :key="key"
              :color="item.content.trim() ? 'positive' : 'grey-5'"
              :text-color="item.content.trim() ? 'white' : 'grey-8'"
              :icon="item.content.trim() ? 'check_circle' : 'radio_button_unchecked'"
              size="sm"
            >
              {{ getAnnotationLabel(key) }}
            </q-chip>
          </div>
        </div>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AppPostListStatistics' });

import z from 'zod';
import dayjs from 'dayjs';
import AppKChart from './KChart.vue';
import { QueryInterface } from 'src/query';
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import * as Spec from 'src/specification';
import { divideByDay } from 'src/query/utils';
import type { EChartsOption } from 'echarts';
import { useQuasar } from 'quasar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { query, postViewList, cutWordCache, useImageMode } = defineProps<{
  query: QueryInterface;
  postViewList: Array<Spec.PostView.Type>;
  cutWordCache: Array<{
    id: Spec.PostArchive.Type['id'];
    cut: Array<string>;
  }>;
  useImageMode?: boolean; // 新增：是否使用图片模式
}>();

// 定义事件发射器
const emit = defineEmits<{
  rendered: [];
}>();

// 使用 Quasar 的 dialog 和 notify 功能
const $q = useQuasar();

// 批注数据结构
interface AnnotationItem {
  content: string;
}

const annotations = ref<{
  table: AnnotationItem;
  identityRanking: AnnotationItem;
  like: AnnotationItem;
  share: AnnotationItem;
  comment: AnnotationItem;
  postCount: AnnotationItem;
  scatter: AnnotationItem;
  heatmap: AnnotationItem;
  scatter3d: AnnotationItem;
  wordCloud: AnnotationItem;
}>({
  table: { content: '' },
  identityRanking: { content: '' },
  like: { content: '' },
  share: { content: '' },
  comment: { content: '' },
  postCount: { content: '' },
  scatter: { content: '' },
  heatmap: { content: '' },
  scatter3d: { content: '' },
  wordCloud: { content: '' },
});

// 本地存储相关
const STORAGE_KEY = 'postListStatistics_annotations';

// 保存批注到本地存储
const saveAnnotationsToStorage = () => {
  try {
    const annotationsData = {
      ...annotations.value,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotationsData));
  } catch (error) {
    console.warn('保存批注到本地存储失败:', error);
  }
};

// 从本地存储加载批注
const loadAnnotationsFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsedData = JSON.parse(stored);
      // 只加载内容，不包括展开状态
      Object.keys(annotations.value).forEach((key) => {
        if (parsedData[key] && parsedData[key].content) {
          (annotations.value as any)[key].content = parsedData[key].content;
        }
      });
    }
  } catch (error) {
    console.warn('从本地存储加载批注失败:', error);
  }
};

// 监听批注内容变化，自动保存
watch(
  () => annotations.value,
  () => {
    saveAnnotationsToStorage();
  },
  { deep: true },
);

// 导出批注功能
const exportAnnotations = async () => {
  try {
    // 显示加载状态
    $q.notify({
      type: 'ongoing',
      message: '正在生成PDF报告...',
      icon: 'description',
      position: 'top',
      timeout: 0,
      actions: [{ icon: 'close', color: 'white' }],
    });

    const annotationData = {
      timestamp: new Date().toISOString(),
      exportDate: dayjs().format('YYYY年MM月DD日 HH:mm:ss'),
      dataTableAnnotation: annotations.value.table.content,
      identityRankingAnnotation: annotations.value.identityRanking.content,
      likesTrendAnnotation: annotations.value.like.content,
      sharesTrendAnnotation: annotations.value.share.content,
      commentsTrendAnnotation: annotations.value.comment.content,
      postCountAnnotation: annotations.value.postCount.content,
      scatterPlotAnnotation: annotations.value.scatter.content,
      heatmapAnnotation: annotations.value.heatmap.content,
      scatter3DAnnotation: annotations.value.scatter3d.content,
      wordCloudAnnotation: annotations.value.wordCloud.content,
    };

    // 创建 jsPDF 实例
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 加载中文字体
    try {
      const fontResponse = await fetch('/font/SourceHanSansCN-VF.ttf');
      if (!fontResponse.ok) {
        throw new Error('字体文件加载失败');
      }
      const fontArrayBuffer = await fontResponse.arrayBuffer();
      const fontBase64 = arrayBufferToBase64(fontArrayBuffer);

      // 添加字体到 jsPDF - 添加所有需要的字重
      doc.addFileToVFS('SourceHanSansCN-VF.ttf', fontBase64);
      doc.addFont('SourceHanSansCN-VF.ttf', 'SourceHanSansCN', 'normal');
      doc.addFont('SourceHanSansCN-VF.ttf', 'SourceHanSansCN', 'bold');
      doc.setFont('SourceHanSansCN');
    } catch (fontError) {
      console.warn('中文字体加载失败，使用默认字体:', fontError);
      // 如果字体加载失败，使用默认字体
    }

    // 设置页面边距
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;

    // 添加标题
    doc.setFontSize(20);
    doc.text('统计分析批注报告', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // 添加导出时间
    doc.setFontSize(12);
    doc.text(`导出时间: ${annotationData.exportDate}`, pageWidth / 2, currentY, {
      align: 'center',
    });
    currentY += 20;

    // 检查是否需要换页
    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    // 重新设计的 sections 配置
    const sections = [
      {
        title: '推文排行',
        type: 'table' as const,
        annotation: annotationData.dataTableAnnotation,
        getData: () => {
          return latestPostArchiveList.value
            .slice(0, 20)
            .map((post, index) => [
              (index + 1).toString(),
              post.content
                ? post.content.slice(0, 50) + (post.content.length > 50 ? '...' : '')
                : '',
              post.like?.toString() || '0',
              post.share?.toString() || '0',
              post.comment?.toString() || '0',
              dayjs(post.createdAt).format('YYYY-MM-DD'),
            ]);
        },
        getHeaders: () => ['序号', '内容', '点赞', '分享', '评论', '创建时间'],
        tableColor: [66, 139, 202] as [number, number, number],
      },
      {
        title: '身份影响力排行',
        type: 'table' as const,
        annotation: annotationData.identityRankingAnnotation,
        condition: () => identityRankingList.value.length > 1,
        getData: () => {
          return identityRankingList.value
            .slice(0, 15)
            .map((identity) => [
              identity.rank.toString(),
              identity.authorName,
              identity.postCount.toString(),
              identity.totalLikes.toString(),
              identity.totalShares.toString(),
              identity.totalComments.toString(),
              identity.influenceScore.toString(),
            ]);
        },
        getHeaders: () => ['排名', '身份', '发帖数', '总点赞', '总分享', '总评论', '影响力分数'],
        tableColor: [156, 39, 176] as [number, number, number],
        extraInfo: `影响力评分说明：点赞权重 ${INFLUENCE_WEIGHTS.like}，分享权重 ${INFLUENCE_WEIGHTS.share}，评论权重 ${INFLUENCE_WEIGHTS.comment}`,
      },
      {
        title: '点赞趋势分析',
        type: 'chart' as const,
        annotation: annotationData.likesTrendAnnotation,
        chartSelector: '[data-chart="like-trend"]',
      },
      {
        title: '分享趋势分析',
        type: 'chart' as const,
        annotation: annotationData.sharesTrendAnnotation,
        chartSelector: '[data-chart="share-trend"]',
      },
      {
        title: '评论趋势分析',
        type: 'chart' as const,
        annotation: annotationData.commentsTrendAnnotation,
        chartSelector: '[data-chart="comment-trend"]',
      },
      {
        title: '发文量统计分析',
        type: 'chart' as const,
        annotation: annotationData.postCountAnnotation,
        chartSelector: '[data-chart="post-count"]',
      },
      {
        title: '交互分布散点图分析',
        type: 'chart' as const,
        annotation: annotationData.scatterPlotAnnotation,
        chartSelector: '[data-chart="scatter-plot"]',
      },
      {
        title: '交互分布热力图分析',
        type: 'chart' as const,
        annotation: annotationData.heatmapAnnotation,
        chartSelector: '[data-chart="heatmap"]',
      },
      {
        title: '3D交互分布图分析',
        type: 'chart' as const,
        annotation: annotationData.scatter3DAnnotation,
        chartSelector: '[data-chart="scatter3d"]',
      },
      {
        title: '词云分析',
        type: 'chart' as const,
        annotation: annotationData.wordCloudAnnotation,
        chartSelector: '[data-chart="wordcloud"]',
      },
    ];

    // 渲染各个 section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section) continue;

      // 检查条件（如果有）
      if ('condition' in section && !section.condition()) {
        continue;
      }

      // 检查是否需要换页
      checkPageBreak(40);

      // 添加节标题
      doc.setFontSize(16);
      doc.setFont('SourceHanSansCN', 'bold');
      doc.text(`${i + 1}. ${section.title}`, margin, currentY);
      currentY += 15;

      // 根据类型渲染内容
      if (section.type === 'table') {
        // 渲染表格
        if ('getData' in section && 'getHeaders' in section) {
          const tableData = section.getData();
          const headers = section.getHeaders();

          if (tableData.length > 0) {
            checkPageBreak(50);

            autoTable(doc, {
              head: [headers],
              body: tableData,
              startY: currentY,
              styles: {
                font: 'SourceHanSansCN',
                fontSize: 9,
                cellPadding: 3,
              },
              headStyles: {
                fillColor: 'tableColor' in section ? section.tableColor : [66, 139, 202],
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
              },
              alternateRowStyles: {
                fillColor: [245, 245, 245],
              },
              margin: { left: margin, right: margin },
              pageBreak: 'auto',
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;

            // 添加额外信息（如权重说明）
            if ('extraInfo' in section && section.extraInfo) {
              checkPageBreak(15);
              doc.setFontSize(10);
              doc.setFont('SourceHanSansCN', 'normal');
              doc.text(section.extraInfo, margin, currentY);
              currentY += 10;
            }
          }
        }
      } else if (section.type === 'chart') {
        // 渲染图表
        if ('chartSelector' in section && section.chartSelector) {
          try {
            const chartElement = document.querySelector(section.chartSelector);
            if (chartElement) {
              const canvas = chartElement.querySelector('canvas');
              if (canvas) {
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = contentWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                checkPageBreak(imgHeight + 20);

                doc.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 10;
              }
            }
          } catch (error) {
            console.warn(`无法获取图表图片: ${section.title}`, error);
            // 如果无法获取图片，显示占位符
            doc.setFontSize(12);
            doc.setFont('SourceHanSansCN', 'normal');
            doc.text(`[图表: ${section.title}]`, margin, currentY);
            currentY += 15;
          }
        }
      }

      // 添加批注
      if (section.annotation) {
        checkPageBreak(30);

        doc.setFontSize(12);
        doc.setFont('SourceHanSansCN', 'bold');
        doc.text('📝 分析批注：', margin, currentY);
        currentY += 8;

        doc.setFontSize(11);
        doc.setFont('SourceHanSansCN', 'normal');

        const annotationLines = doc.splitTextToSize(section.annotation || '暂无批注', contentWidth);
        annotationLines.forEach((line: string) => {
          checkPageBreak(8);
          doc.text(line, margin, currentY);
          currentY += 6;
        });

        currentY += 10; // 节间距
      }
    }

    // 添加页脚
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(`第 ${i} 页 / 共 ${pageCount} 页`, pageWidth / 2, pageHeight - 10, {
        align: 'center',
      });
      doc.text(`生成时间: ${annotationData.timestamp}`, pageWidth - margin, pageHeight - 10, {
        align: 'right',
      });
    }

    // 保存 PDF
    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
    doc.save(`统计分析批注报告_${timestamp}.pdf`);

    // 关闭加载状态并显示成功消息
    $q.notify({
      type: 'positive',
      message: 'PDF报告已成功导出',
      icon: 'download',
      position: 'top',
      timeout: 3000,
    });
  } catch (error) {
    console.error('PDF生成失败:', error);
    $q.notify({
      type: 'negative',
      message: 'PDF生成失败: ' + (error as Error).message,
      icon: 'error',
      position: 'top',
      timeout: 5000,
    });
  }
};

// 工具函数：将 ArrayBuffer 转换为 Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return window.btoa(binary);
};

// 清空所有批注
const clearAllAnnotations = () => {
  $q.dialog({
    title: '确认清空',
    message: '您确定要清空所有批注吗？此操作不可撤销。',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    Object.keys(annotations.value).forEach((key) => {
      (annotations.value as any)[key].content = '';
    });

    // 清空本地存储
    localStorage.removeItem(STORAGE_KEY);

    $q.notify({
      type: 'positive',
      message: '所有批注已清空',
      icon: 'clear_all',
      position: 'top',
      timeout: 2000,
    });
  });
};

// 获取批注标签
const getAnnotationLabel = (key: string): string => {
  const labelMap: Record<string, string> = {
    table: '推文排行',
    identityRanking: '身份排行',
    like: '点赞分析',
    share: '分享分析',
    comment: '评论分析',
    postCount: '发帖数量',
    scatter: '散点图',
    heatmap: '热力图',
    scatter3d: '3D散点图',
    wordCloud: '词云图',
  };
  return labelMap[key] || key;
};

// 计算已填写批注的数量
const filledAnnotationsCount = computed(() => {
  return Object.values(annotations.value).filter((item) => item.content.trim()).length;
});

// 计算总批注数量
const totalAnnotationsCount = computed(() => {
  return Object.keys(annotations.value).length;
});

// 图表渲染完成计数器
const renderedChartsCount = ref(0);
const totalChartsCount = 7; // 当前组件中的图表总数

// 图表渲染完成的回调
const onChartRendered = () => {
  renderedChartsCount.value++;
  console.log(
    `📊 [PostListStatistics] 图表渲染完成: ${renderedChartsCount.value}/${totalChartsCount}`,
  );

  // 如果所有图表都已渲染完成，发射 rendered 事件
  if (renderedChartsCount.value >= totalChartsCount) {
    console.log('📊 [PostListStatistics] 所有图表渲染完成，发射 rendered 事件');
    emit('rendered');
  }
};

// 在组件挂载时，如果不是图片模式，立即发射 rendered 事件
onMounted(() => {
  // 加载本地存储的批注数据
  loadAnnotationsFromStorage();

  if (!useImageMode) {
    void nextTick(() => {
      emit('rendered');
    });
  } else {
    // 如果是图片模式，重置计数器
    renderedChartsCount.value = 0;
  }
});

// 当 useImageMode 改变时，重置计数器
watch(
  () => useImageMode,
  (newMode: boolean | undefined) => {
    if (newMode) {
      renderedChartsCount.value = 0;
    } else {
      void nextTick(() => {
        emit('rendered');
      });
    }
  },
);

const LabelMap = {
  'specification.data.PostArchive.content': '推文内容',
  'specification.data.PostArchive.like': '点赞',
  'specification.data.PostArchive.likeGrowthRate': '点赞增速',
  'specification.data.PostArchive.share': '分享',
  'specification.data.PostArchive.shareGrowthRate': '分享增速',
  'specification.data.PostArchive.comment': '评论',
  'specification.data.PostArchive.commentGrowthRate': '评论增速',
  'specification.data.PostArchive.endorsement': '认同度',
  'specification.data.PostArchive.view': '浏览',
  'specification.data.PostArchive.favorite': '收藏',
  'specification.data.PostArchive.createdAt': '创建时间',
  'specification.data.PostArchive.capturedAt': '抓取时间',
};

const GetLabel = (key: string) => {
  return (LabelMap as any)[key] ?? key;
};

const ViewDataSchema = Spec.PostArchive.Schema.extend({
  likeGrowthRate: z.number().optional().describe('点赞增速'),
  shareGrowthRate: z.number().optional().describe('分享增速'),
  commentGrowthRate: z.number().optional().describe('评论增速'),
  endorsement: z.number().optional().describe('认同度'),
  author: Spec.IdentityArchive.Schema.optional(),
  authorId: Spec.Identity.Schema.shape.id.optional().describe('身份ID'),
  authorName: Spec.IdentityArchive.Schema.shape.name.optional().describe('身份名称'),
});

export type ViewDataType = z.infer<typeof ViewDataSchema>;
type Key = keyof typeof ViewDataSchema.shape;

const defaultOrder: Array<Key> = [
  'content',
  'like',
  'share',
  'comment',
  'likeGrowthRate',
  'shareGrowthRate',
  'commentGrowthRate',
  'endorsement',
  // 'view',
  // 'favorite',
  'createdAt',
  'capturedAt',
  // 'authorName',
];
const order = ref<Array<Key>>(defaultOrder);

const _columns = [
  {
    name: 'authorName',
    align: 'left' as const,
  },
  {
    name: 'content',
    headerStyle: 'width: 300px;',
    align: 'left' as const,
  },
  {
    name: 'like',
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'share',
    headerStyle: 'width: 60px;',
    sortable: true,
  },
  {
    name: 'comment',
    headerStyle: 'width: 60px;',
    sortable: true,
  },
  {
    name: 'likeGrowthRate',
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'shareGrowthRate',
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'commentGrowthRate',
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'endorsement',
    headerStyle: 'width: 60px;',
    format: (v: number | null) => (v !== null ? v : '-'),
  },
  {
    name: 'view',
    headerStyle: 'width: 60px;',
    format: () => '-',
  },
  {
    name: 'favorite',
    headerStyle: 'width: 40px;',
    format: () => '-',
  },
  {
    name: 'createdAt',
    headerStyle: 'width: 120px;',
  },
  {
    name: 'capturedAt',
    headerStyle: 'width: 120px;',
  },
];

const columns = Object.entries(ViewDataSchema.shape)
  .filter(([key]) => order.value.includes(key as Key))
  .sort(([a], [b]) => order.value.indexOf(a as Key) - order.value.indexOf(b as Key))
  .map(([key, value]) => {
    const column = _columns.find((item) => item.name === key);
    return {
      name: key,
      label: GetLabel(value.description!),
      field: key,
      align: 'right' as const,
      style: 'text-overflow: ellipsis;overflow: hidden;',
      ...column,
    };
  })
  .concat([
    {
      name: '',
      label: '',
    } as any,
  ]);

const postArchiveList = computed(() => {
  return postViewList.flatMap((postView) => postView.archive);
});

const calcPercentageGrowth = (latest: number, earliest: number, dayCount: number) => {
  if (dayCount === 0) return latest;
  if (earliest === 0) return 0;
  const growth = (latest - earliest) / dayCount;
  // if (growth < 0) {
  //   console.log(
  //     `Negative growth detected: latest=${latest}, earliest=${earliest}, a=${JSON.stringify(
  //       {
  //         capturedAt: a.capturedAt,
  //         like: a.like,
  //         share: a.share,
  //         comment: a.comment,
  //       },
  //       null,
  //       2,
  //     )}, b=${JSON.stringify(
  //       {
  //         capturedAt: b.capturedAt,
  //         like: b.like,
  //         share: b.share,
  //         comment: b.comment,
  //       },
  //       null,
  //       2,
  //     )}`,
  //   );
  // }
  if (Number.isNaN(growth)) {
    console.log(
      `Negative growth detected: latest=${latest}, earliest=${earliest}, dayCount=${dayCount}`,
    );
  }
  return growth.toFixed(3);
};

const latestPostArchiveList = computed(() => {
  const startTime = performance.now();
  console.log('🔄 [PostStatistics] 开始计算 latestPostArchiveList...');

  const result = postViewList.map((post) => {
    const sortedArchive = post.archive;
    // .sort(
    //   (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    // );
    const latestArchive = sortedArchive.at(0);
    const earliestArchive = sortedArchive.at(-1);

    // const likeGrowthRate = calcPercentageGrowth(
    //   latestArchive?.like ?? 0,
    //   earliestArchive?.like ?? 0,
    //   latestArchive?.capturedAt && earliestArchive?.capturedAt
    //     ? (latestArchive.capturedAt.getTime() - earliestArchive.capturedAt.getTime()) /
    //         (1000 * 60 * 60 * 24)
    //     : 1, // 默认1天，避免除以0
    // );
    // const shareGrowthRate = calcPercentageGrowth(
    //   latestArchive?.share ?? 0,
    //   earliestArchive?.share ?? 0,
    //   latestArchive?.capturedAt && earliestArchive?.capturedAt
    //     ? (latestArchive.capturedAt.getTime() - earliestArchive.capturedAt.getTime()) /
    //         (1000 * 60 * 60 * 24)
    //     : 1, // 默认1天，避免除以0
    // );
    // const commentGrowthRate = calcPercentageGrowth(
    //   latestArchive?.comment ?? 0,
    //   earliestArchive?.comment ?? 0,
    //   latestArchive?.capturedAt && earliestArchive?.capturedAt
    //     ? (latestArchive.capturedAt.getTime() - earliestArchive.capturedAt.getTime()) /
    //         (1000 * 60 * 60 * 24)
    //     : 1, // 默认1天，避免除以0
    // );

    const likeGrowthRate = latestArchive!.like / 5;
    const shareGrowthRate = latestArchive!.share / 5;
    const commentGrowthRate = latestArchive!.comment / 5;

    //认同度暂时使用假数据 评论数高于30的，0.8向下浮动0.1，向上浮动0.2。评论数低于30的都为null
    const endorsement = latestArchive?.comment
      ? latestArchive.comment > 30
        ? (0.8 + Math.random() * 0.4 - 0.2).toFixed(3)
        : null
      : null;

    return {
      ...latestArchive,
      likeGrowthRate,
      shareGrowthRate,
      commentGrowthRate,
      endorsement,
    };
  });

  const endTime = performance.now();
  console.log(
    `🔄 [PostStatistics] latestPostArchiveList 计算完成，耗时: ${(endTime - startTime).toFixed(2)}ms，处理了 ${result.length} 条记录`,
  );
  return result;
});

// 影响力评分权重系数（可根据需要调整）
const INFLUENCE_WEIGHTS = {
  like: 1.0, // 点赞权重
  share: 3.0, // 分享权重（分享比点赞更有影响力）
  comment: 2.0, // 评论权重
} as const;

// 身份排行计算
const identityRankingList = computed(() => {
  const startTime = performance.now();
  console.log('🔄 [PostStatistics] 开始计算 identityRankingList...');

  // 按身份ID分组统计
  const identityStats = new Map<
    string,
    {
      authorId: string;
      authorName: string;
      postCount: number;
      totalLikes: number;
      totalShares: number;
      totalComments: number;
      influenceScore: number;
    }
  >();

  // 遍历所有帖子统计身份数据
  postViewList.forEach((postView) => {
    const authorId = postView.post.author;
    const latestArchive = postView.archive[0]; // 获取最新的归档数据

    if (!latestArchive) return;

    const likes = latestArchive.like || 0;
    const shares = latestArchive.share || 0;
    const comments = latestArchive.comment || 0;

    if (identityStats.has(authorId)) {
      const existing = identityStats.get(authorId)!;
      existing.postCount += 1;
      existing.totalLikes += likes;
      existing.totalShares += shares;
      existing.totalComments += comments;
    } else {
      identityStats.set(authorId, {
        authorId,
        authorName: `身份-${authorId.slice(0, 8)}`, // 显示前8位作为名称
        postCount: 1,
        totalLikes: likes,
        totalShares: shares,
        totalComments: comments,
        influenceScore: 0,
      });
    }
  });

  // 计算影响力评分并排序
  const result = Array.from(identityStats.values())
    .map((identity) => {
      // 计算加权影响力分数
      const influenceScore = Math.round(
        identity.totalLikes * INFLUENCE_WEIGHTS.like +
          identity.totalShares * INFLUENCE_WEIGHTS.share +
          identity.totalComments * INFLUENCE_WEIGHTS.comment,
      );

      return {
        ...identity,
        influenceScore,
      };
    })
    .sort((a, b) => b.influenceScore - a.influenceScore) // 按影响力分数降序排序
    .map((identity, index) => ({
      ...identity,
      rank: index + 1, // 添加排名
    }));

  const endTime = performance.now();
  console.log(
    `🔄 [PostStatistics] identityRankingList 计算完成，耗时: ${(endTime - startTime).toFixed(2)}ms，处理了 ${result.length} 个身份`,
  );
  return result;
});

// 身份排行表格列定义
const identityColumns = [
  {
    name: 'rank',
    label: '排名',
    field: 'rank',
    align: 'center' as const,
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'authorName',
    label: '身份',
    field: 'authorName',
    align: 'left' as const,
    headerStyle: 'width: 150px;',
  },
  {
    name: 'postCount',
    label: '发帖数',
    field: 'postCount',
    align: 'center' as const,
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'totalLikes',
    label: '总点赞',
    field: 'totalLikes',
    align: 'center' as const,
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'totalShares',
    label: '总分享',
    field: 'totalShares',
    align: 'center' as const,
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'totalComments',
    label: '总评论',
    field: 'totalComments',
    align: 'center' as const,
    headerStyle: 'width: 80px;',
    sortable: true,
  },
  {
    name: 'influenceScore',
    label: '影响力分数',
    field: 'influenceScore',
    align: 'center' as const,
    headerStyle: 'width: 120px;',
    sortable: true,
  },
];

const latestPostArchiveCutWordList = computed(() => {
  const startTime = performance.now();
  console.log('🔄 [PostStatistics] 开始计算 latestPostArchiveCutWordList...');

  // 🔥 [性能优化] 将cutWordCache转换为Map索引，避免O(n²)查找
  const indexBuildStart = performance.now();
  const cutWordMap = new Map<string, Array<string>>();
  for (const item of cutWordCache) {
    cutWordMap.set(item.id, item.cut);
  }
  const indexBuildEnd = performance.now();
  console.log(
    `🔥 [性能优化] cutWordCache索引构建耗时: ${(indexBuildEnd - indexBuildStart).toFixed(2)}ms，索引了 ${cutWordMap.size} 个条目`,
  );

  const mapStart = performance.now();
  const result = latestPostArchiveList.value.map((post) => {
    // 🔥 [性能优化] 使用Map直接查找，O(1)时间复杂度，添加空值检查
    const cut = post.id ? cutWordMap.get(post.id) || [] : [];
    return {
      ...post,
      cut,
    };
  });
  const mapEnd = performance.now();
  console.log(`🔥 [性能优化] 数据映射耗时: ${(mapEnd - mapStart).toFixed(2)}ms`);

  const endTime = performance.now();
  console.log(
    `🔄 [PostStatistics] latestPostArchiveCutWordList 计算完成，总耗时: ${(endTime - startTime).toFixed(2)}ms，处理了 ${result.length} 条记录`,
  );
  return result;
});

const wordOccurrence = computed(() => {
  const startTime = performance.now();
  console.log('🔄 [PostStatistics] 开始计算 wordOccurrence...');
  console.time('wordOccurrence');

  const flatMapStart = performance.now();
  const words = latestPostArchiveCutWordList.value.flatMap((post) => post.cut);
  const flatMapEnd = performance.now();
  console.log(
    `🔄 [PostStatistics] 词汇展平完成，耗时: ${(flatMapEnd - flatMapStart).toFixed(2)}ms，获得 ${words.length} 个词汇`,
  );

  // 🔥 [性能优化] 预编译正则表达式，避免重复编译
  const punctuationRegex =
    /^[\u3000-\u303F\uFF00-\uFFEF\u2000-\u206F\u0020-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]+$/;
  const digitRegex = /^\d+$/;

  // 🔥 [性能优化] 预定义停用词集合，使用Set进行O(1)查找
  const stopWords = new Set([
    // 中文连接词和介词
    '的',
    '了',
    '在',
    '是',
    '我',
    '有',
    '和',
    '就',
    '不',
    '人',
    '都',
    '一',
    '一个',
    '上',
    '也',
    '很',
    '到',
    '说',
    '要',
    '去',
    '你',
    '会',
    '着',
    '没有',
    '看',
    '好',
    '自己',
    '这',
    '那',
    '可以',
    '但是',
    '如果',
    '因为',
    '所以',
    '然后',
    '还是',
    '或者',
    '虽然',
    '不过',
    '而且',
    '但',
    '与',
    '及',
    '以及',
    '以',
    '为',
    '被',
    '把',
    '从',
    '向',
    '朝',
    '往',
    '由',
    '于',
    '对',
    '对于',
    '关于',
    '根据',
    '按照',
    '依据',
    '通过',
    '经过',
    '沿着',
    '随着',
    '除了',
    '除',
    '之外',
    '之',
    '之后',
    '之前',
    '以后',
    '以前',
    '当',
    '当时',
    '正在',
    '已经',
    '曾经',
    '将要',
    '即将',
    '刚刚',
    '马上',
    '立刻',
    '突然',
    '渐渐',
    '慢慢',
    '快速',
    '迅速',
    // 英文连接词和介词
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'up',
    'about',
    'into',
    'over',
    'after',
    'beneath',
    'under',
    'above',
    'below',
    'between',
    'among',
    'through',
    'during',
    'before',
    'since',
    'until',
    'while',
    'where',
    'when',
    'why',
    'how',
    'what',
    'which',
    'who',
    'whom',
    'whose',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'me',
    'him',
    'her',
    'us',
    'them',
    'my',
    'your',
    'his',
    'her',
    'its',
    'our',
    'their',
    'mine',
    'yours',
    'ours',
    'theirs',
    'am',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'can',
    'shall',
    'need',
    'dare',
    'ought',
    'used',
    'able',
    'if',
    'unless',
    'because',
    'so',
    'as',
    'than',
    'then',
    'now',
    'here',
    'there',
    'where',
    'everywhere',
    'anywhere',
    'somewhere',
    'nowhere',
    'when',
    'whenever',
    'always',
    'never',
    'sometimes',
    'often',
    'usually',
    'seldom',
    'rarely',
    'hardly',
    'scarcely',
    'barely',
    'just',
    'only',
    'even',
    'still',
    'yet',
    'already',
    'again',
    'once',
    'twice',
    'first',
    'second',
    'third',
    'last',
    'next',
    'previous',
    'other',
    'another',
    'some',
    'any',
    'many',
    'much',
    'few',
    'little',
    'several',
    'all',
    'both',
    'each',
    'every',
    'either',
    'neither',
    'none',
    'no',
    'not',
    'yes',
    'ok',
    'okay',
  ]);

  const filterStart = performance.now();
  const filteredWords = words.filter((word) => {
    // 🔥 [性能优化] 快速基本检查（最常见的过滤条件优先）
    if (word.length <= 1) return false;

    // 快速字符检查，避免正则表达式
    const firstChar = word[0];
    if (firstChar === 'h' && word.startsWith('http')) return false;
    if (firstChar === '@') return false;

    // 🔥 [性能优化] 使用预编译的正则表达式
    if (punctuationRegex.test(word)) return false;
    if (digitRegex.test(word)) return false;

    // 🔥 [性能优化] 过滤停用词（连接词、介词等），使用Set的O(1)查找
    const lowerWord = word.toLowerCase();
    if (stopWords.has(word) || stopWords.has(lowerWord)) return false;

    return true;
  });
  const filterEnd = performance.now();
  console.log(
    `🔄 [PostStatistics] 词汇过滤完成，耗时: ${(filterEnd - filterStart).toFixed(2)}ms，剩余 ${filteredWords.length} 个有效词汇`,
  );

  // 🔥 [性能优化] 使用Map手动统计词频，比Object.groupBy更高效
  const groupStart = performance.now();
  const wordCountMap = new Map<string, number>();
  for (const word of filteredWords) {
    const count = wordCountMap.get(word) || 0;
    wordCountMap.set(word, count + 1);
  }
  const groupEnd = performance.now();
  console.log(
    '🔥 [性能优化] 词汇分组完成，耗时:',
    (groupEnd - groupStart).toFixed(2) + 'ms，获得',
    wordCountMap.size,
    '个不同词汇',
  );

  const mapStart = performance.now();
  const result = Array.from(wordCountMap.entries()).map(([word, count]) => ({
    word,
    count,
  }));
  const mapEnd = performance.now();
  console.log(`🔄 [PostStatistics] 词频统计完成，耗时: ${(mapEnd - mapStart).toFixed(2)}ms`);

  console.timeEnd('wordOccurrence');
  const totalTime = performance.now() - startTime;
  console.log(`🔄 [PostStatistics] wordOccurrence 计算完成，总耗时: ${totalTime.toFixed(2)}ms`);

  return result;
});

const postViewDivideByDay = computed(() => {
  return divideByDay(postViewList, (postView) =>
    dayjs(postView.post.createdAt).format('YYYY-MM-DD'),
  );
});

const postCountByDay = computed(() => {
  return postViewDivideByDay.value.map((day) => ({
    date: day.date,
    count: day.itemList.length,
  }));
});

const totalStatsDivided = computed(() => {
  console.log('postViewDivideByDay.value', postViewDivideByDay.value);
  return postViewDivideByDay.value.map((day) => {
    const date = day.date;
    const stat = day.itemList.reduce(
      (stats, post) => ({
        like: stats.like + (post.archive[0]!.like ?? 0),
        share: stats.share + (post.archive[0]!.share ?? 0),
        comment: stats.comment + (post.archive[0]!.comment ?? 0),
      }),
      { like: 0, share: 0, comment: 0 },
    );
    return {
      date,
      ...stat,
    };
  });
});

// ECharts 配置选项
const interactionTrendOption = computed<EChartsOption>(() => {
  const dates = totalStatsDivided.value.map((item) => item.date);
  const likes = totalStatsDivided.value.map((item) => item.like);
  const shares = totalStatsDivided.value.map((item) => item.share);
  const comments = totalStatsDivided.value.map((item) => item.comment);

  return {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['点赞', '分享', '评论'],
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '点赞',
        type: 'line',
        data: likes,
        smooth: true,
        itemStyle: {
          color: '#ff6b6b',
        },
      },
      {
        name: '分享',
        type: 'line',
        data: shares,
        smooth: true,
        itemStyle: {
          color: '#4ecdc4',
        },
      },
      {
        name: '评论',
        type: 'line',
        data: comments,
        smooth: true,
        itemStyle: {
          color: '#45b7d1',
        },
      },
    ],
  };
});

const postCountOption = computed<EChartsOption>(() => {
  const dates = postCountByDay.value.map((item) => item.date);
  const counts = postCountByDay.value.map((item) => item.count);

  return {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '发文量',
        type: 'bar',
        data: counts,
        itemStyle: {
          color: '#95de64',
        },
      },
    ],
  };
});

// 单独的点赞趋势图
const likeOption = computed<EChartsOption>(() => {
  const dates = totalStatsDivided.value.map((item) => item.date);
  const likes = totalStatsDivided.value.map((item) => item.like);

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c} 点赞',
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
      name: '点赞数',
    },
    series: [
      {
        name: '点赞',
        type: 'line',
        data: likes,
        smooth: true,
        itemStyle: {
          color: '#ff6b6b',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
              { offset: 1, color: 'rgba(255, 107, 107, 0.1)' },
            ],
          },
        },
      },
    ],
  };
});

// 单独的分享趋势图
const shareOption = computed<EChartsOption>(() => {
  const dates = totalStatsDivided.value.map((item) => item.date);
  const shares = totalStatsDivided.value.map((item) => item.share);

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c} 分享',
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
      name: '分享数',
    },
    series: [
      {
        name: '分享',
        type: 'line',
        data: shares,
        smooth: true,
        itemStyle: {
          color: '#4ecdc4',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(78, 205, 196, 0.3)' },
              { offset: 1, color: 'rgba(78, 205, 196, 0.1)' },
            ],
          },
        },
      },
    ],
  };
});

// 单独的评论趋势图
const commentOption = computed<EChartsOption>(() => {
  const dates = totalStatsDivided.value.map((item) => item.date);
  const comments = totalStatsDivided.value.map((item) => item.comment);

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c} 评论',
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
      name: '评论数',
    },
    series: [
      {
        name: '评论',
        type: 'line',
        data: comments,
        smooth: true,
        itemStyle: {
          color: '#45b7d1',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69, 183, 209, 0.3)' },
              { offset: 1, color: 'rgba(69, 183, 209, 0.1)' },
            ],
          },
        },
      },
    ],
  };
});

// 推文交互散点图 (点赞 vs 评论)
const scatterOption = computed<EChartsOption>(() => {
  const scatterData = latestPostArchiveList.value
    .filter((post) => (post.like ?? 0) > 0 || (post.comment ?? 0) > 0) // 过滤掉没有互动的推文
    .map((post) => [
      Math.max(post.like ?? 1, 1), // 点赞数，最小值为1以适配对数轴
      Math.max(post.comment ?? 1, 1), // 评论数，最小值为1以适配对数轴
      post.content?.substring(0, 50) + '...' || '无内容', // 推文内容预览
      post.id, // 推文ID
    ]);

  return {
    title: {
      text: '推文互动分布',
      subtext: '横轴: 点赞数 (对数轴) | 纵轴: 评论数 (对数轴)',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: function (params: any) {
        const [likes, comments, content] = params.data;
        return `
          <div style="max-width: 300px;">
            <strong>推文内容:</strong><br/>
            ${content}<br/>
            <strong>点赞:</strong> ${likes}<br/>
            <strong>评论:</strong> ${comments}
          </div>
        `;
      },
    },
    xAxis: {
      type: 'log',
      name: '点赞数',
      nameLocation: 'middle',
      nameGap: 30,
      min: 1,
      axisLabel: {
        formatter: '{value}',
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#e0e0e0',
          type: 'dashed',
        },
      },
    },
    yAxis: {
      type: 'log',
      name: '评论数',
      nameLocation: 'middle',
      nameGap: 50,
      min: 1,
      axisLabel: {
        formatter: '{value}',
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#e0e0e0',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '推文互动',
        type: 'scatter',
        data: scatterData,
        symbolSize: function (data: any) {
          // 根据点赞数和评论数的总和调整点的大小
          const total = data[0] + data[1];
          return Math.min(Math.max(Math.log10(total) * 8, 6), 25);
        },
        itemStyle: {
          color: function (params: any) {
            // 根据互动强度使用不同颜色
            const total = params.data[0] + params.data[1];
            if (total > 100) return '#ff4757'; // 高互动 - 红色
            if (total > 50) return '#ffa726'; // 中高互动 - 橙色
            if (total > 20) return '#66bb6a'; // 中等互动 - 绿色
            return '#42a5f5'; // 低互动 - 蓝色
          },
          opacity: 0.2,
        },
        emphasis: {
          itemStyle: {
            opacity: 1,
            borderColor: '#333',
            borderWidth: 2,
          },
        },
      },
    ],
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%',
      top: '20%',
    },
  };
});

// 推文交互热力图 (点赞 vs 评论)
const heatmapOption = computed<EChartsOption>(() => {
  // 获取有效的互动数据
  const validPosts = latestPostArchiveList.value.filter(
    (post) => (post.like ?? 0) > 0 || (post.comment ?? 0) > 0,
  );

  // 确定数据范围
  const maxLikes = Math.max(...validPosts.map((post) => post.like ?? 0));
  const maxComments = Math.max(...validPosts.map((post) => post.comment ?? 0));

  // 创建分组区间
  const likeBins = 20; // 点赞数分20个区间
  const commentBins = 20; // 评论数分20个区间

  const likeStep = Math.ceil(maxLikes / likeBins);
  const commentStep = Math.ceil(maxComments / commentBins);

  // 创建热力图数据矩阵
  const heatmapData: number[][] = [];
  const likeLabels: string[] = [];
  const commentLabels: string[] = [];

  // 生成标签
  for (let i = 0; i < likeBins; i++) {
    const start = i * likeStep;
    const end = (i + 1) * likeStep;
    likeLabels.push(`${start}-${end}`);
  }

  for (let i = 0; i < commentBins; i++) {
    const start = i * commentStep;
    const end = (i + 1) * commentStep;
    commentLabels.push(`${start}-${end}`);
  }

  // 初始化数据矩阵
  const dataMatrix: number[][] = Array(commentBins)
    .fill(0)
    .map(() => Array(likeBins).fill(0));

  // 填充数据
  validPosts.forEach((post) => {
    const likes = post.like ?? 0;
    const comments = post.comment ?? 0;

    const likeIndex = Math.min(Math.floor(likes / likeStep), likeBins - 1);
    const commentIndex = Math.min(Math.floor(comments / commentStep), commentBins - 1);

    if (dataMatrix[commentIndex] && dataMatrix[commentIndex][likeIndex] !== undefined) {
      dataMatrix[commentIndex][likeIndex]++;
    }
  });

  // 转换为ECharts热力图数据格式
  for (let i = 0; i < commentBins; i++) {
    for (let j = 0; j < likeBins; j++) {
      const value = dataMatrix[i]?.[j];
      if (value && value > 0) {
        heatmapData.push([j, i, value]);
      }
    }
  }

  return {
    title: {
      text: '推文互动分布热力图',
      subtext: '颜色深度表示该区间内推文数量密度',
      left: 'center',
    },
    tooltip: {
      position: 'top',
      formatter: function (params: any) {
        const [likeIndex, commentIndex, count] = params.data;
        const likeRange = likeLabels[likeIndex];
        const commentRange = commentLabels[commentIndex];
        return `
          <div>
            <strong>点赞范围:</strong> ${likeRange}<br/>
            <strong>评论范围:</strong> ${commentRange}<br/>
            <strong>推文数量:</strong> ${count}
          </div>
        `;
      },
    },
    grid: {
      height: '70%',
      top: '15%',
      left: '15%',
      right: '15%',
    },
    xAxis: {
      type: 'category',
      data: likeLabels,
      name: '点赞数区间',
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: {
        rotate: 45,
        fontSize: 10,
      },
      splitArea: {
        show: true,
      },
    },
    yAxis: {
      type: 'category',
      data: commentLabels,
      name: '评论数区间',
      nameLocation: 'middle',
      nameGap: 60,
      axisLabel: {
        fontSize: 10,
      },
      splitArea: {
        show: true,
      },
    },
    visualMap: {
      min: 0,
      max: heatmapData.length > 0 ? Math.max(...heatmapData.map((item) => item[2] ?? 0)) : 10,
      calculable: true,
      orient: 'vertical',
      left: 'right',
      top: 'middle',
      inRange: {
        color: [
          '#313695',
          '#4575b4',
          '#74add1',
          '#abd9e9',
          '#e0f3f8',
          '#ffffbf',
          '#fee090',
          '#fdae61',
          '#f46d43',
          '#d73027',
          '#a50026',
        ],
      },
      text: ['高密度', '低密度'],
      textStyle: {
        fontSize: 12,
      },
    },
    series: [
      {
        name: '推文分布',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
});

// 推文交互3D散点图 (点赞 : 评论 : 分享)
const scatter3DOption = computed(() => {
  // 获取有效的互动数据，确保至少有一种互动
  const validPosts = latestPostArchiveList.value.filter(
    (post) => (post.like ?? 0) > 0 || (post.comment ?? 0) > 0 || (post.share ?? 0) > 0,
  );

  // 准备3D散点图数据
  const scatter3DData = validPosts.map((post) => ({
    value: [
      Math.max(post.like ?? 1, 1), // X轴: 点赞数，最小值为1
      Math.max(post.comment ?? 1, 1), // Y轴: 评论数，最小值为1
      Math.max(post.share ?? 1, 1), // Z轴: 分享数，最小值为1
    ],
    name: post.content?.substring(0, 30) + '...' || '无内容',
    itemStyle: {
      opacity: 0.8,
    },
  }));

  return {
    title: {
      text: '推文互动3D分布',
      subtext: 'X轴: 点赞数 | Y轴: 评论数 | Z轴: 分享数',
      left: 'center',
    },
    tooltip: {
      formatter: function (params: any) {
        const [likes, comments, shares] = params.data.value;
        return `
          <div style="max-width: 300px;">
            <strong>推文内容:</strong><br/>
            ${params.data.name}<br/>
            <strong>点赞:</strong> ${likes}<br/>
            <strong>评论:</strong> ${comments}<br/>
            <strong>分享:</strong> ${shares}
          </div>
        `;
      },
    },
    grid3D: {
      boxWidth: 100,
      boxHeight: 100,
      boxDepth: 100,
      alpha: 20,
      beta: 40,
      viewControl: {
        projection: 'perspective',
        autoRotate: false,
        distance: 200,
        alpha: 20,
        beta: 40,
        center: [0, 0, 0],
        panMouseButton: 'left',
        rotateMouseButton: 'right',
      },
      light: {
        main: {
          intensity: 1.2,
          shadow: true,
          shadowQuality: 'high',
        },
        ambient: {
          intensity: 0.3,
        },
      },
    },
    xAxis3D: {
      name: '点赞数',
      type: 'log',
      min: 1,
      axisLabel: {
        formatter: '{value}',
      },
    },
    yAxis3D: {
      name: '评论数',
      type: 'log',
      min: 1,
      axisLabel: {
        formatter: '{value}',
      },
    },
    zAxis3D: {
      name: '分享数',
      type: 'log',
      min: 1,
      axisLabel: {
        formatter: '{value}',
      },
    },
    series: [
      {
        type: 'scatter3D',
        data: scatter3DData,
        symbolSize: function (data: any) {
          // 根据总互动量调整点的大小
          const total = data[0] + data[1] + data[2];
          return Math.min(Math.max(Math.log10(total) * 5, 4), 20);
        },
        itemStyle: {
          color: function (params: any) {
            // 根据总互动强度使用不同颜色
            const [likes, comments, shares] = params.data.value;
            const total = likes + comments + shares;

            if (total > 200) return '#e74c3c'; // 超高互动 - 红色
            if (total > 100) return '#f39c12'; // 高互动 - 橙色
            if (total > 50) return '#f1c40f'; // 中高互动 - 黄色
            if (total > 20) return '#2ecc71'; // 中等互动 - 绿色
            if (total > 10) return '#3498db'; // 中低互动 - 蓝色
            return '#9b59b6'; // 低互动 - 紫色
          },
          opacity: 0.8,
        },
        emphasis: {
          itemStyle: {
            opacity: 1,
          },
        },
      },
    ],
  };
});

// 词云图配置
const wordCloudOption = computed(() => {
  // 过滤出现频率较高的词汇，避免词云过于拥挤
  const filteredWords = wordOccurrence.value
    .filter((item) => item.count > 1) // 只显示出现2次以上的词汇
    .sort((a, b) => b.count - a.count) // 按频率降序排列
    .slice(0, 100); // 最多显示100个词汇

  // 转换为词云数据格式
  const wordCloudData = filteredWords.map((item) => ({
    name: item.word,
    value: item.count,
  }));

  return {
    tooltip: {
      formatter: function (params: any) {
        return `<strong>${params.data.name}</strong><br/>出现次数: ${params.data.value}`;
      },
    },
    series: [
      {
        type: 'wordCloud',
        gridSize: 2,
        sizeRange: [12, 50],
        rotationRange: [-90, 90],
        shape: 'pentagon',
        width: '100%',
        height: '100%',
        drawOutOfBound: false,
        layoutAnimation: true,
        textStyle: {
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          color: function () {
            // 随机颜色
            const colors = [
              '#ff6b6b',
              '#4ecdc4',
              '#45b7d1',
              '#96ceb4',
              '#ffd93d',
              '#ff8a80',
              '#82b1ff',
              '#b39ddb',
              '#f8bbd9',
              '#c5e1a5',
            ];
            return colors[Math.floor(Math.random() * colors.length)];
          },
        },
        emphasis: {
          focus: 'self',
          textStyle: {
            shadowBlur: 10,
            shadowColor: '#333',
          },
        },
        data: wordCloudData,
      },
    ],
  } as any; // 使用 any 类型避免 TypeScript 类型检查问题
});
</script>

<style lang="scss">
.fixed-layout-table {
  table {
    table-layout: fixed;
  }
}
</style>
