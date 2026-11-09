import request from '../utils/request'

// 版本管理模块接口（按设计：草稿 -> 发布 -> 归档，文件归版本，含操作日志）

export function listVersions(params) {
  return request({ url: '/versions', method: 'get', params })
}

export function getVersion(id) {
  return request({ url: `/versions/${id}`, method: 'get' })
}

export function createVersion(data) {
  return request({ url: '/versions', method: 'post', data })
}

export function updateVersion(id, data) {
  return request({ url: `/versions/${id}`, method: 'put', data })
}

// 发布：draft -> released
export function publishVersion(id, operator) {
  // silent: 拦截器不弹默认 toast，由调用方（发布确认流程）用弹窗展示失败原因
  return request({ url: `/versions/${id}/publish`, method: 'post', params: { operator: operator || 'system' }, silent: true })
}

// 归档：逻辑删除，保留历史
export function archiveVersion(id, operator) {
  return request({ url: `/versions/${id}/archive`, method: 'post', params: { operator: operator || 'system' } })
}

// 操作日志
export function getVersionChangelog(id, params) {
  return request({ url: `/versions/${id}/changelog`, method: 'get', params })
}

// 版本文件（每个版本独立一套），relativePath 为文件夹上传时的相对路径
export function uploadVersionFile(id, file, operator, relativePath) {
  const form = new FormData()
  form.append('file', file)
  if (operator) form.append('operator', operator)
  if (relativePath) form.append('path', relativePath)
  return request({ url: `/versions/${id}/files`, method: 'post', data: form })
}

// 批量上传版本文件：一次请求携带多个文件，服务端合并为一条变更记录
// items: [{ file: File, relativePath: string }]
export function uploadVersionFiles(id, items, operator) {
  const form = new FormData()
  items.forEach(({ file, relativePath }) => {
    form.append('file', file)
    // 即使为空也追加，保证 path 与 file 按下标一一对应
    form.append('path', relativePath || '')
  })
  if (operator) form.append('operator', operator)
  return request({ url: `/versions/${id}/files`, method: 'post', data: form })
}

export function deleteVersionFile(id, key, operator) {
  return request({ url: `/versions/${id}/files`, method: 'delete', params: { key, operator: operator || 'system' } })
}

// 批量下载版本文件：将选中的 key 打包为 zip 返回（响应为 Blob，需 responseType: 'blob'）
export function batchDownloadVersionFiles(id, keys, operator) {
  const params = new URLSearchParams()
  keys.forEach((k) => params.append('key', k))
  params.append('operator', operator || 'system')
  return request({
    url: `/versions/${id}/files/batch`,
    method: 'get',
    params,
    responseType: 'blob'
  })
}
