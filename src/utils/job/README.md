# Mock 数据生成工具

本目录包含用于生成 Mock 数据的工具函数，参考 `cutWordCache.ts` 的形式实现。

## 工具列表

### 1. `cutWordCache.ts`

用于生成分词缓存和反向索引的工具。

**使用方法：**

```bash
node --loader ts-node/esm src/utils/job/cutWordCache.ts posts.json stopwords.json
```

### 2. `postCategory.ts`

用于生成推文分类索引的 Mock 数据。

**功能：**

- 为每个推文随机分配一个预定义的分类ID
- 使用推文ID的hash值确保结果可重现
- 支持26个预定义分类（国际、体育、娱乐等）
- 生成统计报告显示各分类的分布情况

**使用方法：**

```bash
node --loader ts-node/esm src/utils/job/postCategory.ts posts.json
```

**输入数据格式：**

```json
[
  {
    "id": "post_001",
    "content": "推文内容..."
    // 其他字段...
  }
]
```

**输出格式：**

```json
{
  "post_001": "1",
  "post_002": "3",
  "post_003": "7"
}
```

输出文件：`postCategoryMockData.json`

### 3. `postRecog.ts`

用于生成推文认同度的 Mock 数据。

**功能：**

- 为每个推文生成认同度分数（0-1之间的数值）
- 认同度分数在 0.8 上下浮动 ±0.15（有效区间：0.65-0.95）
- 基于推文ID的hash值确保结果可重现
- 生成详细的统计报告包括分数分布和分档统计

**使用方法：**

```bash
node --loader ts-node/esm src/utils/job/postRecog.ts posts.json
```

**输入数据格式：**

```json
[
  {
    "id": "post_001",
    "content": "推文内容..."
    // 其他字段...
  }
]
```

**输出格式：**

```json
{
  "post_001": 0.823,
  "post_002": 0.745,
  "post_003": 0.891
}
```

**数据格式：**

- 类型：`Record<PostArchiveId, number>`
- 值域：0-1（连续数值）
- 分布：基准值 0.8，浮动范围 ±0.15
- 有效区间：[0.65, 0.95]
- 精度：保留3位小数

**统计分档：**

- 极低认同 (0.0-0.3): < 1%
- 低认同 (0.3-0.5): < 1%
- 中等认同 (0.5-0.7): ~17%
- 高认同 (0.7-0.9): ~67%
- 极高认同 (0.9-1.0): ~17%

输出文件：`postAgreementMockData.json`

## 使用注意事项

1. **数据格式要求：** 所有工具都要求输入数据为包含 `id` 字段的对象数组
2. **可重现性：** 所有Mock数据基于推文ID的hash值生成，确保多次运行结果一致
3. **性能：** 大数据集处理时会显示进度，每1000条记录报告一次进度
4. **输出位置：** 生成的文件会保存在工具所在目录下

## 集成到应用

这些工具生成的数据可以直接用于主应用的分类筛选和认同度分析功能：

```typescript
// 在应用中使用生成的数据
import categoryMockData from './utils/job/postCategoryMockData.json';
import agreementMockData from './utils/job/postAgreementMockData.json';

// 应用分类筛选
const postCategoryMap = categoryMockData;
const postAgreementData = agreementMockData;
```
