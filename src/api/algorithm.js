import request from '../utils/request'

// 算法注册模块接口
export function listAlgorithms(params) {
  return request({ url: '/algorithms', method: 'get', params })
}

export function getAlgorithm(id) {
  return request({ url: `/algorithms/${id}`, method: 'get' })
}

export function getAlgorithmByCode(code) {
  return request({ url: `/algorithms/code/${code}`, method: 'get' })
}

export function createAlgorithm(data, config = {}) {
  return request({ url: '/algorithms', method: 'post', data, ...config })
}

export function updateAlgorithm(id, data) {
  return request({ url: `/algorithms/${id}`, method: 'put', data })
}

export function deleteAlgorithm(id) {
  return request({ url: `/algorithms/${id}`, method: 'delete' })
}
