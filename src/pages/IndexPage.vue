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

    <!-- 数据展示区域 -->
    <div v-if="allPostView.length > 0" style="width: 100%">
      <div>
        <h3>全平台身份</h3>
        <AppPostListStatistics
          :query="query"
          :postViewList="allPostView"
          :cutWordCache="cutwordCache"
        />
      </div>
      <div v-for="(item, index) in postViewListGroupByIdentity" :key="index">
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
import { onMounted, ref } from 'vue';
import AppPostListStatistics from './components/PostListStatistics.vue';
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

// 文件上传相关状态
const archiveFile = ref<File | null>(null);
const cutwordFile = ref<File | null>(null);
const isProcessing = ref(false);
const uploadStatus = ref<{
  type: 'success' | 'error';
  message: string;
} | null>(null);

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
    const archiveData = await readFileAsJSON(archiveFile.value);
    console.log('Archive data loaded:', archiveData);

    // 读取分词缓存文件（如果有）
    let cutwordData: Array<{ id: string; cut: Array<string> }> = [];
    if (cutwordFile.value) {
      try {
        cutwordData = await readFileAsJSON(cutwordFile.value);
        console.log('Cutword cache loaded:', cutwordData);
      } catch (error) {
        console.warn('分词缓存文件读取失败，将使用空缓存:', error);
      }
    }

    // 处理数据
    await processData(archiveData.slice(0, 1000), cutwordData);

    uploadStatus.value = {
      type: 'success',
      message: `数据处理成功！加载了 ${allPostView.value.length} 个帖子和 ${idList.value.length} 个身份`,
    };
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
  isProcessing.value = true;
  uploadStatus.value = null;

  try {
    const test = await fetch('/data/facebook.gen.json')
      .then((response) => response.json())
      .catch((error) => {
        console.error('Error fetching data:', error);
        throw new Error('无法加载默认存档数据');
      });

    const testCache = (await fetch('/data/archive-cutwords-cache.json')
      .then((response) => response.json())
      .catch((error) => {
        console.error('Error fetching cache:', error);
        return []; // 如果缓存加载失败，使用空数组
      })) as Array<{
      id: Spec.PostArchive.Type['id'];
      cut: Array<string>;
    }>;

    await processData(test.slice(15000, 16000), testCache);

    uploadStatus.value = {
      type: 'success',
      message: `默认数据加载成功！加载了 ${allPostView.value.length} 个帖子和 ${idList.value.length} 个身份`,
    };
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
  // 设置分词缓存
  cutwordCache.value = cutwordData;

  // 解析并设置查询
  const parsedData = parseRippleForQuery(archiveData);
  query.value = Query(parsedData);

  // 获取身份列表和帖子列表
  idList.value = await query.value.Target('fb').getIdentityViewList();
  allPostView.value = await query.value.Target('fb').getPostViewList();

  // 按身份分组帖子
  postViewListGroupByIdentity.value = await Promise.all(
    idList.value.map(async (id) => ({
      name: id.archive[0]?.name || 'Unknown',
      postViewList: await query.value.Target('fb').getPostViewListByIdentityId(id.identity.id),
    })),
  );
};

onMounted(async () => {
  // 页面加载时自动加载默认数据
  await loadDefaultData();
});
</script>
