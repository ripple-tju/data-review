import dayjs from 'dayjs';
import type * as Spec from '../specification';

/**
 * 对数缩放函数
 * k：调节敏感区与饱和区的分界阈值（例如 k=100 表示超过 100 后开始压缩差异）
 * xmax：数据中的最大值（用于归一化到 [0,1] 区间）
 * @param x 原值
 * @param k 关注值
 * @param xmax 最大值
 * @returns 缩放后的值 (0-1)
 */
export const logarithmicScaling = (x: number, option?: { k: number; xmax: number }) => {
  const { k = 200, xmax = 1000 } = option || {};
  if (x <= 0) return 0;
  return Math.log(1 + x / k) / Math.log(1 + xmax / k);
};

/**
 * 将0-1的值转换为百分制显示
 * @param normalizedValue 0-1之间的归一化值
 * @returns 0-100的百分制分数
 */
export const toPercentageScore = (normalizedValue: number): number => {
  return Math.round(normalizedValue * 100 * 100) / 100; // 保留两位小数
};

/**
 * 影响力评估结果接口
 */
export interface InfluenceMetrics {
  visibility: {
    contentVolume: number; // 内容发布总量 - 账号在过去一周发布的内容总量
    contentStability: number; // 内容发布稳定性 - 账号在过去一周内容发布量的方差
    domainCoverage: number; // 内容发布主要领域覆盖率 - 一周内账号原创内容各分类的比重
    visibilityScore: number; // 可见度综合得分
  };
  engagement: {
    shareVolume: number; // 推文转发总量 - 账号在过去一周发布内容的转发总量
    shareGrowthCycle: number; // 转发增长周期 - 推文转发量持续增长的平均周期
    commentVolume: number; // 推文评论总量 - 账号在过去一周发布内容的评论总量
    commentGrowthCycle: number; // 评论增长周期 - 推文评论量持续增长的平均周期
    engagementScore: number; // 讨论度综合得分
  };
  sentiment: {
    likeVolume: number; // 点赞总量 - 账号在过去一周发布内容的点赞总量
    commentAlignment: number; // 评论同向性 - 转发文本与推送文本的同向程度
    alignmentTrend: number; // 评论同向变化 - 评论文本与推送文本同向程度的变化趋势
    sentimentScore: number; // 认同度综合得分
  };
  overallScore: number; // 综合影响力得分 (0-100)
}

/**
 * 身份影响力排行榜项目
 */
export interface InfluenceRankingItem {
  name: string;
  influence: InfluenceMetrics;
  rank: number;
}

/**
 * 计算帖子某个指标的增长周期
 * @param postView 帖子视图数据
 * @param metric 要计算的指标名称 ('like', 'comment', 'share', 'view')
 * @param threshold 增长率阈值，默认为0.1 (10%)
 * @returns 增长周期天数，如果无法计算则返回null
 */
export const calculateGrowthCycle = (
  postView: Spec.PostView.Type,
  metric: 'like' | 'comment' | 'share' | 'view',
  threshold: number = 0.1,
): number | null => {
  try {
    // 按时间排序存档数据
    const sortedArchives = [...postView.archive].sort((a, b) => {
      const timeA = a.capturedAt ? new Date(a.capturedAt).getTime() : 0;
      const timeB = b.capturedAt ? new Date(b.capturedAt).getTime() : 0;
      return timeA - timeB;
    });

    if (sortedArchives.length < 3) {
      // 至少需要3个数据点才能计算增长周期
      return null;
    }

    // 按天分组存档数据
    const archivesByDay = new Map<string, typeof sortedArchives>();
    sortedArchives.forEach((archive) => {
      if (archive.capturedAt) {
        const day = dayjs(archive.capturedAt).format('YYYY-MM-DD');
        if (!archivesByDay.has(day)) {
          archivesByDay.set(day, []);
        }
        archivesByDay.get(day)!.push(archive);
      }
    });

    const days = Array.from(archivesByDay.keys()).sort();
    if (days.length < 3) {
      return null;
    }

    // 计算每天的平均值
    const dailyAverages: Array<{ day: string; value: number }> = [];
    days.forEach((day) => {
      const archives = archivesByDay.get(day)!;
      const values = archives.map((archive) => {
        const value = archive[metric];
        return typeof value === 'number' ? value : 0;
      });
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      dailyAverages.push({ day, value: average });
    });

    // 从第3天开始计算增长率（索引2开始）
    const baseDay = dailyAverages[1]; // 第2天作为基准
    if (!baseDay) return null;

    const D2 = baseDay.value;

    for (let i = 2; i < dailyAverages.length; i++) {
      const currentDay = dailyAverages[i];
      if (!currentDay) continue;

      const n = i + 1; // 实际天数（1-based）
      const Dn = currentDay.value;

      // 计算平均增长率: (Dn - D2) / (n - 2)
      const averageGrowthRate = n > 2 ? (Dn - D2) / (n - 2) : 0;

      // 计算相对增长率（避免除零）
      const relativeGrowthRate = D2 > 0 ? averageGrowthRate / D2 : 0;

      // 当增长率小于阈值时，视为停止增长
      if (Math.abs(relativeGrowthRate) < threshold) {
        const growthCycle = n - 2;
        return growthCycle;
      }
    }

    // 如果一直在增长，返回最大可计算的周期
    return dailyAverages.length - 2;
  } catch (error) {
    console.error('计算增长周期时出错:', error);
    return null;
  }
};

