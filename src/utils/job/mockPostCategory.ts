import * as Spec from '../../specification';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Option } from 'effect';

type PostId = string;
type CategoryId = string;

/**
 * 生成推文分类索引的 Mock 数据
 * @param posts 推文数据数组，包含 id 字段
 * @returns 推文分类映射表，格式为 { postId: categoryId }
 */
export function generatePostCategoryMockData(
  posts: Array<{ id: PostId; [key: string]: any }>,
): Record<PostId, CategoryId> {
  const startTime = performance.now();

  console.log('🏷️ 生成推文分类索引 Mock 数据...');
  console.log(`推文数量: ${posts.length}`);
  console.log(`可用分类数量: ${Spec.Category.Categories.length}`);

  const postCategoryMap: Record<PostId, CategoryId> = {};
  const availableCategories = Spec.Category.Categories.map((cat) => cat.id).filter(
    (id) => id && id.trim() !== '',
  );

  console.log(`有效分类数量: ${availableCategories.length}`);
  if (availableCategories.length === 0) {
    throw new Error('没有可用的有效分类');
  }

  // 为每个推文随机分配一个分类
  posts.forEach((post, index) => {
    // 确保推文有有效的ID
    if (!post.id || post.id.trim() === '') {
      console.warn(`跳过无效ID的推文，索引: ${index}`);
      return;
    }

    // 使用简单的伪随机算法，基于推文ID的hash值确保结果可重现
    const hash = post.id.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a; // 转换为32位整数
    }, 0);

    const categoryIndex = Math.abs(hash) % availableCategories.length;
    const categoryId = availableCategories[categoryIndex];

    // 确保每个推文都分配一个分类
    if (categoryId && categoryId.trim() !== '') {
      postCategoryMap[post.id] = categoryId;
    } else {
      // 如果计算出的分类无效，使用第一个有效分类作为默认值
      const defaultCategory = availableCategories[0];
      if (defaultCategory) {
        postCategoryMap[post.id] = defaultCategory;
        console.warn(`推文 ${post.id} 使用默认分类: ${defaultCategory}`);
      } else {
        console.error(`无法为推文 ${post.id} 分配分类: 没有可用的有效分类`);
      }
    }

    // 每处理1000条记录打印一次进度
    if ((index + 1) % 1000 === 0) {
      console.log(`   已处理: ${index + 1}/${posts.length} 条推文`);
    }
  });

  const endTime = performance.now();
  const processingTime = endTime - startTime;

  console.log(`✅ 推文分类索引生成完成，耗时: ${processingTime.toFixed(2)}ms`);
  console.log(`   生成映射关系: ${Object.keys(postCategoryMap).length} 条`);

  // 统计各分类的分布情况
  const categoryStats: Record<CategoryId, number> = {};
  Object.values(postCategoryMap).forEach((categoryId) => {
    categoryStats[categoryId] = (categoryStats[categoryId] || 0) + 1;
  });

  console.log('📊 分类分布统计:');
  Object.entries(categoryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10) // 显示前10个分类
    .forEach(([categoryId, count]) => {
      const categoryName =
        Spec.Category.Categories.find((cat) => cat.id === categoryId)?.name || '未知';
      console.log(`   ${categoryName} (${categoryId}): ${count} 条推文`);
    });

  return postCategoryMap;
}

// 命令行入口点
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
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

  const postCategoryMap = generatePostCategoryMockData(posts);

  // 从推文数据文件名中提取日期后缀 (如 .gen.0805.json)
  const dateSuffix = dataJSONPath?.match(/(\.[^.]+\.\d{4}\.json)$/)?.[1] || '';
  const baseOutputName = 'postCategoryMockData';
  const outputFileName = dateSuffix ? `${baseOutputName}${dateSuffix}` : `${baseOutputName}.json`;

  console.log(`🔍 日期后缀提取: "${dateSuffix}"`);
  console.log(`📁 输出文件名: ${outputFileName}`);

  const outputPath = resolve(__dirname, outputFileName);
  writeFileSync(outputPath, JSON.stringify(postCategoryMap, null, 2));

  console.log(`📁 结果已保存到: ${outputFileName}`);
  console.log(`   映射关系数量: ${Object.keys(postCategoryMap).length}`);
} else {
  console.log('此模块未作为独立脚本运行。');
}
