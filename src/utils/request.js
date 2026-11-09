import axios from 'axios'
import { ElMessage } from 'element-plus'

// 统一封装：baseURL 指向 /api/v1，由 Vite 代理转发到 Go 后端
// Go 后端响应结构：{ code: 0, message: 'success', data: ... }
const service = axios.create({
  baseURL: '/api/v1',
  timeout: 10000
})

service.interceptors.response.use(
  (response) => {
    const res = response.data
    // 文件下载（blob）直接返回原始数据，不走业务信封解析
    if (response.config?.responseType === 'blob') {
      return res
    }
    if (res.code === 0) {
      return res.data
    }
    // 业务错误（code !== 0）：调用方可通过 config.silent 关闭默认提示
    if (!response.config?.silent) {
      ElMessage.error(res.message || '请求失败')
    }
    return Promise.reject(new Error(res.message || 'Error'))
  },
  (error) => {
    const msg = error.response?.data?.message || error.message || '网络错误'
    if (!error.config?.silent) {
      ElMessage.error(msg)
    }
    // 统一 reject 携带具体原因（而非 axios 默认的 "Request failed with status code xxx"），
    // 调用方 catch 后弹窗/提示时能拿到后端返回的真实错误信息
    return Promise.reject(new Error(msg))
  }
)

export default service