/**
 * 计算平均增长周期
 * @param postViewList 帖子列表
 * @param metric 指标类型
 * @returns 平均增长周期（天）
 */
export const calculateAverageGrowthCycle = (
  postViewList: Array<Spec.PostView.Type>,
  metric: 'like' | 'comment' | 'share' | 'view',
): number => {
  const growthCycles: number[] = [];

  postViewList.forEach((postView) => {
    const cycle = calculateGrowthCycle(postView, metric, 0.1);
    if (cycle !== null && cycle > 0) {
      growthCycles.push(cycle);
    }
  });

  if (growthCycles.length === 0) return 0;

  const average = growthCycles.reduce((sum, cycle) => sum + cycle, 0) / growthCycles.length;
  return Math.round(average * 100) / 100;
};

/**
 * 计算每日发布量
 * @param postViewList 帖子列表
 * @param timeRangeDays 时间范围
 * @returns 每日发布量数组
 */
const calculateDailyPostCounts = (
  postViewList: Array<Spec.PostView.Type>,
  timeRangeDays: number,
): number[] => {
  const dailyCounts: Record<string, number> = {};

  // 初始化所有日期为0
  for (let i = 0; i < timeRangeDays; i++) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    dailyCounts[date] = 0;
  }

  // 统计每日发布量
  postViewList.forEach((postView) => {
    if (postView.post.createdAt) {
      const postDate = dayjs(postView.post.createdAt).format('YYYY-MM-DD');
      if (postDate in dailyCounts) {
        dailyCounts[postDate] = (dailyCounts[postDate] || 0) + 1;
      }
    }
  });

  return Object.values(dailyCounts);
};

/**
 * 计算方差稳定性得分
 * @param dailyCounts 每日发布量数组
 * @returns 稳定性得分 (0-100)
 */
const calculateVarianceStability = (dailyCounts: number[]): number => {
  if (dailyCounts.length === 0) return 0;

  const mean = dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length;
  const variance =
    dailyCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / dailyCounts.length;
  const standardDeviation = Math.sqrt(variance);

  // 标准差越小，稳定性越高
  // 转换为0-100分数：稳定性 = max(0, 100 - 标准差 * 惩罚系数)
  const stabilityScore = Math.max(0, 100 - standardDeviation * 10);

  return Math.round(stabilityScore * 100) / 100;
};

/**
 * 计算可见度相关指标
 * @param postViewList 帖子列表
 * @param categoryData 分类数据
 * @param timeRangeDays 时间范围
 * @returns 可见度指标（原始值，不标准化）
 */
