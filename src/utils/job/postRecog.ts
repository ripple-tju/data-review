import * as Spec from '../../specification';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Option } from 'effect';

type PostId = string;
type PostArchiveId = string;

/**
 * 生成推文认同度的 Mock 数据
 * @param posts 推文数据数组，包含 id 字段
 * @returns 推文认同度映射表，格式为 { postArchiveId: agreementScore }，agreementScore 值域为 0-1
 */
export function generatePostAgreementMockData(
  posts: Array<{ id: PostId; [key: string]: any }>,
): Record<PostArchiveId, number> {
  const startTime = performance.now();

  console.log('👍 生成推文认同度 Mock 数据...');
  console.log(`推文数量: ${posts.length}`);
  console.log('数据格式: Record<PostArchiveId, number>，值域: 0-1，基准值: 0.8 ± 0.15');

  const postAgreementMap: Record<PostArchiveId, number> = {};

  // 认同度配置参数
  const baseScore = 0.8; // 基准认同度分数
  const fluctuation = 0.15; // 浮动范围 ±0.15
  const minScore = Math.max(0, baseScore - fluctuation); // 最小值：0.65
  const maxScore = Math.min(1, baseScore + fluctuation); // 最大值：0.95

  console.log(
    `认同度配置: 基准 ${baseScore}, 浮动范围 ±${fluctuation}, 有效区间 [${minScore}, ${maxScore}]`,
  );

  // 为每个推文生成认同度分数
  posts.forEach((post, index) => {
    // 使用推文ID生成伪随机数，确保结果可重现
    const hash = post.id.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a; // 转换为32位整数
    }, 0);

    // 将hash值转换为0-1之间的随机数
    const normalizedRandom = (Math.abs(hash) % 10000) / 10000;

    // 在 [minScore, maxScore] 范围内生成认同度分数
    const agreementScore = minScore + normalizedRandom * (maxScore - minScore);

    // 确保分数在有效范围内并保留3位小数
    const clampedScore = Math.max(0, Math.min(1, agreementScore));
    const finalScore = Math.round(clampedScore * 1000) / 1000;

    postAgreementMap[post.id] = finalScore;

    // 每处理1000条记录打印一次进度
    if ((index + 1) % 1000 === 0) {
      console.log(`   已处理: ${index + 1}/${posts.length} 条推文`);
    }
  });

  const endTime = performance.now();
  const processingTime = endTime - startTime;

  console.log(`✅ 推文认同度生成完成，耗时: ${processingTime.toFixed(2)}ms`);
  console.log(`   生成映射关系: ${Object.keys(postAgreementMap).length} 条`);

  // 统计认同度分数的分布情况
  const scores = Object.values(postAgreementMap);
  const minGenerated = Math.min(...scores);
  const maxGenerated = Math.max(...scores);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  console.log('📊 认同度分数统计:');
  console.log(`   最小值: ${minGenerated.toFixed(3)}`);
  console.log(`   最大值: ${maxGenerated.toFixed(3)}`);
  console.log(`   平均值: ${avgScore.toFixed(3)}`);
  console.log(
    `   标准差: ${Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length).toFixed(3)}`,
  );

  // 分档统计
  const ranges = [
    { label: '极低认同 (0.0-0.3)', min: 0.0, max: 0.3 },
    { label: '低认同 (0.3-0.5)', min: 0.3, max: 0.5 },
    { label: '中等认同 (0.5-0.7)', min: 0.5, max: 0.7 },
    { label: '高认同 (0.7-0.9)', min: 0.7, max: 0.9 },
    { label: '极高认同 (0.9-1.0)', min: 0.9, max: 1.0 },
  ];

  console.log('📈 认同度分档分布:');
  ranges.forEach((range) => {
    const count = scores.filter((score) => score >= range.min && score < range.max).length;
    const percentage = ((count / scores.length) * 100).toFixed(1);
    console.log(`   ${range.label}: ${count} 条推文 (${percentage}%)`);
  });

  return postAgreementMap;
}

// 命令行入口点
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dataJSONPath] = process.argv.slice(2);
  console.log('参数:', { dataJSONPath });

  const posts = Option.fromNullable(dataJSONPath).pipe(
    Option.map((path) => resolve(__dirname, path.trim())),
    Option.map((path) => readFileSync(path, 'utf-8')),
    Option.map((content) => JSON.parse(content)),
    Option.getOrThrowWith(() => new Error(`推文数据文件未找到或无效`)),
  );

  // 确保数据格式正确
  if (!Array.isArray(posts)) {
    throw new Error('推文数据必须是数组格式');
  }

  if (posts.length === 0) {
    throw new Error('推文数据为空');
  }

  if (!posts[0].id) {
    throw new Error('推文数据缺少必需的 id 字段');
  }

  const postAgreementMap = generatePostAgreementMockData(posts);

  const outputPath = resolve(__dirname, 'postAgreementMockData.json');
  writeFileSync(outputPath, JSON.stringify(postAgreementMap, null, 2));

  console.log(`📁 结果已保存到: postAgreementMockData.json`);
  console.log(`   映射关系数量: ${Object.keys(postAgreementMap).length}`);
} else {
  console.log('此模块未作为独立脚本运行。');
}
