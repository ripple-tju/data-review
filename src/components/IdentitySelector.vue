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
                </q-item-label>
                <q-item-label caption>
                  <span class="text-grey-7"> 代码: {{ identity.code || '(无代码)' }} </span>
                  <br />
                  <span class="text-grey-6 text-caption"> ID: {{ identity.id }} </span>
                  <br />
                  <span class="text-info text-caption">
                    📝 帖子: {{ getIdentityStats(identity.id).postCount }} 条 | 📁 存档:
                    {{ getIdentityStats(identity.id).archiveCount }} 个
                  </span>
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
import * as Spec from 'src/specification';

// Props
const props = defineProps<{
  modelValue?: string[];
  allPostView?: Array<Spec.PostView.Type>; // 添加帖子数据用于统计
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

// 预计算所有身份的统计信息（使用计算属性缓存，避免重复计算）
const identityStatsMap = computed(() => {
  const statsMap = new Map<string, { postCount: number; archiveCount: number }>();

  if (!props.allPostView) {
    // 如果没有数据，为所有可用身份返回0统计
    availableIdentities.value.forEach((identity) => {
      statsMap.set(identity.id, { postCount: 0, archiveCount: 0 });
    });
    return statsMap;
  }

  // 初始化所有身份的统计为0
  availableIdentities.value.forEach((identity) => {
    statsMap.set(identity.id, { postCount: 0, archiveCount: 0 });
  });

  // 遍历所有帖子，累加每个作者的统计信息
  props.allPostView.forEach((postView) => {
    const authorId = postView.post.author;
    if (statsMap.has(authorId)) {
      const currentStats = statsMap.get(authorId)!;
      currentStats.postCount += 1;
      currentStats.archiveCount += postView.archive?.length || 0;
    }
  });

  return statsMap;
});

// 获取身份统计信息的快速查找函数
const getIdentityStats = (identityId: string) => {
  return identityStatsMap.value.get(identityId) || { postCount: 0, archiveCount: 0 };
};

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

// 监听外部传入的值变化
watch(
  () => selectedIdentities.value,
  (newValue) => {
    emit('update:modelValue', [...newValue]);
  },
  { deep: true },
);
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