const calculateVisibilityMetrics = (
  postViewList: Array<Spec.PostView.Type>,
  categoryData: Array<Spec.Category.Type>,
  timeRangeDays: number,
) => {
  console.log('👁️ [可见度计算] 开始计算可见度指标...');

  // 1. 内容发布总量 - 账号在过去一周发布的内容总量（原始值）
  const contentVolume = postViewList.length;
  console.log(`👁️ [可见度] 内容发布总量: ${contentVolume}`);

  // 2. 内容发布稳定性 - 按日分组计算每日发布量的标准差（原始值）
  const dailyPostCounts = calculateDailyPostCounts(postViewList, timeRangeDays);
  const mean = dailyPostCounts.reduce((sum, count) => sum + count, 0) / dailyPostCounts.length;
  const variance =
    dailyPostCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) /
    dailyPostCounts.length;
  const contentStability = Math.sqrt(variance); // 标准差作为原始值
  console.log(`👁️ [可见度] 内容发布稳定性(标准差): ${contentStability}`);

  // 3. 内容发布主要领域覆盖率 - 暂时设置为1（原始值）
  const domainCoverage = 1;
  console.log(`👁️ [可见度] 领域覆盖率: ${domainCoverage} (待实现)`);

  return {
    contentVolume,
    contentStability,
    domainCoverage,
    visibilityScore: 0, // 暂时设置为0，将通过系数计算
  };
};

/**
 * 计算讨论度相关指标 (专门针对身份)
 * @param postViewList 帖子列表
 * @param timeRangeDays 时间范围
 * @returns 讨论度指标（原始值，不标准化）
 */
const calculateEngagementMetricsForIdentity = (
  postViewList: Array<Spec.PostView.Type>,
  timeRangeDays: number,
) => {
  console.log('💬 [讨论度计算] 开始计算讨论度指标...');

  // 获取所有帖子的最新存档数据进行统计 - 按时间排序后取最新的
  const latestArchives = postViewList
    .map((postView) => {
      // 按时间排序存档数据，获取最新的存档
      const sortedArchives = [...postView.archive].sort((a, b) => {
        const timeA = a.capturedAt ? new Date(a.capturedAt).getTime() : 0;
        const timeB = b.capturedAt ? new Date(b.capturedAt).getTime() : 0;
        return timeB - timeA; // 降序排列，最新的在前面
      });
      return sortedArchives[0]; // 返回最新的存档
    })
    .filter((archive) => archive !== undefined);

  console.log(
    `💬 [讨论度计算] 处理了 ${postViewList.length} 个帖子，找到 ${latestArchives.length} 个有效存档`,
  );

  // 1. 推文转发总量（原始值）
  const shareVolume = latestArchives.reduce((sum, archive) => sum + (archive?.share || 0), 0);

  // 2. 转发增长周期（原始值，天数）
  const shareGrowthCycle = calculateAverageGrowthCycle(postViewList, 'share');

  // 3. 推文评论总量（原始值）
  const commentVolume = latestArchives.reduce((sum, archive) => sum + (archive?.comment || 0), 0);

  // 4. 评论增长周期（原始值，天数）
  const commentGrowthCycle = calculateAverageGrowthCycle(postViewList, 'comment');

  console.log('💬 [讨论度] 统计结果:', {
    转发总量: shareVolume,
    转发增长周期: shareGrowthCycle,
    评论总量: commentVolume,
    评论增长周期: commentGrowthCycle,
  });

  return {
    shareVolume,
    shareGrowthCycle,
    commentVolume,
    commentGrowthCycle,
    engagementScore: 0, // 暂时设置为0，将通过系数计算
  };
};

/**
 * 计算认同度相关指标
 * @param postViewList 帖子列表
 * @param postAgreementData 认同度数据
 * @returns 认同度指标（原始值，不标准化）
 */
