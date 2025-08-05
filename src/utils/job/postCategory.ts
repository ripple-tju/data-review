import * as Spec from '../../specification';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Option } from 'effect';

type PostId = string;
type CategoryId = string;
type PostCategoryData = { id: string; category: string };

/**
 * 根据推文分类数据生成推文分类索引
 * @param posts 推文数据数组，包含 id 字段
 * @param postCategories 推文分类数据数组，格式为 Array<{id: string, category: string}>
 * @returns 推文分类映射表，格式为 { postId: categoryId }
 */
export function generatePostCategoryMockData(
  posts: Array<{ id: PostId; [key: string]: any }>,
  postCategories: Array<PostCategoryData>,
): Record<PostId, CategoryId> {
  const startTime = performance.now();

  console.log('🏷️ 根据推文分类数据生成推文分类索引...');
  console.log(`推文数量: ${posts.length}`);
  console.log(`分类数据数量: ${postCategories.length}`);
  console.log(`可用分类数量: ${Spec.Category.Categories.length}`);

  const postCategoryMap: Record<PostId, CategoryId> = {};

  // 将推文数据按id分组（这里实际上就是创建一个id到post的映射）
  const postsById = Object.groupBy(posts, (post) => post.id);
  console.log(`推文ID分组完成，有效ID数量: ${Object.keys(postsById).length}`);

  // 创建分类名称到分类ID的映射
  const categoryNameToId = new Map<string, CategoryId>();
  Spec.Category.Categories.forEach((cat) => {
    if (cat.name && cat.id) {
      categoryNameToId.set(cat.name.toLowerCase().trim(), cat.id);
    }
  });
  console.log(`分类映射创建完成，可用分类: ${categoryNameToId.size}`);

  let matchedCount = 0;
  let unmatchedCount = 0;
  let invalidPostIdCount = 0;

  // 统计推文分类数据中的原始分类分布
  const originalCategoryStats: Record<string, number> = {};
  postCategories.forEach((categoryData) => {
    const categoryName = categoryData.category?.toLowerCase().trim() || '未知';
    originalCategoryStats[categoryName] = (originalCategoryStats[categoryName] || 0) + 1;
  });

  console.log('📊 推文分类数据中的原始分类分布:');
  Object.entries(originalCategoryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15) // 显示前15个分类
    .forEach(([categoryName, count]) => {
      console.log(`   ${categoryName}: ${count} 条`);
    });
  console.log('');

  // 处理推文分类数据
  postCategories.forEach((categoryData, index) => {
    const { id: postId, category: categoryName } = categoryData;

    // 检查推文ID是否存在
    if (!postId || postId.trim() === '') {
      invalidPostIdCount++;
      return;
    }

    // 检查这个推文ID是否在推文数据中存在
    if (!postsById[postId]) {
      unmatchedCount++;
      return;
    }

    // 查找对应的分类ID
    const normalizedCategoryName = categoryName?.toLowerCase().trim();
    if (!normalizedCategoryName) {
      unmatchedCount++;
      return;
    }

    const categoryId = categoryNameToId.get(normalizedCategoryName);
    if (categoryId) {
      postCategoryMap[postId] = categoryId;
      matchedCount++;
    } else {
      // 尝试模糊匹配分类名称
      let foundCategoryId: CategoryId | undefined;
      for (const [name, id] of categoryNameToId.entries()) {
        if (name.includes(normalizedCategoryName) || normalizedCategoryName.includes(name)) {
          foundCategoryId = id;
          break;
        }
      }

      if (foundCategoryId) {
        postCategoryMap[postId] = foundCategoryId;
        matchedCount++;
        console.log(`   模糊匹配: "${categoryName}" -> "${foundCategoryId}"`);
      } else {
        unmatchedCount++;
        if (unmatchedCount <= 10) {
          // 只显示前10个未匹配的分类
          console.warn(`   未找到分类: "${categoryName}"`);
        }
      }
    }

    // 每处理1000条记录打印一次进度
    if ((index + 1) % 1000 === 0) {
      console.log(`   已处理: ${index + 1}/${postCategories.length} 条分类数据`);
    }
  });

  // 为没有在推文分类数据中找到的推文分配"无"分类
  const uncategorizedCategoryId = '0'; // "无"分类的ID
  let uncategorizedCount = 0;

  console.log('🔍 检查未分类的推文...');
  posts.forEach((post) => {
    if (!post.id || post.id.trim() === '') {
      return; // 跳过无效ID的推文
    }

    // 如果这个推文ID没有分配分类，则分配为"无"
    if (!postCategoryMap[post.id]) {
      postCategoryMap[post.id] = uncategorizedCategoryId;
      uncategorizedCount++;
    }
  });

  const endTime = performance.now();
  const processingTime = endTime - startTime;

  console.log(`✅ 推文分类索引生成完成，耗时: ${processingTime.toFixed(2)}ms`);
  console.log(`   生成映射关系: ${Object.keys(postCategoryMap).length} 条`);
  console.log(`   匹配成功: ${matchedCount} 条`);
  console.log(`   未匹配: ${unmatchedCount} 条`);
  console.log(`   无效推文ID: ${invalidPostIdCount} 条`);
  console.log(`   补充为"无"分类: ${uncategorizedCount} 条`);

  // 统计各分类的分布情况
  const categoryStats: Record<CategoryId, number> = {};
  Object.values(postCategoryMap).forEach((categoryId) => {
    categoryStats[categoryId] = (categoryStats[categoryId] || 0) + 1;
  });

  console.log('📊 最终分类分布统计（按分类ID排序）:');
  // 按分类ID排序显示所有分类
  Spec.Category.Categories.sort((a, b) => parseInt(a.id) - parseInt(b.id)).forEach((cat) => {
    const count = categoryStats[cat.id] || 0;
    console.log(`   ${cat.name} (${cat.id}): ${count} 条推文`);
  });

  return postCategoryMap;
}

