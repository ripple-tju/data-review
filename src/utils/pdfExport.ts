import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import * as Spec from 'src/specification';
import { IDENTITY_LIST } from 'src/specification/IdentityData';

// 添加字体支持（可选，用于更好的中文支持）
// jsPDF.API.events.push(['addFonts', function() {
//   // 这里可以添加自定义字体
// }]);

export interface PdfExportData {
  title: string;
  analysisResults: {
    filteredAllPostView: Array<Spec.PostView.Type>;
    filteredPostViewListGroupByIdentity: Array<{
      name: string;
      postViewList: Array<Spec.PostView.Type>;
    }>;
  };
  selectedIdentityIds: string[];
  selectedDates: string[];
  dateRange: {
    earliest: string;
    latest: string;
  } | null;
  exportFields: Record<string, { label: string; selected: boolean }>;
}

export interface ChartData {
  title: string;
  chartInstance: any; // Use any to avoid type compatibility issues with different echarts versions
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'wordcloud' | 'heatmap' | '3d';
}

export class PdfExporter {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private lineHeight: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    this.pageWidth = this.doc.internal.pageSize.width;
    this.pageHeight = this.doc.internal.pageSize.height;
    this.margin = 20;
    this.currentY = this.margin;
    this.lineHeight = 7;
  }

  // 添加新页面
  private addNewPage(): void {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  // 检查是否需要新页面
  private checkNewPage(requiredHeight: number): void {
    if (this.currentY + requiredHeight > this.pageHeight - this.margin) {
      this.addNewPage();
    }
  }

  // 添加标题
  private addTitle(text: string, fontSize: number = 16): void {
    this.checkNewPage(this.lineHeight * 2);

    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, this.margin, this.currentY);
    this.currentY += this.lineHeight * 1.5;
  }

  // 添加普通文本
  private addText(text: string, fontSize: number = 12): void {
    this.checkNewPage(this.lineHeight);

    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', 'normal');

    // 处理长文本换行
    const maxWidth = this.pageWidth - 2 * this.margin;
    const lines = this.doc.splitTextToSize(text, maxWidth);

    for (const line of lines) {
      this.checkNewPage(this.lineHeight);
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    }
  }

  // 添加分隔线
  private addSeparator(): void {
    this.checkNewPage(this.lineHeight);

    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += this.lineHeight;
  }

  // 添加统计摘要
  private addStatisticsSummary(data: PdfExportData): void {
    this.addTitle('数据统计摘要', 14);

    const stats = [
      `生成时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
      `筛选身份数量: ${data.selectedIdentityIds.length}`,
      `筛选日期数量: ${data.selectedDates.length}`,
      `日期范围: ${data.dateRange?.earliest || 'N/A'} 至 ${data.dateRange?.latest || 'N/A'}`,
      `帖子总数: ${data.analysisResults.filteredAllPostView.length}`,
      `身份组数: ${data.analysisResults.filteredPostViewListGroupByIdentity.length}`,
    ];

    for (const stat of stats) {
      this.addText(stat);
    }

    this.currentY += this.lineHeight;
  }

  // 添加身份列表
  private addIdentityList(data: PdfExportData): void {
    this.addTitle('筛选身份列表', 14);

    const identityNames = data.analysisResults.filteredPostViewListGroupByIdentity.map(
      (group, index) => `${index + 1}. ${group.name} (${group.postViewList.length} 个帖子)`,
    );

    for (const identity of identityNames) {
      this.addText(identity);
    }

    this.currentY += this.lineHeight;
  }

  // 添加帖子数据表格
  private addPostDataTable(data: PdfExportData): void {
    this.addTitle('帖子数据详情', 14);

    // 获取选中的字段
    const selectedFields = Object.entries(data.exportFields)
      .filter(([, config]) => config.selected)
      .map(([field, config]) => ({ field, label: config.label }));

    if (selectedFields.length === 0) {
      this.addText('未选择任何字段进行导出');
      return;
    }

    // 准备表格数据
    const headers = selectedFields.map((f) => f.label);
    const rows = data.analysisResults.filteredAllPostView.slice(0, 100).map((postView) => {
      return selectedFields.map(({ field }) => {
        const value = this.getFieldValue(postView, field);
        // 限制单元格文本长度
        return value.length > 50 ? value.substring(0, 47) + '...' : value;
      });
    });

    // 如果数据过多，添加说明
    if (data.analysisResults.filteredAllPostView.length > 100) {
      this.addText(
        `注意: 表格仅显示前100条记录，完整数据共${data.analysisResults.filteredAllPostView.length}条`,
      );
      this.currentY += this.lineHeight;
    }

    // 添加表格
    autoTable(this.doc, {
      head: [headers],
      body: rows,
      startY: this.currentY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: this.margin, right: this.margin },
      tableWidth: 'auto',
      columnStyles: {
        0: { cellWidth: 'auto' },
      },
    });

    // 更新当前Y位置
    this.currentY = (this.doc as any).lastAutoTable.finalY + this.lineHeight;
  }

  // 添加图表图片
  private addChartImage(chartData: ChartData): void {
    console.log(`📊 [PDF导出] 尝试添加图表: "${chartData.title}"`);
    console.log(`📊 [PDF导出] 图表实例存在: ${!!chartData.chartInstance}`);

    if (!chartData.chartInstance) {
      console.log(`📊 [PDF导出] 图表实例为空，跳过: "${chartData.title}"`);
      this.addText(`图表 "${chartData.title}" 无法获取`);
      return;
    }

    // 检查图表实例是否有必要的方法
    if (typeof chartData.chartInstance.getDataURL !== 'function') {
      console.log(`📊 [PDF导出] 图表实例没有getDataURL方法: "${chartData.title}"`);
      this.addText(`图表 "${chartData.title}" 接口不完整`);
      return;
    }

    this.addTitle(chartData.title, 12);

    try {
      console.log(`📊 [PDF导出] 正在获取图表数据URL: "${chartData.title}"`);

      // 获取图表的DataURL
      const dataUrl = chartData.chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      console.log(`📊 [PDF导出] 获取数据URL成功: "${chartData.title}", 长度: ${dataUrl.length}`);

      // 验证dataUrl是否有效
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        console.log(`📊 [PDF导出] 无效的数据URL: "${chartData.title}"`);
        this.addText(`图表 "${chartData.title}" 数据URL无效`);
        return;
      }

      // 计算图片尺寸
      const imgWidth = this.pageWidth - 2 * this.margin;
      const imgHeight = imgWidth * 0.6; // 保持宽高比

      this.checkNewPage(imgHeight + this.lineHeight);

      // 添加图片
      this.doc.addImage(dataUrl, 'PNG', this.margin, this.currentY, imgWidth, imgHeight);
      this.currentY += imgHeight + this.lineHeight;

      console.log(`📊 [PDF导出] 图表添加成功: "${chartData.title}"`);
    } catch (error) {
      console.error(`📊 [PDF导出] 添加图表 "${chartData.title}" 时出错:`, error);
      this.addText(
        `图表 "${chartData.title}" 添加失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  // 添加词频统计表格
  private addWordFrequencyTable(wordData: Array<{ word: string; count: number }>): void {
    this.addTitle('词频统计 (Top 50)', 12);

    if (wordData.length === 0) {
      this.addText('无词频数据');
      return;
    }

    // 取前50个词
    const topWords = wordData.slice(0, 50);

    // 分成两列显示
    const rows: string[][] = [];
    for (let i = 0; i < topWords.length; i += 2) {
      const left = topWords[i];
      const right = topWords[i + 1];

      if (left) {
        rows.push([`${left.word} (${left.count})`, right ? `${right.word} (${right.count})` : '']);
      }
    }

    autoTable(this.doc, {
      head: [['词汇 (频次)', '词汇 (频次)']],
      body: rows,
      startY: this.currentY,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { left: this.margin, right: this.margin },
      columnStyles: {
        0: { cellWidth: (this.pageWidth - 2 * this.margin) / 2 },
        1: { cellWidth: (this.pageWidth - 2 * this.margin) / 2 },
      },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + this.lineHeight;
  }

  // 根据字段路径获取字段值
  private getFieldValue(postView: Spec.PostView.Type, fieldPath: string): string {
    try {
      const latestArchive = postView.archive[postView.archive.length - 1];

      switch (fieldPath) {
        case 'post.id':
          return postView.post.id || '';
        case 'post.author':
          return postView.post.author || '';
        case 'post.authorName':
          return this.getAuthorNameById(postView.post.author || '');
        case 'post.createdAt':
          return postView.post.createdAt
            ? dayjs(postView.post.createdAt).format('YYYY-MM-DD HH:mm:ss')
            : '';
        case 'post.root':
          return postView.post.root || '';
        case 'post.parent':
          return postView.post.parent || '';
        case 'archive.content':
          return latestArchive?.content || '';
        case 'archive.url':
          return latestArchive?.url || '';
        case 'archive.like':
          return (latestArchive?.like ?? 0).toString();
        case 'archive.comment':
          return (latestArchive?.comment ?? 0).toString();
        case 'archive.share':
          return (latestArchive?.share ?? 0).toString();
        case 'archive.view':
          return (latestArchive?.view ?? 0).toString();
        case 'archive.favorite':
          return (latestArchive?.favorite ?? 0).toString();
        case 'archive.capturedAt':
          return latestArchive?.capturedAt
            ? dayjs(latestArchive.capturedAt).format('YYYY-MM-DD HH:mm:ss')
            : '';
        default:
          return '';
      }
    } catch (error) {
      console.error(`获取字段 ${fieldPath} 值时出错:`, error);
      return '';
    }
  }

  // 根据作者ID获取作者名字
  private getAuthorNameById(authorId: string): string {
    const identity = IDENTITY_LIST.find((item) => item.id === authorId);
    if (identity) {
      return identity.name || identity.code || authorId;
    }
    return authorId;
  }

  // 添加页脚
  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');

      // 页码
      const pageText = `第 ${i} 页，共 ${pageCount} 页`;
      const pageTextWidth = this.doc.getTextWidth(pageText);
      this.doc.text(pageText, this.pageWidth - this.margin - pageTextWidth, this.pageHeight - 10);

      // 生成时间
      const timeText = `生成时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`;
      this.doc.text(timeText, this.margin, this.pageHeight - 10);
    }
  }

  // 主导出方法
  exportPdf(
    data: PdfExportData,
    charts: ChartData[] = [],
    wordData: Array<{ word: string; count: number }> = [],
  ): void {
    try {
      // 添加报告标题
      this.doc.setFontSize(20);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(data.title, this.margin, this.currentY);
      this.currentY += this.lineHeight * 2;

      // 添加统计摘要
      this.addStatisticsSummary(data);
      this.addSeparator();

      // 添加身份列表
      this.addIdentityList(data);
      this.addSeparator();

      // 添加图表
      if (charts.length > 0) {
        console.log(`📊 [PDF导出] 开始添加 ${charts.length} 个图表...`);
        this.addTitle('图表分析', 16);
        for (const chart of charts) {
          this.addChartImage(chart);
        }
        this.addSeparator();
        console.log(`📊 [PDF导出] 图表添加完成`);
      } else {
        console.log(`📊 [PDF导出] 没有图表数据，跳过图表部分`);
      }

      // 添加词频统计
      if (wordData.length > 0) {
        this.addWordFrequencyTable(wordData);
        this.addSeparator();
      }

      // 添加帖子数据表格
      this.addPostDataTable(data);

      // 添加页脚
      this.addFooter();

      // 生成文件名
      const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
      const filename = `数据分析报告_${data.selectedIdentityIds.length}个身份_${data.analysisResults.filteredAllPostView.length}条帖子_${timestamp}.pdf`;

      // 保存PDF
      this.doc.save(filename);

      console.log(`PDF报告导出成功: ${filename}`);
    } catch (error) {
      console.error('PDF导出失败:', error);
      throw error;
    }
  }
}

// 导出便捷函数
export function exportPdfReport(
  data: PdfExportData,
  charts: ChartData[] = [],
  wordData: Array<{ word: string; count: number }> = [],
): void {
  const exporter = new PdfExporter();
  exporter.exportPdf(data, charts, wordData);
}
