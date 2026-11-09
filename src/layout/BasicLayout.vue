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
</script>

<style scoped>
.layout { height: 100vh; }
.aside { background-color: #1f2d3d; }
.logo { color: #fff; font-size: 16px; font-weight: 600; text-align: center; padding: 18px 0; letter-spacing: 1px; }
.menu { border-right: none; }
.header { display: flex; align-items: center; background: #fff; border-bottom: 1px solid #ebeef5; }
.title { font-size: 18px; font-weight: 600; }
.main { background: #f0f2f5; padding: 20px; }
</style>