const calculateSentimentMetrics = (
  postViewList: Array<Spec.PostView.Type>,
  postAgreementData: Record<string, number>,
) => {
  console.log('❤️ [认同度计算] 开始计算认同度指标...');

  // 1. 点赞总量（原始值）- 账号在过去一周发布内容的点赞总量
  const latestArchives = postViewList
    .map((postView) => {
      // 按时间排序存档数据，获取最新的存档
      const sortedArchives = [...postView.archive].sort((a, b) => {
        const timeA = a.capturedAt ? new Date(a.capturedAt).getTime() : 0;
        const timeB = b.capturedAt ? new Date(b.capturedAt).getTime() : 0;
        return timeB - timeA; // 降序排列，最新的在前面
      });
      return sortedArchives[0]; // 返回最新的存档
    })
    .filter((archive) => archive !== undefined);

  const likeVolume = latestArchives.reduce((sum, archive) => sum + (archive?.like || 0), 0);

  // 2. 评论同向性（原始值，0-1之间）- 转发文本与推送文本的同向程度
  let commentAlignment = 0.5; // 默认值

  // 3. 评论同向变化（原始值，变化趋势指数）- 评论文本与推送文本同向程度的变化趋势
  let alignmentTrend = 0.5; // 默认值

  // 如果有认同度数据，可以基于实际数据计算
  if (Object.keys(postAgreementData).length > 0) {
    console.log('❤️ [认同度] 基于上传的认同度数据计算...');

    // 获取该身份相关的认同度数据 - 只使用最新存档
    const relevantAgreementScores: number[] = [];
    postViewList.forEach((postView) => {
      // 按时间排序存档数据，获取最新的存档
      const sortedArchives = [...postView.archive].sort((a, b) => {
        const timeA = a.capturedAt ? new Date(a.capturedAt).getTime() : 0;
        const timeB = b.capturedAt ? new Date(b.capturedAt).getTime() : 0;
        return timeB - timeA; // 降序排列，最新的在前面
      });
      const latestArchive = sortedArchives[0];
      if (latestArchive) {
        const agreementScore = postAgreementData[latestArchive.id];
        if (agreementScore !== undefined) {
          relevantAgreementScores.push(agreementScore);
        }
      }
    });

    console.log(`❤️ [认同度] 找到 ${relevantAgreementScores.length} 个相关认同度数据点`);

    if (relevantAgreementScores.length > 0) {
      // 使用实际认同度数据计算同向性
      commentAlignment =
        relevantAgreementScores.reduce((sum, score) => sum + score, 0) /
        relevantAgreementScores.length;

      // 计算变化趋势（如果有多个数据点）
      if (relevantAgreementScores.length > 1) {
        const firstHalf = relevantAgreementScores.slice(
          0,
          Math.floor(relevantAgreementScores.length / 2),
        );
        const secondHalf = relevantAgreementScores.slice(
          Math.floor(relevantAgreementScores.length / 2),
        );
        const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
        alignmentTrend = secondAvg - firstAvg; // 变化量
      }

      console.log(
        `❤️ [认同度] 平均认同度: ${commentAlignment.toFixed(3)}, 变化趋势: ${alignmentTrend.toFixed(3)}`,
      );
    }
  }

  console.log('❤️ [认同度] 统计结果:', {
    点赞总量: likeVolume,
    评论同向性: commentAlignment,
    同向变化趋势: alignmentTrend,
  });

  return {
    likeVolume,
    commentAlignment,
    alignmentTrend,
    sentimentScore: 0, // 暂时设置为0，将通过系数计算
  };
};

/**
 * 计算可见度综合得分
 * @param metrics 可见度各项指标
 * @returns 综合得分 (0-100)
 */
const calculateVisibilityScore = (metrics: {
  contentVolume: number;
  contentStability: number;
  domainCoverage: number;
}): number => {
  // 根据权重计算综合得分
  const weights = {
    contentVolume: 0.1, // 内容发布总量 10%
    contentStability: 0.1, // 内容发布稳定性 10%
    domainCoverage: 0.05, // 领域覆盖率 5%
  };

  // 标准化各个指标 (需要根据实际数据范围调整)
  const normalizedVolume = Math.min(metrics.contentVolume / 10, 1) * 100; // 假设10个帖子为满分
  const normalizedStability = metrics.contentStability; // 已经是0-100分数
  const normalizedCoverage = metrics.domainCoverage * 100; // 假设为0-1范围

  const score =
    normalizedVolume * (weights.contentVolume / 0.25) + // 调整权重比例
    normalizedStability * (weights.contentStability / 0.25) +
    normalizedCoverage * (weights.domainCoverage / 0.25);

  return Math.round(score * 100) / 100;
};

/**
 * 计算讨论度综合得分
 * @param metrics 讨论度各项指标
 * @returns 综合得分 (0-100)
 */
