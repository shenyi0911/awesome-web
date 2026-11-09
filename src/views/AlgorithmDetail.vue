<template>
  <div v-loading="loading">
    <el-page-header @back="$router.back()" content="算法详情" />
    <template v-if="info.algorithm">
      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="基本信息" name="info">
          <el-card shadow="never">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="名称">{{ info.algorithm.name }}</el-descriptions-item>
              <el-descriptions-item label="唯一标识符">{{ info.algorithm.code }}</el-descriptions-item>
              <el-descriptions-item label="分类">{{ info.algorithm.category }}</el-descriptions-item>
              <el-descriptions-item label="开发语言">{{ info.algorithm.language }}</el-descriptions-item>
              <el-descriptions-item label="作者">{{ info.algorithm.author }}</el-descriptions-item>
              <el-descriptions-item label="应用场景">{{ info.algorithm.scene || '-' }}</el-descriptions-item>
              <el-descriptions-item label="有状态">{{ info.algorithm.stateful ? '是' : '否' }}</el-descriptions-item>
              <el-descriptions-item label="更新人">{{ info.algorithm.updateUser || '-' }}</el-descriptions-item>
              <el-descriptions-item label="描述" :span="2">{{ info.algorithm.description || '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <el-row :gutter="20" style="margin-top:20px">
            <el-col :span="8">
              <el-card shadow="hover" class="kpi-card">
                <div class="kpi">总数</div>
                <div class="kpi-v">{{ info.stats?.totalVersions ?? 0 }}</div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover" class="kpi-card kpi-draft">
                <div class="kpi">草稿</div>
                <div class="kpi-v">{{ info.stats?.draftVersions ?? 0 }}</div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover" class="kpi-card kpi-published">
                <div class="kpi">已发布</div>
                <div class="kpi-v">{{ info.stats?.releasedVersions ?? 0 }}</div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="版本管理" name="versions" lazy>
          <VersionManager :algorithm-id="route.params.id" :open-on-mount="route.query.createVersion === '1'" @changed="fetchInfo" @opened="onVersionOpened" />
        </el-tab-pane>

        <el-tab-pane label="方法调试" name="debug" lazy>
          <MethodDebug :code="info.algorithm.code" />
        </el-tab-pane>
      </el-tabs>
    </template>
    <el-empty v-else description="未找到算法" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAlgorithmInfo } from '../api/info'
import VersionManager from '../components/VersionManager.vue'
import MethodDebug from '../components/MethodDebug.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const info = ref({ algorithm: null, versions: [], stats: {} })
// 带 createVersion=1 查询参数时默认打开「版本管理」Tab（保留新建版本直达行为）
const activeTab = ref(route.query.createVersion === '1' ? 'versions' : 'info')

const fetchInfo = async () => {
  loading.value = true
  try {
    info.value = await getAlgorithmInfo(route.params.id)
  } finally {
    loading.value = false
  }
}

const onVersionOpened = () => {
  router.replace({ query: {} })
}

onMounted(fetchInfo)
watch(() => route.params.id, fetchInfo)
</script>

<style scoped>
.detail-tabs { margin-top: 16px; }
.kpi-card {
  border-radius: 8px;
  border-left: 4px solid #409EFF;
  transition: transform 0.2s;
}
.kpi-card:hover { transform: translateY(-2px); }
.kpi-card :deep(.el-card__body) { padding: 14px 18px; }
.kpi-card.kpi-draft { border-left-color: #E6A23C; }
.kpi-card.kpi-published { border-left-color: #67C23A; }
.kpi { color: #909399; font-size: 13px; }
.kpi-v { font-size: 26px; font-weight: 700; margin-top: 4px; color: #303133; }
</style>
