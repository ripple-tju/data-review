<template>
  <q-page class="column items-center justify-evenly">
    <!-- 文件上传区域 -->
    <div class="file-upload-section q-pa-md" style="width: 100%; max-width: 800px">
      <q-card class="q-pa-md">
        <q-card-section>
          <div class="text-h6 q-mb-md">数据文件上传</div>

          <div class="row q-gutter-md">
            <div class="col">
              <q-file
                v-model="archiveFile"
                label="上传存档数据文件 (JSON)"
                accept=".json"
                outlined
                clearable
                @update:model-value="onArchiveFileChange"
              >
                <template #prepend>
                  <q-icon name="upload_file" />
                </template>
              </q-file>
              <div class="text-caption q-mt-xs text-grey">
                支持 parseRippleForQuery 格式的 JSON 文件
              </div>
            </div>

            <div class="col">
              <q-file
                v-model="cutwordFile"
                label="上传分词缓存文件 (JSON)"
                accept=".json"
                outlined
                clearable
                @update:model-value="onCutwordFileChange"
              >
                <template #prepend>
                  <q-icon name="upload_file" />
                </template>
              </q-file>
              <div class="text-caption q-mt-xs text-grey">分词缓存数据，可选上传</div>
            </div>
          </div>

          <div class="row q-gutter-md q-mt-md">
            <q-btn
              color="primary"
              label="处理数据"
              @click="processUploadedData"
              :disable="!archiveFile || isProcessing"
              :loading="isProcessing"
            />

            <q-btn
              color="secondary"
              label="使用示例数据"
              @click="loadDefaultData"
              :disable="isProcessing"
              outline
            />
          </div>

          <div v-if="uploadStatus" class="q-mt-md">
            <q-banner
              :class="uploadStatus.type === 'error' ? 'bg-negative' : 'bg-positive'"
              text-color="white"
            >
              {{ uploadStatus.message }}
            </q-banner>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- 身份筛选区域 -->
    <div
      v-if="allPostView.length > 0"
      class="identity-filter-section q-pa-md"
      style="width: 100%; max-width: 800px"
    >
      <IdentitySelector v-model="selectedIdentityIds" />

      <!-- 数据处理按钮 -->
      <div class="text-center q-mt-md">
        <q-btn
          color="primary"
          label="开始数据统计分析"
          icon="analytics"
          size="md"
          @click="processSelectedData"
          :disable="selectedIdentityIds.length === 0 || isProcessingAnalysis"
          :loading="isProcessingAnalysis"
          class="q-px-xl"
        />
        <div class="text-caption q-mt-xs text-grey">
          已选择 {{ selectedIdentityIds.length }} 个身份，点击开始分析
        </div>
      </div>
    </div>

    <!-- 数据展示区域 -->
    <div v-if="analysisResults" style="width: 100%">
      <!-- 调试信息 -->
      <div class="q-pa-md q-mb-md" style="background: #f5f5f5; border-radius: 4px">
        <div class="text-caption">
          <strong>调试信息：</strong><br />
          全平台帖子数量：{{ analysisResults.filteredAllPostView.length }}<br />
          身份组数量：{{ analysisResults.filteredPostViewListGroupByIdentity.length }}<br />
          身份组名称：{{
            analysisResults.filteredPostViewListGroupByIdentity.map((g) => g.name).join(', ')
          }}
        </div>
      </div>

      <div>
        <h3>
          全平台身份统计
          <q-chip
            color="primary"
            text-color="white"
            icon="people"
            :label="`已选择 ${selectedIdentityIds.length} 个身份`"
            class="q-ml-sm"
          />
        </h3>
        <AppPostListStatistics
          :query="query"
          :postViewList="analysisResults.filteredAllPostView"
          :cutWordCache="cutwordCache"
        />
      </div>
      <div
        v-for="(item, index) in analysisResults.filteredPostViewListGroupByIdentity"
        :key="index"
      >
        <h3>身份：{{ item.name }}</h3>
        <AppPostListStatistics
          :query="query"
          :postViewList="item.postViewList"
          :cutWordCache="cutwordCache"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import AppPostListStatistics from './components/PostListStatistics.vue';