const calculateEngagementScore = (metrics: {
  shareVolume: number;
  shareGrowthCycle: number;
  commentVolume: number;
  commentGrowthCycle: number;
}): number => {
  // 根据您提供的权重计算综合得分
  const weights = {
    shareVolume: 0.1, // 转发总量 10%
    shareGrowthCycle: 0.05, // 转发增长周期 5% (周期越短得分越高)
    commentVolume: 0.1, // 评论总量 10%
    commentGrowthCycle: 0.05, // 评论增长周期 5% (周期越短得分越高)
  };

  // 标准化各个指标 (这里需要根据实际数据范围调整)
  const normalizedShares = Math.min(metrics.shareVolume / 1000, 1) * 100; // 假设1000为满分
  const normalizedComments = Math.min(metrics.commentVolume / 500, 1) * 100; // 假设500为满分

  // 增长周期得分 - 周期越短得分越高
  const shareGrowthScore =
    metrics.shareGrowthCycle > 0 ? Math.max(0, 100 - metrics.shareGrowthCycle * 10) : 0;
  const commentGrowthScore =
    metrics.commentGrowthCycle > 0 ? Math.max(0, 100 - metrics.commentGrowthCycle * 10) : 0;

  const score =
    normalizedShares * weights.shareVolume +
    shareGrowthScore * weights.shareGrowthCycle +
    normalizedComments * weights.commentVolume +
    commentGrowthScore * weights.commentGrowthCycle;

  return Math.round(score * 100) / 100; // 保留两位小数
};

/**
 * 计算认同度综合得分
 * @param metrics 认同度各项指标
 * @returns 综合得分 (0-100)
 */
const calculateSentimentScore = (metrics: {
  likeVolume: number;
  commentAlignment: number;
  alignmentTrend: number;
}): number => {
  // 根据权重计算综合得分
  const weights = {
    likeVolume: 0.1, // 点赞总量 10%
    commentAlignment: 0.1, // 评论同向性 10%
    alignmentTrend: 0.05, // 同向变化趋势 5%
  };

  // 标准化点赞量
  const normalizedLikes = Math.min(metrics.likeVolume / 5000, 1) * 100; // 假设5000为满分

  // 计算得分
  const score =
    normalizedLikes * weights.likeVolume +
    metrics.commentAlignment * (weights.commentAlignment / 0.25) * 100 +
    metrics.alignmentTrend * (weights.alignmentTrend / 0.25) * 100;

  return Math.round(score * 100) / 100;
};

/**
 * 计算单个身份的影响力得分
 * @param identityName 身份名称
 * @param postViewList 该身份的帖子数据列表
 * @param postAgreementData 推文认同度数据
 * @param categoryData 分类数据
 * @param selectedDates 用户选择的日期列表，如果提供则使用这些日期进行筛选，否则使用timeRangeDays
 * @param timeRangeDays 分析时间范围（天数），默认7天，仅在selectedDates为空时使用
 * @returns 影响力评估结果（原始值）
 */
export const calculateIdentityInfluence = (
  identityName: string,
  postViewList: Array<Spec.PostView.Type>,
  postAgreementData: Record<string, number> = {},
  categoryData: Array<Spec.Category.Type> = [],
  selectedDates: string[] = [],
  timeRangeDays: number = 7,
): InfluenceMetrics => {
  console.log(`📊 [影响力计算] 开始计算身份 "${identityName}" 的影响力...`);
  console.log(
    `📊 [影响力计算] 帖子数量: ${postViewList.length}, 分析时间范围: ${timeRangeDays} 天`,
  );

  let recentPosts: Array<Spec.PostView.Type>;

  // 如果提供了selectedDates，则使用这些日期进行筛选
  if (selectedDates.length > 0) {
    console.log(`📊 [影响力计算] 使用用户选择的日期: ${selectedDates.length} 个日期`);
    recentPosts = postViewList.filter((postView) => {
      if (!postView.post.createdAt) return false;
      const postDate = dayjs(postView.post.createdAt).format('YYYY-MM-DD');
      return selectedDates.includes(postDate);
    });
  } else {
    // 否则使用时间范围内的帖子（基于帖子创建时间）
    console.log(`📊 [影响力计算] 使用默认时间范围: ${timeRangeDays} 天`);
    const cutoffDate = dayjs().subtract(timeRangeDays, 'day');
    recentPosts = postViewList.filter((postView) => {
      if (!postView.post.createdAt) return false;
      return dayjs(postView.post.createdAt).isAfter(cutoffDate);
    });
  }

  console.log(`📊 [影响力计算] 筛选后帖子数量: ${recentPosts.length}`);

  // 计算实际的时间范围天数，用于稳定性计算
  const actualTimeRangeDays = selectedDates.length > 0 ? selectedDates.length : timeRangeDays;

  // 1. 计算可见度指标（原始值）
  const visibility = calculateVisibilityMetrics(recentPosts, categoryData, actualTimeRangeDays);

  // 2. 计算讨论度指标（原始值）
  const engagement = calculateEngagementMetricsForIdentity(recentPosts, actualTimeRangeDays);

  // 3. 计算认同度指标（原始值）
  const sentiment = calculateSentimentMetrics(recentPosts, postAgreementData);

  // 注意：这里不计算综合得分，将在组件中通过用户设置的系数计算
  const result: InfluenceMetrics = {
    visibility,
    engagement,
    sentiment,
    overallScore: 0, // 暂时设置为0，将通过用户设置的系数计算
  };

  console.log(`📊 [影响力计算] 身份 "${identityName}" 影响力原始数据计算完成:`, {
    可见度: result.visibility,
    讨论度: result.engagement,
    认同度: result.sentiment,
  });

  return result;
};

