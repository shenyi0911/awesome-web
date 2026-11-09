import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 开发服务器配置：把 /api 代理到 Go 后端（默认 8080）
// 若你的 Go 后端改了端口，只需改下面的 target
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