import IdentitySelector from 'src/components/IdentitySelector.vue';
import { Query, QueryInterface } from 'src/query';
import { parseForQuery } from 'src/query/transform';
import { parseRippleForQuery } from 'src/query/transformRipple';
import * as Spec from 'src/specification';

const query = ref<QueryInterface>(Query(parseRippleForQuery([])));
const idList = ref<Array<Spec.IdentityView.Type>>([]);
const allPostView = ref<Array<Spec.PostView.Type>>([]);
const postViewListGroupByIdentity = ref<
  Array<{
    name: string;
    postViewList: Array<Spec.PostView.Type>;
  }>
>([]);
const cutwordCache = ref<
  Array<{
    id: Spec.PostArchive.Type['id'];
    cut: Array<string>;
  }>
>([]);

// 身份筛选相关状态
const selectedIdentityIds = ref<string[]>([]);
const isProcessingAnalysis = ref(false);
const analysisResults = ref<{
  filteredAllPostView: Array<Spec.PostView.Type>;
  filteredPostViewListGroupByIdentity: Array<{
    name: string;
    postViewList: Array<Spec.PostView.Type>;
  }>;
} | null>(null);

// 文件上传相关状态
const archiveFile = ref<File | null>(null);
const cutwordFile = ref<File | null>(null);
const isProcessing = ref(false);
const uploadStatus = ref<{
  type: 'success' | 'error';
  message: string;
} | null>(null);

// 🔥 [身份筛选] 处理选择的身份进行数据分析
const processSelectedData = async () => {
  if (selectedIdentityIds.value.length === 0) {
    return;
  }

  isProcessingAnalysis.value = true;

  try {
    const analysisStart = performance.now();
    console.log('🔍 [身份分析] 开始处理选择的身份数据...');
    console.log('🔍 [身份分析] 选择的身份ID:', selectedIdentityIds.value);

    // 过滤全平台数据
    const filteredAllPostView = allPostView.value.filter((postView) =>
      selectedIdentityIds.value.includes(postView.post.author),
    ); // 过滤分组数据 - 直接根据选择的身份ID重新生成分组
    console.log('🔍 [调试] 开始重新生成选中身份的分组数据...');

    const filteredPostViewListGroupByIdentity = [];

    for (const selectedId of selectedIdentityIds.value) {
      // 找到对应的身份信息
      const identity = idList.value.find((id) => id.identity.id === selectedId);
      if (identity) {
        // 获取该身份的帖子列表
        const postViewList = await query.value.Target('fb').getPostViewListByIdentityId(selectedId);
        const identityName = identity.archive[0]?.name || 'Unknown';

        console.log(
          `🔍 [调试] 为身份 "${identityName}" (${selectedId}) 生成分组，帖子数量: ${postViewList.length}`,
        );

        filteredPostViewListGroupByIdentity.push({
          name: identityName,
          postViewList: postViewList,
        });
      }
    }

    // 保存分析结果
    analysisResults.value = {
      filteredAllPostView,
      filteredPostViewListGroupByIdentity,
    };

    const analysisEnd = performance.now();
    console.log(`🔍 [身份分析] 数据分析完成，耗时: ${(analysisEnd - analysisStart).toFixed(2)}ms`);
    console.log(`🔍 [身份分析] 筛选后帖子数量: ${filteredAllPostView.length}`);
    console.log(`🔍 [身份分析] 筛选后身份组数量: ${filteredPostViewListGroupByIdentity.length}`);
    console.log(`🔍 [身份分析] 筛选后身份组详情:`, filteredPostViewListGroupByIdentity);
  } catch (error) {
    console.error('身份数据分析失败:', error);
  } finally {
    isProcessingAnalysis.value = false;
  }
};