/**
 * 单个指标的配置接口
 */
export interface MetricConfig {
  weight: number; // 权重 (0-1)
  k: number; // 对数缩放敏感阈值
  xmax: number; // 对数缩放最大值
}

/**
 * 影响力权重配置接口 - 各大项占比
 */
export interface InfluenceWeights {
  visibility: MetricConfig; // 可见度权重和缩放参数
  engagement: MetricConfig; // 讨论度权重和缩放参数
  sentiment: MetricConfig; // 认同度权重和缩放参数
}

/**
 * 影响力系数配置接口 - 各小项计算参数
 */
export interface InfluenceCoefficients {
  visibility: {
    contentVolume: MetricConfig; // 内容总量配置
    contentStability: MetricConfig; // 稳定性配置
    domainCoverage: MetricConfig; // 领域覆盖配置
  };
  engagement: {
    shareVolume: MetricConfig; // 转发量配置
    shareGrowthCycle: MetricConfig; // 转发增长周期配置
    commentVolume: MetricConfig; // 评论量配置
    commentGrowthCycle: MetricConfig; // 评论增长周期配置
  };
  sentiment: {
    likeVolume: MetricConfig; // 点赞量配置
    commentAlignment: MetricConfig; // 同向性配置
    alignmentTrend: MetricConfig; // 变化趋势配置
  };
}

/**
 * 默认影响力权重配置
 */
export const DEFAULT_INFLUENCE_WEIGHTS: InfluenceWeights = {
  visibility: { weight: 0.33, k: 50, xmax: 100 }, // 可见度占比 33%
  engagement: { weight: 0.33, k: 1000, xmax: 10000 }, // 讨论度占比 33%
  sentiment: { weight: 0.34, k: 5000, xmax: 50000 }, // 认同度占比 34%
};

/**
 * 默认影响力系数配置
 */
export const DEFAULT_INFLUENCE_COEFFICIENTS: InfluenceCoefficients = {
  visibility: {
    contentVolume: { weight: 0.4, k: 10, xmax: 50 }, // 内容总量配置
    contentStability: { weight: 0.3, k: 1, xmax: 5 }, // 稳定性配置（标准差）
    domainCoverage: { weight: 0.3, k: 1, xmax: 5 }, // 领域覆盖配置
  },
  engagement: {
    shareVolume: { weight: 0.3, k: 100, xmax: 10000 }, // 转发量配置
    shareGrowthCycle: { weight: 0.2, k: 3, xmax: 14 }, // 转发增长周期配置
    commentVolume: { weight: 0.3, k: 50, xmax: 5000 }, // 评论量配置
    commentGrowthCycle: { weight: 0.2, k: 3, xmax: 14 }, // 评论增长周期配置
  },
  sentiment: {
    likeVolume: { weight: 0.5, k: 1000, xmax: 100000 }, // 点赞量配置
    commentAlignment: { weight: 0.3, k: 0.1, xmax: 1 }, // 同向性配置
    alignmentTrend: { weight: 0.2, k: 0.1, xmax: 1 }, // 变化趋势配置
  },
};

/**
 * 使用新的对数缩放和百分制计算影响力得分
 * @param metrics 原始影响力指标
 * @param coefficients 系数配置
 * @param weights 权重配置
 * @returns 计算后的影响力得分（百分制）
 */
