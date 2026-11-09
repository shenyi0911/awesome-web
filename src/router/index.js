import { createRouter, createWebHistory } from 'vue-router'
import BasicLayout from '../layout/BasicLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import AlgorithmList from '../views/AlgorithmList.vue'
import AlgorithmDetail from '../views/AlgorithmDetail.vue'
import VersionList from '../views/VersionList.vue'

const routes = [
  {
    path: '/',
    component: BasicLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: Dashboard, meta: { title: '仪表盘' } },
      { path: 'algorithms', name: 'algorithms', component: AlgorithmList, meta: { title: '算法管理' } },
      { path: 'algorithms/:id', name: 'algorithm-detail', component: AlgorithmDetail, meta: { title: '算法详情' } },
      { path: 'algorithms/:id/versions', name: 'algorithm-versions', component: VersionList, meta: { title: '版本管理' } },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