// 文件读取辅助函数
const readFileAsJSON = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = JSON.parse(event.target?.result as string);
        resolve(result);
      } catch (error) {
        reject(new Error('文件格式错误，请确保是有效的JSON文件'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

// 处理存档文件上传
const onArchiveFileChange = (file: File | null) => {
  archiveFile.value = file;
  uploadStatus.value = null;
};

// 处理分词缓存文件上传
const onCutwordFileChange = (file: File | null) => {
  cutwordFile.value = file;
  uploadStatus.value = null;
};

// 处理上传的数据
const processUploadedData = async () => {
  const startTime = performance.now();
  console.log('🚀 [性能分析] 开始处理上传数据');

  if (!archiveFile.value) {
    uploadStatus.value = {
      type: 'error',
      message: '请先上传存档数据文件',
    };
    return;
  }

  isProcessing.value = true;
  uploadStatus.value = null;

  try {
    // 读取存档数据文件
    const fileReadStart = performance.now();
    console.log('📁 [性能分析] 开始读取存档数据文件...');
    const archiveData = await readFileAsJSON(archiveFile.value);
    const fileReadEnd = performance.now();
    console.log(
      `📁 [性能分析] 存档数据文件读取完成，耗时: ${(fileReadEnd - fileReadStart).toFixed(2)}ms`,
    );
    console.log(
      `📊 [性能分析] 存档数据大小: ${JSON.stringify(archiveData).length} 字符，${archiveData.length} 条记录`,
    );

    // 读取分词缓存文件（如果有）
    let cutwordData: Array<{ id: string; cut: Array<string> }> = [];
    if (cutwordFile.value) {
      try {
        const cutwordReadStart = performance.now();
        console.log('📁 [性能分析] 开始读取分词缓存文件...');
        cutwordData = await readFileAsJSON(cutwordFile.value);
        const cutwordReadEnd = performance.now();
        console.log(
          `📁 [性能分析] 分词缓存文件读取完成，耗时: ${(cutwordReadEnd - cutwordReadStart).toFixed(2)}ms`,
        );
        console.log(`📊 [性能分析] 分词缓存大小: ${cutwordData.length} 条记录`);
      } catch (error) {
        console.warn('分词缓存文件读取失败，将使用空缓存:', error);
      }
    }

    // 处理数据
    const processStart = performance.now();
    console.log('⚙️ [性能分析] 开始处理数据...');
    // const dataToProcess = archiveData.slice(0, 10000);
    const dataToProcess = archiveData;
    console.log(`📊 [性能分析] 实际处理数据量: ${dataToProcess.length} 条记录`);

    await processData(dataToProcess, cutwordData);

    const processEnd = performance.now();
    console.log(`⚙️ [性能分析] 数据处理完成，耗时: ${(processEnd - processStart).toFixed(2)}ms`);

    const totalTime = performance.now() - startTime;
    console.log(
      `✅ [性能分析] 整个流程完成，总耗时: ${totalTime.toFixed(2)}ms (${(totalTime / 1000).toFixed(2)}秒)`,
    );

    uploadStatus.value = {
      type: 'success',
      message: `数据处理成功！加载了 ${allPostView.value.length} 个帖子和 ${idList.value.length} 个身份，耗时 ${(totalTime / 1000).toFixed(2)}秒`,
    };

    // 重置分析结果，让用户重新选择
    analysisResults.value = null;
  } catch (error) {
    console.error('Data processing error:', error);
    uploadStatus.value = {
      type: 'error',
      message: `数据处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  } finally {
    isProcessing.value = false;
  }
};

// 加载默认示例数据
const loadDefaultData = async () => {
  const startTime = performance.now();
  console.log('🚀 [性能分析] 开始加载默认数据');

  isProcessing.value = true;
  uploadStatus.value = null;

  try {
    const fetchStart = performance.now();
    console.log('🌐 [性能分析] 开始获取默认存档数据...');
    const test = await fetch('/data/default.json')
      .then((response) => response.json())
      .catch((error) => {
        console.error('Error fetching data:', error);
        throw new Error('无法加载默认存档数据');
      });
    const fetchEnd = performance.now();
    console.log(
      `🌐 [性能分析] 默认存档数据获取完成，耗时: ${(fetchEnd - fetchStart).toFixed(2)}ms`,
    );

    const cacheStart = performance.now();
    console.log('🌐 [性能分析] 开始获取默认分词缓存...');
    const testCache = (await fetch('/data/default-jieba.json')
      .then((response) => response.json())
      .catch((error) => {
        console.error('Error fetching cache:', error);
        return []; // 如果缓存加载失败，使用空数组
      })) as Array<{
      id: Spec.PostArchive.Type['id'];
      cut: Array<string>;
    }>;
    const cacheEnd = performance.now();
    console.log(
      `🌐 [性能分析] 默认分词缓存获取完成，耗时: ${(cacheEnd - cacheStart).toFixed(2)}ms`,
    );

    const processStart = performance.now();
    console.log('⚙️ [性能分析] 开始处理默认数据...');
    await processOldData(test, testCache);
    const processEnd = performance.now();
    console.log(
      `⚙️ [性能分析] 默认数据处理完成，耗时: ${(processEnd - processStart).toFixed(2)}ms`,
    );

    const queryStart = performance.now();
    console.log('📋 [性能分析] 开始查询帖子视图...');
    const b = await query.value.Target('fb').getPostViewList();
    const queryEnd = performance.now();
    console.log(`📋 [性能分析] 帖子视图查询完成，耗时: ${(queryEnd - queryStart).toFixed(2)}ms`);
    console.log('Default data loaded:', b);

    const totalTime = performance.now() - startTime;
    console.log(
      `✅ [性能分析] 默认数据加载完成，总耗时: ${totalTime.toFixed(2)}ms (${(totalTime / 1000).toFixed(2)}秒)`,
    );

    uploadStatus.value = {
      type: 'success',
      message: `默认数据加载成功！加载了 ${allPostView.value.length} 个帖子和 ${idList.value.length} 个身份，耗时 ${(totalTime / 1000).toFixed(2)}秒`,
    };

    // 重置分析结果，让用户重新选择
    analysisResults.value = null;
  } catch (error) {
    console.error('Default data loading error:', error);
    uploadStatus.value = {
      type: 'error',
      message: `默认数据加载失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  } finally {
    isProcessing.value = false;
  }
};

// 数据处理核心逻辑
const processData = async (
  archiveData: any,
  cutwordData: Array<{ id: string; cut: Array<string> }>,
) => {
  console.log('🔧 [性能分析] 进入 processData 函数');

  // 设置分词缓存
  const cacheStart = performance.now();
  console.log('💾 [性能分析] 开始设置分词缓存...');
  cutwordCache.value = cutwordData;
  const cacheEnd = performance.now();
  console.log(`💾 [性能分析] 分词缓存设置完成，耗时: ${(cacheEnd - cacheStart).toFixed(2)}ms`);

  // 解析并设置查询
  const parseStart = performance.now();
  console.log('🔍 [性能分析] 开始解析数据...');
  const parsedData = parseRippleForQuery(archiveData);
  const parseEnd = performance.now();
  console.log(`🔍 [性能分析] 数据解析完成，耗时: ${(parseEnd - parseStart).toFixed(2)}ms`);

  const queryStart = performance.now();
  console.log('📋 [性能分析] 开始创建查询对象...');
  query.value = Query(parsedData);
  const queryEnd = performance.now();
  console.log(`📋 [性能分析] 查询对象创建完成，耗时: ${(queryEnd - queryStart).toFixed(2)}ms`);

  // 获取身份列表和帖子列表
  const identityStart = performance.now();
  console.log('👤 [性能分析] 开始获取身份列表...');
  idList.value = await query.value.Target('fb').getIdentityViewList();
  const identityEnd = performance.now();
  console.log(
    `👤 [性能分析] 身份列表获取完成，耗时: ${(identityEnd - identityStart).toFixed(2)}ms，获得 ${idList.value.length} 个身份`,
  );

  const postStart = performance.now();
  console.log('📝 [性能分析] 开始获取帖子列表...');
  allPostView.value = await query.value.Target('fb').getPostViewList();
  const postEnd = performance.now();
  console.log(
    `📝 [性能分析] 帖子列表获取完成，耗时: ${(postEnd - postStart).toFixed(2)}ms，获得 ${allPostView.value.length} 个帖子`,
  );

  // 按身份分组帖子
  const groupStart = performance.now();
  console.log('📊 [性能分析] 开始按身份分组帖子...');
  postViewListGroupByIdentity.value = await Promise.all(
    idList.value.map(async (id, index) => {
      const groupItemStart = performance.now();
      const result = {
        name: id.archive[0]?.name || 'Unknown',
        postViewList: await query.value.Target('fb').getPostViewListByIdentityId(id.identity.id),
      };
      const groupItemEnd = performance.now();
      console.log(
        `📊 [性能分析] 身份 ${index + 1}/${idList.value.length} (${result.name}) 分组完成，耗时: ${(groupItemEnd - groupItemStart).toFixed(2)}ms，获得 ${result.postViewList.length} 个帖子`,
      );
      return result;
    }),
  );
  const groupEnd = performance.now();
  console.log(`📊 [性能分析] 按身份分组完成，总耗时: ${(groupEnd - groupStart).toFixed(2)}ms`);

  console.log('✅ [性能分析] processData 函数执行完成');
};

// 数据处理核心逻辑
const processOldData = async (
  archiveData: any,
  cutwordData: Array<{ id: string; cut: Array<string> }>,
) => {
  console.log('🔧 [性能分析] 进入 processOldData 函数');

  // 设置分词缓存
  const cacheStart = performance.now();
  console.log('💾 [性能分析] 开始设置分词缓存...');
  cutwordCache.value = cutwordData;
  const cacheEnd = performance.now();
  console.log(`💾 [性能分析] 分词缓存设置完成，耗时: ${(cacheEnd - cacheStart).toFixed(2)}ms`);

  // 解析并设置查询
  const parseStart = performance.now();
  console.log('🔍 [性能分析] 开始解析旧格式数据...');
  const parsedData = parseForQuery(archiveData);
  const parseEnd = performance.now();
  console.log(`🔍 [性能分析] 旧格式数据解析完成，耗时: ${(parseEnd - parseStart).toFixed(2)}ms`);

  const queryStart = performance.now();
  console.log('📋 [性能分析] 开始创建查询对象...');
  query.value = Query(parsedData);
  const queryEnd = performance.now();
  console.log(`📋 [性能分析] 查询对象创建完成，耗时: ${(queryEnd - queryStart).toFixed(2)}ms`);

  // 获取身份列表和帖子列表
  const identityStart = performance.now();
  console.log('👤 [性能分析] 开始获取身份列表...');
  idList.value = await query.value.Target('fb').getIdentityViewList();
  const identityEnd = performance.now();
  console.log(
    `👤 [性能分析] 身份列表获取完成，耗时: ${(identityEnd - identityStart).toFixed(2)}ms，获得 ${idList.value.length} 个身份`,
  );

  const postStart = performance.now();
  console.log('📝 [性能分析] 开始获取帖子列表...');
  allPostView.value = await query.value.Target('fb').getPostViewList();
  const postEnd = performance.now();
  console.log(
    `📝 [性能分析] 帖子列表获取完成，耗时: ${(postEnd - postStart).toFixed(2)}ms，获得 ${allPostView.value.length} 个帖子`,
  );

  // 按身份分组帖子
  const groupStart = performance.now();
  console.log('📊 [性能分析] 开始按身份分组帖子...');
  postViewListGroupByIdentity.value = await Promise.all(
    idList.value.map(async (id, index) => {
      const groupItemStart = performance.now();
      const result = {
        name: id.archive[0]?.name || 'Unknown',
        postViewList: await query.value.Target('fb').getPostViewListByIdentityId(id.identity.id),
      };
      const groupItemEnd = performance.now();
      console.log(
        `📊 [性能分析] 身份 ${index + 1}/${idList.value.length} (${result.name}) 分组完成，耗时: ${(groupItemEnd - groupItemStart).toFixed(2)}ms，获得 ${result.postViewList.length} 个帖子`,
      );
      return result;
    }),
  );
  const groupEnd = performance.now();
  console.log(`📊 [性能分析] 按身份分组完成，总耗时: ${(groupEnd - groupStart).toFixed(2)}ms`);

  console.log('✅ [性能分析] processOldData 函数执行完成');
};

onMounted(async () => {
  // 页面加载时自动加载默认数据
  // await loadDefaultData();
});
</script>