export const calculateInfluenceWithCoefficients = (
  metrics: InfluenceMetrics,
  coefficients: InfluenceCoefficients,
  weights: InfluenceWeights = DEFAULT_INFLUENCE_WEIGHTS,
): InfluenceMetrics => {
  console.log('🧮 [新算法] 开始使用对数缩放计算影响力得分...');

  // ===== 计算可见度各小项得分 =====
  const contentVolumeScaled = logarithmicScaling(metrics.visibility.contentVolume, {
    k: coefficients.visibility.contentVolume.k,
    xmax: coefficients.visibility.contentVolume.xmax,
  });
  const contentVolumeScore = toPercentageScore(contentVolumeScaled);

  // 稳定性：标准差越小越好，需要反转
  const maxStability = coefficients.visibility.contentStability.xmax;
  const stabilityNormalized = Math.max(
    0,
    (maxStability - metrics.visibility.contentStability) / maxStability,
  );
  const contentStabilityScaled = logarithmicScaling(
    stabilityNormalized * coefficients.visibility.contentStability.xmax,
    {
      k: coefficients.visibility.contentStability.k,
      xmax: coefficients.visibility.contentStability.xmax,
    },
  );
  const contentStabilityScore = toPercentageScore(contentStabilityScaled);

  const domainCoverageScaled = logarithmicScaling(metrics.visibility.domainCoverage, {
    k: coefficients.visibility.domainCoverage.k,
    xmax: coefficients.visibility.domainCoverage.xmax,
  });
  const domainCoverageScore = toPercentageScore(domainCoverageScaled);

  // ===== 计算可见度大项得分 =====
  const visibilityWeightedSum =
    contentVolumeScore * coefficients.visibility.contentVolume.weight +
    contentStabilityScore * coefficients.visibility.contentStability.weight +
    domainCoverageScore * coefficients.visibility.domainCoverage.weight;

  const visibilityScaled = logarithmicScaling(visibilityWeightedSum, {
    k: weights.visibility.k,
    xmax: weights.visibility.xmax,
  });
  const visibilityScore = toPercentageScore(visibilityScaled);

  // ===== 计算讨论度各小项得分 =====
  const shareVolumeScaled = logarithmicScaling(metrics.engagement.shareVolume, {
    k: coefficients.engagement.shareVolume.k,
    xmax: coefficients.engagement.shareVolume.xmax,
  });
  const shareVolumeScore = toPercentageScore(shareVolumeScaled);

  const shareGrowthCycleScaled = logarithmicScaling(metrics.engagement.shareGrowthCycle, {
    k: coefficients.engagement.shareGrowthCycle.k,
    xmax: coefficients.engagement.shareGrowthCycle.xmax,
  });
  const shareGrowthCycleScore = toPercentageScore(shareGrowthCycleScaled);

  const commentVolumeScaled = logarithmicScaling(metrics.engagement.commentVolume, {
    k: coefficients.engagement.commentVolume.k,
    xmax: coefficients.engagement.commentVolume.xmax,
  });
  const commentVolumeScore = toPercentageScore(commentVolumeScaled);

  const commentGrowthCycleScaled = logarithmicScaling(metrics.engagement.commentGrowthCycle, {
    k: coefficients.engagement.commentGrowthCycle.k,
    xmax: coefficients.engagement.commentGrowthCycle.xmax,
  });
  const commentGrowthCycleScore = toPercentageScore(commentGrowthCycleScaled);

  // ===== 计算讨论度大项得分 =====
  const engagementWeightedSum =
    shareVolumeScore * coefficients.engagement.shareVolume.weight +
    shareGrowthCycleScore * coefficients.engagement.shareGrowthCycle.weight +
    commentVolumeScore * coefficients.engagement.commentVolume.weight +
    commentGrowthCycleScore * coefficients.engagement.commentGrowthCycle.weight;

  const engagementScaled = logarithmicScaling(engagementWeightedSum, {
    k: weights.engagement.k,
    xmax: weights.engagement.xmax,
  });
  const engagementScore = toPercentageScore(engagementScaled);

  // ===== 计算认同度各小项得分 =====
  const likeVolumeScaled = logarithmicScaling(metrics.sentiment.likeVolume, {
    k: coefficients.sentiment.likeVolume.k,
    xmax: coefficients.sentiment.likeVolume.xmax,
  });
  const likeVolumeScore = toPercentageScore(likeVolumeScaled);

  const commentAlignmentScaled = logarithmicScaling(
    Math.max(0, metrics.sentiment.commentAlignment), // 确保非负
    {
      k: coefficients.sentiment.commentAlignment.k,
      xmax: coefficients.sentiment.commentAlignment.xmax,
    },
  );
  const commentAlignmentScore = toPercentageScore(commentAlignmentScaled);

  const alignmentTrendScaled = logarithmicScaling(
    Math.max(0, metrics.sentiment.alignmentTrend + 1), // 偏移处理负值
    {
      k: coefficients.sentiment.alignmentTrend.k,
      xmax: coefficients.sentiment.alignmentTrend.xmax,
    },
  );
  const alignmentTrendScore = toPercentageScore(alignmentTrendScaled);

  // ===== 计算认同度大项得分 =====
  const sentimentWeightedSum =
    likeVolumeScore * coefficients.sentiment.likeVolume.weight +
    commentAlignmentScore * coefficients.sentiment.commentAlignment.weight +
    alignmentTrendScore * coefficients.sentiment.alignmentTrend.weight;

  const sentimentScaled = logarithmicScaling(sentimentWeightedSum, {
    k: weights.sentiment.k,
    xmax: weights.sentiment.xmax,
  });
  const sentimentScore = toPercentageScore(sentimentScaled);

  // ===== 计算总体得分 =====
  const overallWeightedSum =
    visibilityScore * weights.visibility.weight +
    engagementScore * weights.engagement.weight +
    sentimentScore * weights.sentiment.weight;

  const overallScore = Math.round(overallWeightedSum * 100) / 100;

  console.log('🧮 [新算法] 计算完成:', {
    可见度: visibilityScore,
    讨论度: engagementScore,
    认同度: sentimentScore,
    总体得分: overallScore,
  });

  return {
    visibility: {
      ...metrics.visibility,
      visibilityScore,
    },
    engagement: {
      ...metrics.engagement,
      engagementScore,
    },
    sentiment: {
      ...metrics.sentiment,
      sentimentScore,
    },
    overallScore,
  };
};

