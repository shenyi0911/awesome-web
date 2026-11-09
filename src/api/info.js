import request from '../utils/request'

// 信息模块接口（仪表盘、算法详情用）
export function getDashboard() {
  return request({ url: '/info/dashboard', method: 'get' })
}

export function getAlgorithmInfo(id) {
  return request({ url: `/info/algorithms/${id}`, method: 'get' })
}
