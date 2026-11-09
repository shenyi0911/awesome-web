# 算法库管理平台 · 前端 (Vue 3)

对接 Go 后端 `awesomeProject`（Gin，端口 8080，路由前缀 `/api/v1`）的管理后台。

## 技术栈
- Vue 3 + Vite 5
- Vue Router 4
- Element Plus 2（UI 组件库）
- Axios（HTTP 请求，已封装统一响应拦截）

## 目录结构
```
awesome-web/
├── package.json
├── vite.config.js        # 开发代理：/api -> http://localhost:8080
├── index.html
└── src/
    ├── main.js           # 入口，挂载 Element Plus / Router
    ├── App.vue
    ├── router/index.js   # 路由（仪表盘/算法/版本/查询）
    ├── utils/request.js  # Axios 封装，按 {code,message,data} 解析
    ├── api/              # algorithm / version / info 三个模块接口
    ├── layout/BasicLayout.vue
    └── views/            # Dashboard / AlgorithmList / AlgorithmDetail / VersionList / InfoSearch
```

## 环境准备（关键）
**本机 Node 实际安装在 `D:\app`**（含 `node.exe`、`npm.cmd`）。
把它加入 PATH 才能用 `npm`：
1. 此电脑 → 属性 → 高级系统设置 → 环境变量
2. 用户变量 `Path` → 新建 → 填 `D:\app` → 确定
3. 关闭所有终端重开，`node -v` / `npm -v` 能出版本号即成功

> 注：不要填 `C:\Program Files\nodejs`（本机不存在该目录，是死路径）。`C:\nodejs` 若你机器上没有也别用。

## 安装依赖
在项目根目录打开终端（推荐用 **D 盘的 Visual Studio Code** 打开本文件夹，用其内置终端）：
```bash
npm install
# 国内网络慢可换镜像：
# npm install --registry=https://registry.npmmirror.com
```

## 启动开发服务器
```bash
npm run dev
```
默认地址：http://localhost:5173

## 对接 Go 后端
开发时 Vite 已配置代理：`/api` → `http://localhost:8080`（见 `vite.config.js`）。
所以前端直接请求 `/api/v1/...`，由代理转发到后端，**无需处理跨域**。

启动后端（另开一个终端）：
```bash
cd C:\Users\Lenovo\GolandProjects\awesomeProject
go run .
```
⚠️ 若报 `address already in use :8080`，说明旧 demo 进程占用了 8080 端口，先停掉它再运行。
后端 CORS 已放开（`Access-Control-Allow-Origin: *`），即便不用代理直连 8080 也可。

## 前端页面与后端接口对照
| 页面 | 调用接口 |
|------|----------|
| 仪表盘 | `GET /api/v1/info/dashboard` |
| 算法管理（列表/新增/编辑/删除） | `GET/POST/PUT/DELETE /api/v1/algorithms` |
| 算法详情 | `GET /api/v1/info/algorithms/:id` |
| 版本管理（列表/新增/激活/删除） | `GET/POST/PUT/DELETE /api/v1/versions`、`POST /api/v1/versions/:id/activate` |
| 信息查询（搜索） | `GET /api/v1/info/search?keyword=&limit=` |

## 构建生产包
```bash
npm run build      # 输出到 dist/
npm run preview    # 本地预览构建产物
```
