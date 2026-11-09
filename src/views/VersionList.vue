<template>
  <div>
    <el-page-header @back="goBack" :content="`版本管理 · ${algorithmId}`" />
    <div style="margin-top:16px">
      <VersionManager :algorithm-id="algorithmId" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VersionManager from '../components/VersionManager.vue'

const route = useRoute()
const router = useRouter()
const algorithmId = computed(() => route.params.id)

const goBack = () => router.push('/algorithms')
</script>