// 命令行入口点
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [dataJSONPath, categoriesJSONPath] = process.argv.slice(2);
  console.log('参数:', { dataJSONPath, categoriesJSONPath });

  if (!dataJSONPath) {
    throw new Error('请提供推文数据文件路径');
  }

  if (!categoriesJSONPath) {
    throw new Error('请提供推文分类数据文件路径');
  }

  const posts = Option.fromNullable(dataJSONPath).pipe(
    Option.map((path) => resolve(__dirname, path.trim())),
    Option.map((path) => readFileSync(path, 'utf-8')),
    Option.map((content) => JSON.parse(content)),
    Option.getOrThrowWith(() => new Error(`推文数据文件未找到或无效`)),
  );

  const postCategories = Option.fromNullable(categoriesJSONPath).pipe(
    Option.map((path) => resolve(__dirname, path.trim())),
    Option.map((path) => readFileSync(path, 'utf-8')),
    Option.map((content) => JSON.parse(content)),
    Option.getOrThrowWith(() => new Error(`推文分类数据文件未找到或无效`)),
  );

  // 确保推文数据格式正确
  if (!Array.isArray(posts)) {
    throw new Error('推文数据必须是数组格式');
  }

  if (posts.length === 0) {
    throw new Error('推文数据为空');
  }

  if (!posts[0].id) {
    throw new Error('推文数据缺少必需的 id 字段');
  }

  // 确保推文分类数据格式正确
  if (!Array.isArray(postCategories)) {
    throw new Error('推文分类数据必须是数组格式');
  }

  if (postCategories.length === 0) {
    throw new Error('推文分类数据为空');
  }

  if (!postCategories[0].id || !postCategories[0].category) {
    throw new Error('推文分类数据缺少必需的 id 或 category 字段');
  }

  const postCategoryMap = generatePostCategoryMockData(posts, postCategories);

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
