<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">算法库管理平台</div>
      <el-menu :default-active="activeMenu" router class="menu" background-color="#1f2d3d" text-color="#bfcbd9" active-text-color="#409eff">
        <el-menu-item index="/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/algorithms">
          <el-icon><Box /></el-icon>
          <span>算法管理</span>
        </el-menu-item>
      </el-menu>
      <!-- Grafana 独立监控大屏：保留在外部窗口，避免登录态/iframe 限制 -->
      <div class="external-menu-item" @click="openMonitoring">
        <el-icon><TrendCharts /></el-icon>
        <span>监控</span>
      </div>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span class="title">{{ currentTitle }}</span>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => route.path.startsWith('/algorithms/') ? '/algorithms' : route.path)
const currentTitle = computed(() => route.meta.title || '算法库管理平台')

// Grafana 地址可通过 VITE_GRAFANA_URL 覆盖，默认本地 Prometheus + Grafana 环境
const grafanaURL = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3000'

const openMonitoring = () => {
  window.open(grafanaURL, '_blank', 'noopener')
}
</script>

<style scoped>
.layout { height: 100vh; }
.aside { background-color: #1f2d3d; }
.logo { color: #fff; font-size: 16px; font-weight: 600; text-align: center; padding: 18px 0; letter-spacing: 1px; }
.menu { border-right: none; }
.external-menu-item { display: flex; align-items: center; height: 56px; padding: 0 20px; color: #bfcbd9; font-size: 14px; cursor: pointer; }
.external-menu-item .el-icon { margin-right: 8px; }
.external-menu-item:hover { background-color: #001528; color: #409eff; }
.header { display: flex; align-items: center; background: #fff; border-bottom: 1px solid #ebeef5; }
.title { font-size: 18px; font-weight: 600; }
.main { background: #f0f2f5; padding: 20px; }
</style>
