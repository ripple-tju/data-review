import dayjs from 'dayjs';
import type * as Spec from '../specification';

/**
 * 影响力评估结果接口
 */
export interface InfluenceMetrics {
  visibility: {
    contentVolume: number; // 内容发布总量 (10%)
    contentStability: number; // 内容发布稳定性 (10%)
    domainCoverage: number; // 内容发布主要领域覆盖率 (5%)
    visibilityScore: number; // 可见度综合得分
  };
  engagement: {
    shareVolume: number; // 推文转发总量 (10%)
    shareGrowthCycle: number; // 转发增长周期 (5%)
    commentVolume: number; // 推文评论总量 (10%)
    commentGrowthCycle: number; // 评论增长周期 (5%)
    likeVolume: number; // 点赞总量 (10%)
    engagementScore: number; // 讨论度综合得分
  };
  sentiment: {
    commentAlignment: number; // 评论同向性 (10%)
    alignmentTrend: number; // 评论同向变化 (5%)
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
 * @returns 可见度指标
 */
const calculateVisibilityMetrics = (
  postViewList: Array<Spec.PostView.Type>,
  categoryData: Array<Spec.Category.Type>,
  timeRangeDays: number,
) => {
  console.log('👁️ [可见度计算] 开始计算可见度指标...');

  // 1. 内容发布总量 (10%) - 账号在过去一周发布的内容总量
  const contentVolume = postViewList.length;
  console.log(`👁️ [可见度] 内容发布总量: ${contentVolume}`);

  // 2. 内容发布稳定性 (10%) - 账号在过去一周内容发布量的方差
  // 按日分组计算每日发布量，然后计算方差
  const dailyPostCounts = calculateDailyPostCounts(postViewList, timeRangeDays);
  const contentStability = calculateVarianceStability(dailyPostCounts);
  console.log(`👁️ [可见度] 内容发布稳定性: ${contentStability}`);

  // 3. 内容发布主要领域覆盖率 (5%) - 一周内账号原创内容各容量的比重
  // TODO: 需要基于分类数据计算，暂时设置为1
  const domainCoverage = 1;
  console.log(`👁️ [可见度] 领域覆盖率: ${domainCoverage} (待实现)`);

  // 计算可见度综合得分 (0-100)
  const visibilityScore = calculateVisibilityScore({
    contentVolume,
    contentStability,
    domainCoverage,
  });

  return {
    contentVolume,
    contentStability,
    domainCoverage,
    visibilityScore,
  };
};

/**
 * 计算讨论度相关指标 (专门针对身份)
 * @param postViewList 帖子列表
 * @param timeRangeDays 时间范围
 * @returns 讨论度指标
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

  // 1. 推文转发总量 (10%)
  const shareVolume = latestArchives.reduce((sum, archive) => sum + (archive?.share || 0), 0);

  // 2. 转发增长周期 (5%) - 使用增长周期计算
  const shareGrowthCycle = calculateAverageGrowthCycle(postViewList, 'share');

  // 3. 推文评论总量 (10%)
  const commentVolume = latestArchives.reduce((sum, archive) => sum + (archive?.comment || 0), 0);

  // 4. 评论增长周期 (5%) - 使用增长周期计算
  const commentGrowthCycle = calculateAverageGrowthCycle(postViewList, 'comment');

  // 5. 点赞总量 (10%)
  const likeVolume = latestArchives.reduce((sum, archive) => sum + (archive?.like || 0), 0);

  console.log('💬 [讨论度] 统计结果:', {
    转发总量: shareVolume,
    转发增长周期: shareGrowthCycle,
    评论总量: commentVolume,
    评论增长周期: commentGrowthCycle,
    点赞总量: likeVolume,
  });

  // 计算讨论度综合得分
  const engagementScore = calculateEngagementScore({
    shareVolume,
    shareGrowthCycle,
    commentVolume,
    commentGrowthCycle,
    likeVolume,
  });

  return {
    shareVolume,
    shareGrowthCycle,
    commentVolume,
    commentGrowthCycle,
    likeVolume,
    engagementScore,
  };
};

/**
 * 计算认同度相关指标
 * @param postViewList 帖子列表
 * @param postAgreementData 认同度数据
 * @returns 认同度指标
 */
const calculateSentimentMetrics = (
  postViewList: Array<Spec.PostView.Type>,
  postAgreementData: Record<string, number>,
) => {
  console.log('❤️ [认同度计算] 开始计算认同度指标...');

  // 1. 评论同向性 (10%) - 转发文本与推送文本的同向程度
  // TODO: 需要文本分析能力，暂时设置为1
  const commentAlignment = 1;

  // 2. 评论同向变化 (5%) - 评论文本与推送文本同向程度的变化趋势
  // TODO: 需要时间序列分析，暂时设置为1
  const alignmentTrend = 1;

  // 如果有认同度数据，可以基于实际数据计算
  if (Object.keys(postAgreementData).length > 0) {
    console.log('❤️ [认同度] 基于上传的认同度数据计算...');

    // 获取该身份相关的认同度数据
    const relevantAgreementScores: number[] = [];
    postViewList.forEach((postView) => {
      postView.archive.forEach((archive) => {
        const agreementScore = postAgreementData[archive.id];
        if (agreementScore !== undefined) {
          relevantAgreementScores.push(agreementScore);
        }
      });
    });

    console.log(`❤️ [认同度] 找到 ${relevantAgreementScores.length} 个相关认同度数据点`);

    if (relevantAgreementScores.length > 0) {
      // 使用实际认同度数据
      const averageAgreement =
        relevantAgreementScores.reduce((sum, score) => sum + score, 0) /
        relevantAgreementScores.length;
      console.log(`❤️ [认同度] 平均认同度: ${averageAgreement.toFixed(3)}`);
    }
  }

  console.log('❤️ [认同度] 统计结果:', {
    评论同向性: commentAlignment,
    同向变化趋势: alignmentTrend,
  });

  // 计算认同度综合得分
  const sentimentScore = calculateSentimentScore({
    commentAlignment,
    alignmentTrend,
  });

  return {
    commentAlignment,
    alignmentTrend,
    sentimentScore,
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
  likeVolume: number;
}): number => {
  // 根据您提供的权重计算综合得分
  const weights = {
    shareVolume: 0.1, // 转发总量 10%
    shareGrowthCycle: 0.05, // 转发增长周期 5% (周期越短得分越高)
    commentVolume: 0.1, // 评论总量 10%
    commentGrowthCycle: 0.05, // 评论增长周期 5% (周期越短得分越高)
    likeVolume: 0.1, // 点赞总量 10%
  };

  // 标准化各个指标 (这里需要根据实际数据范围调整)
  const normalizedShares = Math.min(metrics.shareVolume / 1000, 1) * 100; // 假设1000为满分
  const normalizedComments = Math.min(metrics.commentVolume / 500, 1) * 100; // 假设500为满分
  const normalizedLikes = Math.min(metrics.likeVolume / 5000, 1) * 100; // 假设5000为满分

  // 增长周期得分 - 周期越短得分越高
  const shareGrowthScore =
    metrics.shareGrowthCycle > 0 ? Math.max(0, 100 - metrics.shareGrowthCycle * 10) : 0;
  const commentGrowthScore =
    metrics.commentGrowthCycle > 0 ? Math.max(0, 100 - metrics.commentGrowthCycle * 10) : 0;

  const score =
    normalizedShares * weights.shareVolume +
    shareGrowthScore * weights.shareGrowthCycle +
    normalizedComments * weights.commentVolume +
    commentGrowthScore * weights.commentGrowthCycle +
    normalizedLikes * weights.likeVolume;

  return Math.round(score * 100) / 100; // 保留两位小数
};

/**
 * 计算认同度综合得分
 * @param metrics 认同度各项指标
 * @returns 综合得分 (0-100)
 */
const calculateSentimentScore = (metrics: {
  commentAlignment: number;
  alignmentTrend: number;
}): number => {
  // 根据权重计算综合得分
  const weights = {
    commentAlignment: 0.1, // 评论同向性 10%
    alignmentTrend: 0.05, // 同向变化趋势 5%
  };

  // 暂时使用简单的得分计算，等待具体实现
  const score =
    metrics.commentAlignment * (weights.commentAlignment / 0.15) * 100 +
    metrics.alignmentTrend * (weights.alignmentTrend / 0.15) * 100;

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
 * @returns 影响力评估结果
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

  // 1. 计算可见度指标 (30%权重)
  const visibility = calculateVisibilityMetrics(recentPosts, categoryData, actualTimeRangeDays);

  // 2. 计算讨论度指标 (30%权重)
  const engagement = calculateEngagementMetricsForIdentity(recentPosts, actualTimeRangeDays);

  // 3. 计算认同度指标 (40%权重)
  const sentiment = calculateSentimentMetrics(recentPosts, postAgreementData);

  // 4. 计算综合影响力得分
  const overallScore =
    visibility.visibilityScore * 0.3 +
    engagement.engagementScore * 0.3 +
    sentiment.sentimentScore * 0.4;

  const result: InfluenceMetrics = {
    visibility,
    engagement,
    sentiment,
    overallScore: Math.round(overallScore * 100) / 100,
  };

  console.log(`📊 [影响力计算] 身份 "${identityName}" 影响力计算完成:`, {
    可见度: result.visibility.visibilityScore,
    讨论度: result.engagement.engagementScore,
    认同度: result.sentiment.sentimentScore,
    综合得分: result.overallScore,
  });

  return result;
};

/**
 * 批量计算多个身份的影响力并排名
 * @param identityGroups 身份分组数据
 * @param postAgreementData 认同度数据
 * @param categoryData 分类数据
 * @param selectedDates 用户选择的日期列表，如果提供则使用这些日期进行筛选，否则使用timeRangeDays
 * @param timeRangeDays 分析时间范围（天数），默认7天，仅在selectedDates为空时使用
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
): InfluenceRankingItem[] => {
  console.log('🏆 [影响力排名] 开始计算影响力排行榜...');

  const rankings: InfluenceRankingItem[] = identityGroups.map((group, index) => {
    const influence = calculateIdentityInfluence(
      group.name,
      group.postViewList,
      postAgreementData,
      categoryData,
      selectedDates,
      timeRangeDays,
    );

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
