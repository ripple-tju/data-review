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
    contentVolume: number; // 内容发布总量原始值
    contentStability: number; // 内容发布稳定性原始值
    domainCoverage: number; // 内容发布主要领域覆盖率原始值
    visibilityScore: number; // 可见度综合得分
    // 处理后的分值
    contentVolumeScore: number; // 内容发布总量分值 (0-100)
    contentStabilityScore: number; // 内容发布稳定性分值 (0-100)
    domainCoverageScore: number; // 领域覆盖率分值 (0-100)
  };
  engagement: {
    shareVolume: number; // 推文转发总量原始值
    shareGrowthCycle: number; // 转发增长周期原始值
    commentVolume: number; // 推文评论总量原始值
    commentGrowthCycle: number; // 评论增长周期原始值
    engagementScore: number; // 讨论度综合得分
    // 处理后的分值
    shareVolumeScore: number; // 转发量分值 (0-100)
    shareGrowthCycleScore: number; // 转发增长周期分值 (0-100)
    commentVolumeScore: number; // 评论量分值 (0-100)
    commentGrowthCycleScore: number; // 评论增长周期分值 (0-100)
  };
  sentiment: {
    likeVolume: number; // 点赞总量原始值
    commentAlignment: number; // 评论同向性原始值
    alignmentTrend: number; // 评论同向变化原始值
    sentimentScore: number; // 认同度综合得分
    // 处理后的分值
    likeVolumeScore: number; // 点赞量分值 (0-100)
    commentAlignmentScore: number; // 同向性分值 (0-100)
    alignmentTrendScore: number; // 变化趋势分值 (0-100)
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
    console.log(
      `🔍 [增长周期调试] 帖子${postView.post.id}的${metric}指标: 按天分组后天数${days.length}, 日期: ${days.join(', ')}`,
    );

    if (days.length < 3) {
      console.log(`🔍 [增长周期调试] 帖子${postView.post.id}: 天数不足3天，返回null`);
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

    console.log(
      `🔍 [增长周期调试] 帖子${postView.post.id}的每日平均值:`,
      dailyAverages.map((d) => `${d.day}: ${d.value}`),
    );

    // 从第3天开始计算增长率（索引2开始）
    const baseDay = dailyAverages[1]; // 第2天作为基准
    if (!baseDay) return null;

    const D2 = baseDay.value;
    console.log(`🔍 [增长周期调试] 帖子${postView.post.id}: 基准值D2(第2天)=${D2}`);

    for (let i = 2; i < dailyAverages.length; i++) {
      const currentDay = dailyAverages[i];
      if (!currentDay) continue;

      const n = i + 1; // 实际天数（1-based）
      const Dn = currentDay.value;

      // 计算平均增长率: (Dn - D2) / (n - 2)
      const averageGrowthRate = n > 2 ? (Dn - D2) / (n - 2) : 0;

      // 计算相对增长率（避免除零）
      const relativeGrowthRate = D2 > 0 ? averageGrowthRate / D2 : 0;

      console.log(
        `🔍 [增长周期调试] 帖子${postView.post.id}第${n}天: Dn=${Dn}, 平均增长率=${averageGrowthRate.toFixed(4)}, 相对增长率=${relativeGrowthRate.toFixed(4)}, 阈值=${threshold}`,
      );

      // 当增长率小于阈值时，视为停止增长
      if (Math.abs(relativeGrowthRate) < threshold) {
        const growthCycle = n - 1; // 第n天停止增长，则增长周期为n-1天
        console.log(
          `🔍 [增长周期调试] 帖子${postView.post.id}: 第${n}天增长停止，返回增长周期${growthCycle}`,
        );
        return growthCycle;
      }
    }

    // 如果一直在增长，返回最大可计算的周期
    console.log(
      `🔍 [增长周期调试] 帖子${postView.post.id}: 一直在增长，返回最大周期${dailyAverages.length - 1}`,
    );
    return dailyAverages.length - 1; // 一直增长时，增长周期为总天数-1
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
  console.log(
    `📊 [增长周期分析] 开始计算 ${metric} 的平均增长周期，帖子数量: ${postViewList.length}`,
  );

  const growthCycles: number[] = [];
  const growthCyclesByValue = new Map<
    number,
    Array<{ postId: string; cycle: number; archiveCount: number }>
  >();
  const detailsByPost: Array<{
    postId: string;
    cycle: number | null;
    reason: string;
    archiveCount: number;
  }> = [];

  postViewList.forEach((postView, index) => {
    const cycle = calculateGrowthCycle(postView, metric, 0.1);
    const archiveCount = postView.archive.length;

    let reason = '';
    if (cycle === null) {
      if (archiveCount < 3) {
        reason = `存档数量不足(${archiveCount}<3)`;
      } else {
        reason = '其他原因导致计算失败';
      }
    } else if (cycle === 0) {
      reason = '计算结果为0(异常)';
    } else {
      reason = '正常计算';
      growthCycles.push(cycle);

      // 按增长周期值分组
      if (!growthCyclesByValue.has(cycle)) {
        growthCyclesByValue.set(cycle, []);
      }
      growthCyclesByValue.get(cycle)!.push({ postId: postView.post.id, cycle, archiveCount });
    }

    detailsByPost.push({
      postId: postView.post.id,
      cycle,
      reason,
      archiveCount,
    });

    console.log(
      `📊 [增长周期分析] 帖子 ${index + 1}/${postViewList.length} (${postView.post.id}): ${cycle} (${reason}, 存档${archiveCount}个)`,
    );
  });

  // 输出增长周期原值分布
  console.log(`📊 [增长周期分布] 有效增长周期数据: [${growthCycles.join(', ')}]`);
  console.log(
    `📊 [增长周期分布] 有效数据统计: ${growthCycles.length}/${postViewList.length} (${((growthCycles.length / postViewList.length) * 100).toFixed(1)}%)`,
  );

  // 按增长周期值分组显示
  console.log(`📊 [增长周期分组] 按增长周期值分组:`);
  Array.from(growthCyclesByValue.keys())
    .sort((a, b) => a - b)
    .forEach((cycleValue) => {
      const posts = growthCyclesByValue.get(cycleValue)!;
      console.log(`📊 [增长周期分组]   ${cycleValue}天: ${posts.length}个帖子`);
      posts.forEach((post) => {
        console.log(`📊 [增长周期分组]     - 帖子${post.postId} (存档${post.archiveCount}个)`);
      });
    });

  // 输出失败原因统计
  const failureReasons = new Map<string, number>();
  detailsByPost.forEach((detail) => {
    if (detail.cycle === null || detail.cycle === 0) {
      const count = failureReasons.get(detail.reason) || 0;
      failureReasons.set(detail.reason, count + 1);
    }
  });

  console.log(`📊 [增长周期失败统计] 失败原因分析:`);
  failureReasons.forEach((count, reason) => {
    console.log(`📊 [增长周期失败统计]   ${reason}: ${count}个帖子`);
  });

  if (growthCycles.length === 0) {
    console.log(`📊 [增长周期分析] 没有有效数据，返回0`);
    return 0;
  }

  const average = growthCycles.reduce((sum, cycle) => sum + cycle, 0) / growthCycles.length;
  console.log(
    `📊 [增长周期分析] 平均值: ${average.toFixed(2)} (基于${growthCycles.length}个有效数据)`,
  );
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
 * @param postCategoryMap 帖子分类映射数据（分类ID -> 帖子ID列表）
 * @param domainCoverageConfig 主要领域覆盖率配置
 * @returns 可见度指标（原始值，不标准化）
 */
const calculateVisibilityMetrics = (
  postViewList: Array<Spec.PostView.Type>,
  categoryData: Array<Spec.Category.Type>,
  timeRangeDays: number,
  postCategoryMap?: Map<string, Array<string>>,
  domainCoverageConfig: DomainCoverageConfig = DEFAULT_DOMAIN_COVERAGE_CONFIG,
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

  // 3. 内容发布主要领域覆盖率 - 计算实际的覆盖率
  let domainCoverage = 1; // 默认值

  if (postCategoryMap && postCategoryMap.size > 0) {
    // 获取所有帖子ID
    const allPostIds = new Set(postViewList.map((postView) => postView.post.id));

    // 过滤掉分类id为'0'的帖子
    const validPostIds = new Set<string>();
    allPostIds.forEach((postId) => {
      // 检查该帖子是否属于任何分类（除了'0'）
      let hasValidCategory = false;
      postCategoryMap.forEach((postIds, categoryId) => {
        if (categoryId !== '0' && postIds.includes(postId)) {
          hasValidCategory = true;
        }
      });
      if (hasValidCategory) {
        validPostIds.add(postId);
      }
    });

    if (validPostIds.size > 0) {
      // 统计属于主要领域分类的帖子数量
      const mainDomainPostIds = new Set<string>();
      domainCoverageConfig.mainCategoryIds.forEach((categoryId) => {
        const postsInCategory = postCategoryMap.get(categoryId);
        if (postsInCategory) {
          postsInCategory.forEach((postId) => {
            if (validPostIds.has(postId)) {
              mainDomainPostIds.add(postId);
            }
          });
        }
      });

      // 计算覆盖率（主要领域帖子数 / 有效分类帖子总数）
      domainCoverage = validPostIds.size > 0 ? mainDomainPostIds.size / validPostIds.size : 0;

      console.log(`👁️ [可见度] 主要领域覆盖率计算详情:`);
      console.log(`👁️   - 主要领域分类ID: [${domainCoverageConfig.mainCategoryIds.join(', ')}]`);
      console.log(`👁️   - 总帖子数: ${allPostIds.size}`);
      console.log(`👁️   - 有效分类帖子数(排除分类0): ${validPostIds.size}`);
      console.log(`👁️   - 主要领域帖子数: ${mainDomainPostIds.size}`);
      console.log(`👁️   - 领域覆盖率: ${(domainCoverage * 100).toFixed(1)}%`);
    } else {
      console.log(`👁️ [可见度] 没有有效分类的帖子，领域覆盖率设为默认值: ${domainCoverage}`);
    }
  } else {
    console.log(`👁️ [可见度] 没有提供帖子分类数据，领域覆盖率设为默认值: ${domainCoverage}`);
  }

  return {
    contentVolume,
    contentStability,
    domainCoverage,
    visibilityScore: 0, // 暂时设置为0，将通过系数计算
    // 分值字段，暂时设为0，将在系数计算中填充
    contentVolumeScore: 0,
    contentStabilityScore: 0,
    domainCoverageScore: 0,
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
    // 分值字段，暂时设为0，将在系数计算中填充
    shareVolumeScore: 0,
    shareGrowthCycleScore: 0,
    commentVolumeScore: 0,
    commentGrowthCycleScore: 0,
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
  let commentAlignment = 0;

  // 3. 评论同向变化（原始值，变化趋势指数）- 评论文本与推送文本同向程度的变化趋势
  let alignmentTrend = 0;

  // 如果有认同度数据，基于实际数据计算
  if (Object.keys(postAgreementData).length > 0) {
    console.log('❤️ [认同度] 基于上传的认同度数据计算...');

    // 获取该身份相关的认同度数据 - 直接使用帖子ID
    const relevantAgreementScores: number[] = [];
    postViewList.forEach((postView) => {
      const agreementScore = postAgreementData[postView.post.id];
      if (agreementScore !== undefined && agreementScore !== -1) {
        relevantAgreementScores.push(agreementScore);
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
        // 新的计算方式：计算每日变化的绝对值的平均值
        let totalVariation = 0;
        let validChanges = 0;
        for (let i = 1; i < relevantAgreementScores.length; i++) {
          const currentScore = relevantAgreementScores[i];
          const previousScore = relevantAgreementScores[i - 1];
          if (currentScore !== undefined && previousScore !== undefined) {
            const dailyChange = Math.abs(currentScore - previousScore);
            totalVariation += dailyChange;
            validChanges++;
          }
        }
        alignmentTrend = validChanges > 0 ? totalVariation / validChanges : 0; // 变化剧烈程度的平均值
      }

      console.log(
        `❤️ [认同度] 平均认同度: ${commentAlignment.toFixed(3)}, 变化趋势: ${alignmentTrend.toFixed(3)}`,
      );
    } else {
      console.log('❤️ [认同度] 未找到有效的认同度数据，使用默认值0');
    }
  } else {
    console.log('❤️ [认同度] 无认同度数据，使用默认值0');
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
    // 分值字段，暂时设为0，将在系数计算中填充
    likeVolumeScore: 0,
    commentAlignmentScore: 0,
    alignmentTrendScore: 0,
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
 * @param postCategoryMap 帖子分类映射数据（分类ID -> 帖子ID列表），用于计算主要领域覆盖率
 * @param domainCoverageConfig 主要领域覆盖率配置
 * @returns 影响力评估结果（原始值）
 */
export const calculateIdentityInfluence = (
  identityName: string,
  postViewList: Array<Spec.PostView.Type>,
  postAgreementData: Record<string, number> = {},
  categoryData: Array<Spec.Category.Type> = [],
  selectedDates: string[] = [],
  timeRangeDays: number = 7,
  postCategoryMap?: Map<string, Array<string>>,
  domainCoverageConfig: DomainCoverageConfig = DEFAULT_DOMAIN_COVERAGE_CONFIG,
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

  // 过滤掉同向度为-1的帖子数据
  const filteredPosts = recentPosts.filter((postView) => {
    const agreementScore = postAgreementData[postView.post.id];
    // 过滤掉同向度为-1的数据
    if (agreementScore === -1) {
      console.log(`📊 [影响力计算] 过滤同向度为-1的帖子: ${postView.post.id}`);
      return false;
    }
    return true;
  });

  console.log(
    `📊 [影响力计算] 过滤同向度为-1后帖子数量: ${filteredPosts.length}/${recentPosts.length}`,
  );

  // 计算实际的时间范围天数，用于稳定性计算
  const actualTimeRangeDays = selectedDates.length > 0 ? selectedDates.length : timeRangeDays;

  // 1. 计算可见度指标（原始值）
  const visibility = calculateVisibilityMetrics(
    filteredPosts,
    categoryData,
    actualTimeRangeDays,
    postCategoryMap,
    domainCoverageConfig,
  );

  // 2. 计算讨论度指标（原始值）
  const engagement = calculateEngagementMetricsForIdentity(filteredPosts, actualTimeRangeDays);

  // 3. 计算认同度指标（原始值）
  const sentiment = calculateSentimentMetrics(filteredPosts, postAgreementData);

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
 * 主要领域覆盖率配置接口
 */
export interface DomainCoverageConfig {
  mainCategoryIds: string[]; // 主要领域分类ID列表
}

/**
 * 影响力系数配置接口 - 各小项计算参数
 */
export interface InfluenceCoefficients {
  // 三大类别权重
  categoryWeights: {
    visibility: number; // 内容发布指标权重
    engagement: number; // 传播参与指标权重
    sentiment: number; // 情感认同指标权重
  };
  // 大项对数缩放参数
  categoryScaling: {
    visibility: { k: number; xmax: number }; // 内容发布指标对数缩放参数
    engagement: { k: number; xmax: number }; // 传播参与指标对数缩放参数
    sentiment: { k: number; xmax: number }; // 情感认同指标对数缩放参数
  };
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
  // 主要领域覆盖率配置
  domainCoverage: DomainCoverageConfig;
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
 * 默认主要领域覆盖率配置
 */
export const DEFAULT_DOMAIN_COVERAGE_CONFIG: DomainCoverageConfig = {
  mainCategoryIds: ['1', '4', '5', '7', '10', '27'], // 国际、社会、财经、科技、教育、民生
};

/**
 * 默认影响力系数配置
 */
export const DEFAULT_INFLUENCE_COEFFICIENTS: InfluenceCoefficients = {
  categoryWeights: {
    visibility: 0.3, // 可见度权重 30%
    engagement: 0.3, // 传播参与指标权重 30%
    sentiment: 0.4, // 情感认同指标权重 40%
  },
  categoryScaling: {
    visibility: { k: 1000, xmax: 110 }, // 内容发布指标对数缩放参数（k很大，0-100几乎线性，仅对>100进行轻微压缩）
    engagement: { k: 1000, xmax: 110 }, // 传播参与指标对数缩放参数（k很大，0-100几乎线性，仅对>100进行轻微压缩）
    sentiment: { k: 1000, xmax: 110 }, // 情感认同指标对数缩放参数（k很大，0-100几乎线性，仅对>100进行轻微压缩）
  },
  visibility: {
    contentVolume: { weight: 0.4, k: 100, xmax: 1200 }, // 内容总量配置 40%
    contentStability: { weight: 0.4, k: 2, xmax: 25 }, // 稳定性配置 40%
    domainCoverage: { weight: 0.2, k: 0.1, xmax: 1.0 }, // 领域覆盖配置 20%
  },
  engagement: {
    shareVolume: { weight: 0.33, k: 1000, xmax: 30000 }, // 转发量配置 33%
    shareGrowthCycle: { weight: 0.17, k: 1, xmax: 4 }, // 转发增长周期配置 17%
    commentVolume: { weight: 0.33, k: 2000, xmax: 60000 }, // 评论量配置 33%
    commentGrowthCycle: { weight: 0.17, k: 1, xmax: 4 }, // 评论增长周期配置 17%
  },
  sentiment: {
    likeVolume: { weight: 0.4, k: 50000, xmax: 2500000 }, // 点赞量配置 40%
    commentAlignment: { weight: 0.4, k: 0.2, xmax: 1 }, // 同向性配置 40%
    alignmentTrend: { weight: 0.2, k: 0.05, xmax: 1.0 }, // 变化趋势配置 20%
  },
  // 主要领域覆盖率配置
  domainCoverage: DEFAULT_DOMAIN_COVERAGE_CONFIG,
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
    k: coefficients.categoryScaling.visibility.k,
    xmax: coefficients.categoryScaling.visibility.xmax,
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
    k: coefficients.categoryScaling.engagement.k,
    xmax: coefficients.categoryScaling.engagement.xmax,
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

  // 变化趋势反转处理：变化越大（越不稳定）得分越低
  const maxAlignmentTrend = coefficients.sentiment.alignmentTrend.xmax;
  const alignmentTrendReversed = Math.max(
    0,
    maxAlignmentTrend - Math.min(metrics.sentiment.alignmentTrend, maxAlignmentTrend),
  );

  const alignmentTrendScaled = logarithmicScaling(
    alignmentTrendReversed, // 使用反转后的值：变化大→反转后小→得分低
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
    k: coefficients.categoryScaling.sentiment.k,
    xmax: coefficients.categoryScaling.sentiment.xmax,
  });
  const sentimentScore = toPercentageScore(sentimentScaled);

  // ===== 计算总体得分 =====
  const overallWeightedSum =
    visibilityScore * coefficients.categoryWeights.visibility +
    engagementScore * coefficients.categoryWeights.engagement +
    sentimentScore * coefficients.categoryWeights.sentiment;

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
      contentVolumeScore,
      contentStabilityScore,
      domainCoverageScore,
    },
    engagement: {
      ...metrics.engagement,
      engagementScore,
      shareVolumeScore,
      shareGrowthCycleScore,
      commentVolumeScore,
      commentGrowthCycleScore,
    },
    sentiment: {
      ...metrics.sentiment,
      sentimentScore,
      likeVolumeScore,
      commentAlignmentScore,
      alignmentTrendScore,
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
 * @param postCategoryMap 帖子分类映射数据（分类ID -> 帖子ID列表），用于计算主要领域覆盖率
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
  postCategoryMap?: Map<string, Array<string>>,
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
      postCategoryMap,
      coefficients.domainCoverage,
    );

    // 然后使用系数计算最终得分
    const influence = calculateInfluenceWithCoefficients(rawInfluence, coefficients);

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
