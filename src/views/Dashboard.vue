<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="6" v-for="card in cards" :key="card.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value">{{ card.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="cat-card" v-if="categoryCounts.length">
      <template #header>算法分类分布</template>
      <el-table :data="categoryCounts" style="width: 100%">
        <el-table-column prop="category" label="分类" />
        <el-table-column prop="count" label="数量" width="120" />
        <el-table-column label="占比" width="260">
          <template #default="{ row }">
            <el-progress :percentage="percent(row.count)" :stroke-width="14" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-empty v-else description="暂无数据，请先启动 Go 后端并注册算法" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getDashboard } from '../api/info'

const stats = ref({ totalAlgorithms: 0, totalVersions: 0, draftVersions: 0, releasedVersions: 0, categoryCounts: {} })
const loading = ref(false)

const cards = computed(() => [
  { label: '算法总数', value: stats.value.totalAlgorithms },
  { label: '版本总数', value: stats.value.totalVersions },
  { label: '草稿版本', value: stats.value.draftVersions },
  { label: '已发布版本', value: stats.value.releasedVersions }
])

const categoryCounts = computed(() =>
  Object.entries(stats.value.categoryCounts || {}).map(([category, count]) => ({ category, count }))
)

const percent = (count) => {
  const total = stats.value.totalAlgorithms || 1
  return Math.round((count / total) * 100)
}

const fetchData = async () => {
  loading.value = true
  try {
    stats.value = await getDashboard()
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.stat-card { margin-bottom: 20px; }
.stat-label { color: #909399; font-size: 14px; }
.stat-value { color: #303133; font-size: 32px; font-weight: 700; margin-top: 8px; }
.cat-card { margin-top: 10px; }
</style>