/**
 * 批量计算多个身份的影响力并排名
 * @param identityGroups 身份分组数据
 * @param postAgreementData 认同度数据
 * @param categoryData 分类数据
 * @param selectedDates 用户选择的日期列表，如果提供则使用这些日期进行筛选，否则使用timeRangeDays
 * @param timeRangeDays 分析时间范围（天数），默认7天，仅在selectedDates为空时使用
 * @param coefficients 影响力系数配置
 * @param weights 影响力权重配置
 * @returns 影响力排行榜
 */
export const calculateInfluenceRanking = (
  identityGroups: Array<{
    name: string;
    postViewList: Array<Spec.PostView.Type>;
  }>,
  postAgreementData: Record<string, number> = {},
  categoryData: Array<Spec.Category.Type> = [],
  selectedDates: string[] = [],
  timeRangeDays: number = 7,
  coefficients: InfluenceCoefficients = DEFAULT_INFLUENCE_COEFFICIENTS,
  weights: InfluenceWeights = DEFAULT_INFLUENCE_WEIGHTS,
): InfluenceRankingItem[] => {
  console.log('🏆 [影响力排名] 开始计算影响力排行榜...');

  const rankings: InfluenceRankingItem[] = identityGroups.map((group, index) => {
    // 先计算原始数据
    const rawInfluence = calculateIdentityInfluence(
      group.name,
      group.postViewList,
      postAgreementData,
      categoryData,
      selectedDates,
      timeRangeDays,
    );

    // 然后使用系数和权重计算最终得分
    const influence = calculateInfluenceWithCoefficients(rawInfluence, coefficients, weights);

    return {
      name: group.name,
      influence,
      rank: index + 1, // 临时排名，稍后会重新计算
    };
  });

  // 按综合得分排序
  rankings.sort((a, b) => b.influence.overallScore - a.influence.overallScore);

  // 重新分配排名
  rankings.forEach((item, index) => {
    item.rank = index + 1;
  });

  console.log('🏆 [影响力排名] 排行榜计算完成:');
  rankings.slice(0, 5).forEach((item) => {
    console.log(`🏆 第${item.rank}名: ${item.name} (综合得分: ${item.influence.overallScore})`);
  });

  return rankings;
};
