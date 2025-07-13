<template>
  <div class="identity-selector">
    <q-card class="q-pa-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">
          <q-icon name="people" class="q-mr-sm" />
          身份筛选器
        </div>
        <div class="text-caption q-mb-md text-grey">
          从 {{ availableIdentities.length }} 个身份中选择需要关注的身份进行统计分析
        </div>

        <!-- 操作按钮 -->
        <div class="row q-gutter-sm q-mb-md">
          <q-btn
            size="sm"
            color="primary"
            outline
            label="全选"
            @click="selectAll"
            icon="select_all"
          />
          <q-btn
            size="sm"
            color="negative"
            outline
            label="全不选"
            @click="selectNone"
            icon="deselect"
          />
          <q-btn
            size="sm"
            color="secondary"
            outline
            label="反选"
            @click="invertSelection"
            icon="swap_horiz"
          />
          <q-btn
            size="sm"
            color="positive"
            outline
            label="仅选中国媒体"
            @click="selectChineseMedia"
            icon="flag"
          />
        </div>

        <!-- 搜索框 -->
        <q-input
          v-model="searchText"
          label="搜索身份名称或代码"
          outlined
          dense
          clearable
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>

        <!-- 统计信息 -->
        <div class="row q-gutter-md q-mb-md">
          <q-chip
            color="primary"
            text-color="white"
            icon="people"
            :label="`已选择: ${selectedIdentities.length}`"
          />
          <q-chip
            color="grey"
            text-color="white"
            icon="visibility"
            :label="`可选择: ${filteredIdentities.length}`"
          />
          <q-chip
            color="info"
            text-color="white"
            icon="database"
            :label="`总计: ${availableIdentities.length}`"
          />
        </div>

        <!-- 身份列表 -->
        <div class="identity-list" style="max-height: 400px; overflow-y: auto">
          <q-list bordered separator>
            <q-item-label header class="text-weight-bold">
              身份列表 ({{ filteredIdentities.length }} 项)
            </q-item-label>

            <q-item
              v-for="identity in filteredIdentities"
              :key="identity.id"
              clickable
              @click="toggleIdentity(identity.id)"
              :class="{ 'bg-blue-1': selectedIdentities.includes(identity.id) }"
            >
              <q-item-section side>
                <q-checkbox
                  :model-value="selectedIdentities.includes(identity.id)"
                  @update:model-value="toggleIdentity(identity.id)"
                />
              </q-item-section>

              <q-item-section>
                <q-item-label>
                  <span class="text-weight-medium">
                    {{ identity.name || identity.code || '(无名称)' }}
                  </span>
                  <q-badge
                    v-if="isChineseMedia(identity)"
                    color="red"
                    text-color="white"
                    label="中国媒体"
                    class="q-ml-sm"
                  />
                </q-item-label>
                <q-item-label caption>
                  <span class="text-grey-7"> 代码: {{ identity.code || '(无代码)' }} </span>
                  <br />
                  <span class="text-grey-6 text-caption"> ID: {{ identity.id }} </span>
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-chip
                  v-if="selectedIdentities.includes(identity.id)"
                  size="sm"
                  color="positive"
                  text-color="white"
                  icon="check"
                  label="已选"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { IDENTITY_LIST, EXCLUDE_IDENTITY_LIST } from 'src/specification/IdentityData';

// Props
defineProps<{
  modelValue?: string[];
}>();

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

// 响应式数据
const searchText = ref('');
const selectedIdentities = ref<string[]>([]);

// 计算可用身份列表（从 IDENTITY_LIST 中排除 EXCLUDE_IDENTITY_LIST）
const availableIdentities = computed(() => {
  const excludeIds = new Set(EXCLUDE_IDENTITY_LIST.map((item) => item.id));
  return IDENTITY_LIST.filter((identity) => !excludeIds.has(identity.id));
});

// 根据搜索文本过滤身份
const filteredIdentities = computed(() => {
  if (!searchText.value.trim()) {
    return availableIdentities.value;
  }

  const searchLower = searchText.value.toLowerCase();
  return availableIdentities.value.filter((identity) => {
    const name = (identity.name || '').toLowerCase();
    const code = (identity.code || '').toLowerCase();
    const id = identity.id.toLowerCase();

    return name.includes(searchLower) || code.includes(searchLower) || id.includes(searchLower);
  });
});

// 判断是否为中国媒体
const isChineseMedia = (identity: (typeof IDENTITY_LIST)[0]) => {
  const chineseCodes = [
    'iZhejiang',
    'XH.NewsAgency',
    'ChinaGlobalTVNetwork',
    'globaltimesnews',
    'chinadaily',
    'peopledaily',
    'ChinaNewsService',
    'EDNewsChina',
    'iChongqing',
    'hihainan1',
    'LoveFujian',
    'guangmingdailyChina',
    'guangdongtoday',
    'ShandongprovinceChina',
    'DateTianjin',
    'thesilkroadshaanxi',
    'MeetJiangxi',
    'discovergansu',
    'TianshanFairyland',
    'Guizhouecho',
    'GoJiangsu',
    'shanghaieyeSMG',
  ];

  return chineseCodes.includes(identity.code || '') || /[\u4e00-\u9fff]/.test(identity.name || '');
};

// 方法
const toggleIdentity = (identityId: string) => {
  const index = selectedIdentities.value.indexOf(identityId);
  if (index > -1) {
    selectedIdentities.value.splice(index, 1);
  } else {
    selectedIdentities.value.push(identityId);
  }
  emit('update:modelValue', [...selectedIdentities.value]);
};

const selectAll = () => {
  selectedIdentities.value = [...availableIdentities.value.map((item) => item.id)];
  emit('update:modelValue', [...selectedIdentities.value]);
};

const selectNone = () => {
  selectedIdentities.value = [];
  emit('update:modelValue', []);
};

const invertSelection = () => {
  const allIds = availableIdentities.value.map((item) => item.id);
  selectedIdentities.value = allIds.filter((id) => !selectedIdentities.value.includes(id));
  emit('update:modelValue', [...selectedIdentities.value]);
};

const selectChineseMedia = () => {
  selectedIdentities.value = availableIdentities.value
    .filter((identity) => isChineseMedia(identity))
    .map((identity) => identity.id);
  emit('update:modelValue', [...selectedIdentities.value]);
};

// 监听外部传入的值变化
watch(
  () => selectedIdentities.value,
  (newValue) => {
    emit('update:modelValue', [...newValue]);
  },
  { deep: true },
);

// 初始化：默认选择所有中国媒体
const initializeSelection = () => {
  selectChineseMedia();
};

// 组件挂载时初始化
initializeSelection();
</script>

<style lang="scss" scoped>
.identity-selector {
  .identity-list {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }

  .q-item {
    transition: background-color 0.2s ease;

    &:hover {
      background-color: #f5f5f5;
    }
  }
}
</style>
