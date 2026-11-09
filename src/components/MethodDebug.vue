<template>
  <el-card shadow="never">
    <!-- 方法名（左）+ 调用按钮在其右侧；路由单独一行，与方法名下方对齐 -->
    <div class="method-bar">
      <span class="bar-label">方法名</span>
      <el-select
        v-model="method"
        filterable
        placeholder="从 /metadata 选择方法名"
        style="width: 320px"
      >
        <el-option v-for="m in methodOptions" :key="m" :label="m" :value="m" />
      </el-select>
      <span v-if="methodLoading" class="hint">正在加载 /metadata …</span>
    </div>
    <div class="route-bar">
      <span class="bar-label">路由</span>
      <span v-if="method" class="endpoint">{{ endpointUrl }}</span>
      <span v-else class="hint">选择方法名后显示完整路由</span>
    </div>
    <div v-if="sessionId" class="route-bar">
      <span class="bar-label">会话</span>
      <span class="endpoint session">{{ sessionId }}</span>
      <el-button link type="primary" size="small" class="copy-btn" @click="copySession">
        <el-icon><CopyDocument /></el-icon>
        <span class="copy-text">复制</span>
      </el-button>
      <el-button link type="danger" size="small" @click="resetSession">重置</el-button>
    </div>

    <!-- 操作行：左=调用按钮+填写说明；中=表单/JSON 模式切换（预览列左侧）；右区与预览列同宽同位，「请求体预览」对齐表格左侧 -->
    <div class="toolbar-row">
      <div class="toolbar-left">
        <el-button type="primary" :loading="calling" @click="invoke">调用</el-button>
        <span class="editor-helper">填写说明：object 的子字段需填名称；array 的子元素自动按 [下标] 编号（名称置灰），元素内容点右侧「+子级」添加</span>
      </div>
      <el-radio-group v-model="mode" size="small" class="mode-switch">
        <el-radio-button label="form">表单编辑</el-radio-button>
        <el-radio-button label="json">JSON 模式</el-radio-button>
      </el-radio-group>
      <div class="toolbar-right-zone">
        <span class="preview-tag">请求体预览</span>
        <el-button
          link
          type="primary"
          size="small"
          class="copy-btn"
          :disabled="previewErr || bodyPreview.startsWith('//')"
          @click="copyPreview"
        >
          <el-icon><CopyDocument /></el-icon>
          <span class="copy-text">{{ copied ? '已复制' : '复制' }}</span>
        </el-button>
      </div>
    </div>

    <!-- ============ 编辑区（左） + 请求体预览（右，并列） ============ -->
    <div class="editor-layout">
      <div class="editor-main">
        <!-- JSON 模式：整段粘贴请求体 -->
        <template v-if="mode === 'json'">
          <el-input
            v-model="jsonText"
            type="textarea"
            :rows="14"
            placeholder='粘贴完整 JSON 请求体，例如：&#10;{&#10;  "unit": { "gravity": "g", "magnetic": "nT" },&#10;  "params": { "gravity": { "x": 0.043, "y": 0.062, "z": 0.997 } }&#10;}'
            class="json-input"
            spellcheck="false"
          />
        </template>

        <!-- 表单模式：树形字段编辑器 -->
        <template v-else>
          <div class="rows-head">
            <span class="col-name">字段名</span>
            <span class="col-value">值</span>
            <span class="col-type">类型</span>
            <span class="col-op">操作</span>
          </div>

          <div
            v-for="{ row, depth } in visibleRows"
            :key="row.id"
            class="row"
          >
            <!-- 缩进只作用于「字段名」单元格内部，不影响后面列的对齐 -->
            <div class="cell-name" :style="{ paddingLeft: depth * 22 + 'px' }">
              <span v-if="depth > 0" class="tree-indent">└</span>
              <!-- array 子元素：名称框一律置灰，固定显示 [下标]（元素内容靠 +子级 添加） -->
              <el-input
                v-if="isArrayChild(row)"
                :model-value="'[' + siblingIndex(row) + ']'"
                disabled
                class="col-name"
              />
              <el-input v-else v-model="row.name" placeholder="字段名" class="col-name" />
            </div>
            <template v-if="isComposite(row)">
              <span class="col-value composite-mark">{{ row.type === 'object' ? '{ 对象 —— 点右侧「+子级」添加字段 }' : '[ 数组 —— 点右侧「+子级」添加元素 ]' }}</span>
            </template>
            <el-input
              v-else
              v-model="row.value"
              :placeholder="valuePlaceholder(row.type)"
              :disabled="row.type === 'null'"
              :type="row.type === 'json' ? 'textarea' : 'text'"
              :autosize="{ minRows: 1, maxRows: 6 }"
              class="col-value"
            />
            <el-select v-model="row.type" class="col-type" @change="onTypeChange(row)">
              <el-option label="string" value="string" />
              <el-option label="number" value="number" />
              <el-option label="boolean" value="boolean" />
              <el-option label="null" value="null" />
              <el-option label="json" value="json" />
              <el-option label="object" value="object" />
              <el-option label="array" value="array" />
            </el-select>
            <span class="col-op">
              <el-button v-if="isComposite(row)" link type="primary" @click="addChild(row)">+子级</el-button>
              <el-button link type="danger" @click="delRow(row)">删除</el-button>
            </span>
          </div>

          <div class="toolbar">
            <el-button @click="addRoot">+ 添加根字段</el-button>
            <el-button @click="clearRows">清空</el-button>
          </div>
        </template>
      </div>

      <div class="editor-preview">
        <pre class="json-box" :class="{ 'json-err': previewErr }">{{ bodyPreview }}</pre>
      </div>
    </div>

    <div v-if="resText !== ''" class="resp">
      <div class="block-title">响应体</div>
      <div class="resp-head">
        <el-tag :type="ok ? 'success' : 'danger'" size="small">{{ statusLine }}</el-tag>
        <span class="hint">{{ elapsed }}</span>
      </div>
      <pre class="json-box">{{ resText }}</pre>
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

// 方法调试：两种模式 ——
//  1) 表单编辑：树形字段编辑器（object/array 可添加子级，任意层级嵌套）
//  2) JSON 模式：整段粘贴 JSON 请求体（复杂结构推荐）
// 调用 POST /api/v1/{code}/{method}，用原生 axios（不走 code===0 解包），展示完整响应信封。
const props = defineProps({
  code: { type: String, required: true }
})

// 方法名默认为空：等 /metadata 拉到该算法真实暴露的方法列表后再选中，
// 避免新算法（还没上传文件）凭空出现一个方法名
const method = ref('')
const methodOptions = ref([])
const methodLoading = ref(false)
const calling = ref(false)
const resText = ref('')
const ok = ref(true)
const statusLine = ref('')
const elapsed = ref('')

// 当前会话：首次调用由平台分配（响应头 X-Session-Id），后续请求自动带上以关联有状态算法的上下文
const sessionId = ref('')

const mode = ref('form') // 'form' | 'json'
const jsonText = ref('')

// 完整真实路由（含网关端口）：前端经 vite 代理到平台网关（默认 8080）
const endpointUrl = computed(() => {
  if (!method.value) return ''
  const host = window.location.hostname || 'localhost'
  return `POST ${window.location.protocol}//${host}:8080/api/v1/${props.code}/${method.value}`
})

// ---------- 字段树（扁平存储 + parentId 关联） ----------
let uid = 1
const rows = ref([]) // { id, parentId, name, type, value }

const newNode = (parentId) => ({ id: uid++, parentId, name: '', type: 'string', value: '' })
const childrenOf = (pid) => rows.value.filter((r) => r.parentId === pid)
const isComposite = (row) => row.type === 'object' || row.type === 'array'
const isArrayChild = (row) => {
  const p = rows.value.find((r) => r.id === row.parentId)
  return !!p && p.type === 'array'
}
const siblingIndex = (row) => childrenOf(row.parentId).indexOf(row)

// 深度优先展开为可见行（带层级），用于缩进渲染
const visibleRows = computed(() => {
  const out = []
  const walk = (pid, depth) => {
    for (const r of childrenOf(pid)) {
      out.push({ row: r, depth })
      if (isComposite(r)) walk(r.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
})

const addRoot = () => rows.value.push(newNode(null))
const clearRows = () => { rows.value = [] }

// 在目标行整个子树之后插入子节点
// array 的新元素自动继承最后一个元素的类型（对象数组场景不必每次手切类型）
const addChild = (parent) => {
  if (!isComposite(parent)) return
  let lastIdx = rows.value.indexOf(parent)
  const collect = (pid) => {
    for (const c of childrenOf(pid)) {
      lastIdx = Math.max(lastIdx, rows.value.indexOf(c))
      collect(c.id)
    }
  }
  collect(parent.id)
  const node = newNode(parent.id)
  if (parent.type === 'array') {
    const siblings = childrenOf(parent.id)
    if (siblings.length) node.type = siblings[siblings.length - 1].type
  }
  rows.value.splice(lastIdx + 1, 0, node)
}

// 删除行及其所有后代
const delRow = (row) => {
  const doomed = new Set([row.id])
  const collect = (pid) => {
    for (const c of childrenOf(pid)) { doomed.add(c.id); collect(c.id) }
  }
  collect(row.id)
  rows.value = rows.value.filter((r) => !doomed.has(r.id))
}

// 类型切换：切到 object/array 时记住类型（用于回退）；
// 切到简单类型时若已有子级，阻止切换并回退，避免静默丢失子级
const onTypeChange = (row) => {
  if (isComposite(row)) {
    row.prevComposite = row.type
    return
  }
  const kids = childrenOf(row.id)
  if (kids.length) {
    const back = row.prevComposite || 'object'
    ElMessage.warning(`该字段下还有 ${kids.length} 个子级，已保持为 ${back}；要改为简单类型请先删除子级`)
    row.type = back
  }
}

// 递归构造 JSON
// lenient=true 时用于「请求体预览」：未命名的字段直接跳过、不报错（打字过程中不该飘红）；
// lenient=false 时用于「调用」：严格校验，未命名等一律抛错
const buildNode = (row, path, lenient = false) => {
  if (row.type === 'object') {
    const obj = {}
    childrenOf(row.id).forEach((c, i) => {
      const key = (c.name || '').trim()
      if (!key) {
        if (lenient) return // 预览模式：未命名的子字段先跳过
        throw new Error(`${path || '根对象'} 的第 ${i + 1} 个子字段未命名`)
      }
      obj[key] = buildNode(c, path ? `${path}.${key}` : key, lenient)
    })
    return obj
  }
  if (row.type === 'array') {
    return childrenOf(row.id).map((c, i) => buildNode(c, `${path}[${i}]`, lenient))
  }
  if (row.type === 'number') {
    const n = Number(row.value)
    if ((row.value || '').trim() === '' || Number.isNaN(n)) {
      if (lenient) return row.value // 预览模式：还没填好先原样展示
      throw new Error(`字段 ${path} 的值不是合法数字: "${row.value}"`)
    }
    return n
  }
  if (row.type === 'boolean') {
    const v = String(row.value || '').trim().toLowerCase()
    if (v === 'true' || v === '1') return true
    if (v === 'false' || v === '0' || v === '') return false
    if (lenient) return row.value
    throw new Error(`字段 ${path} 的值必须是 true / false`)
  }
  if (row.type === 'null') return null
  if (row.type === 'json') {
    try {
      return JSON.parse(row.value)
    } catch {
      if (lenient) return row.value // 预览模式：JSON 还没粘完先原样展示
      throw new Error(`字段 ${path} 的值不是合法 JSON: "${(row.value || '').slice(0, 50)}"`)
    }
  }
  return row.value
}

const buildBodyFromForm = (lenient = false) => {
  const body = {}
  childrenOf(null).forEach((c, i) => {
    const key = (c.name || '').trim()
    if (!key) {
      if (lenient) return // 预览模式：未命名的根字段先跳过
      throw new Error(`第 ${i + 1} 个根字段未命名`)
    }
    body[key] = buildNode(c, key, lenient)
  })
  return body
}

const getBody = (lenient = false) => {
  if (mode.value === 'json') {
    const s = (jsonText.value || '').trim()
    if (!s) return {}
    return JSON.parse(s) // 非法 JSON 直接抛出
  }
  return buildBodyFromForm(lenient)
}

const valuePlaceholder = (type) => {
  if (type === 'boolean') return 'true / false'
  if (type === 'number') return '如 9.80665'
  if (type === 'null') return '（值忽略）'
  if (type === 'json') return '直接粘贴 JSON 值，如 {"x": 1}'
  return '文本'
}

// 复制当前请求体预览（仅在有有效 JSON 内容时可用）
const copied = ref(false)
const copyPreview = async () => {
  const text = bodyPreview.value
  if (previewErr.value || text.startsWith('//')) return
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copied.value = true
    ElMessage.success('请求体已复制到剪贴板')
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    ElMessage.error('复制失败，请手动选择文本复制')
  }
}

const previewErr = ref(false)
const bodyPreview = computed(() => {
  try {
    // 表单模式下若所有行都还没输入（无字段名也无值），不做校验、不飘红，给中性提示
    if (mode.value === 'form' && !rows.value.some((r) => (r.name || '').trim() || (r.value || '').trim())) {
      previewErr.value = false
      return '// （暂无内容，输入字段名或点击「+ 添加根字段」开始）'
    }
    // 预览用宽容模式：未命名/未填好的字段先跳过或原样展示，不飘红；调用时才严格校验
    const b = getBody(true)
    previewErr.value = false
    const s = JSON.stringify(b, null, 2)
    if (s !== '{}' && s !== '[]') return s
    return mode.value === 'json'
      ? '// （空请求体 {}，粘贴 JSON 或切换到表单编辑）'
      : '// （暂无已命名字段，命名后此处实时预览）'
  } catch (e) {
    previewErr.value = true
    return `// ${e.message}`
  }
})

// ---------- 方法发现 ----------
const loadMetadata = async () => {
  methodLoading.value = true
  method.value = '' // 换算法时先清空，等 metadata 结果决定默认选中
  try {
    const data = await request({ url: `/${props.code}/metadata`, method: 'get', silent: true })
    methodOptions.value = Array.isArray(data?.capabilities) ? data.capabilities : []
  } catch {
    /* metadata 不可达时留空，允许手动输入方法名 */
    methodOptions.value = []
  } finally {
    if (methodOptions.value.length) {
      // 有方法列表：优先选 calculate，否则选第一个
      method.value = methodOptions.value.includes('calculate') ? 'calculate' : methodOptions.value[0]
    }
    methodLoading.value = false
  }
}

// ---------- 调用 ----------
const invoke = async () => {
  const m = (method.value || '').trim()
  if (!m) {
    ElMessage.warning('请填写方法名')
    return
  }
  let body
  try {
    body = getBody()
  } catch (e) {
    ElMessage.error(`构造请求体失败: ${e.message}`)
    return
  }
  calling.value = true
  resText.value = ''
  const t0 = performance.now()
  // 携带已建立的会话（如有），让有状态算法复用上下文；首次调用不带则平台分配新会话
  const config = { timeout: 30000 }
  if (sessionId.value) {
    config.headers = { 'X-Session-Id': sessionId.value }
  }
  try {
    const resp = await axios.post(`/api/v1/${props.code}/${m}`, body, config)
    ok.value = true
    statusLine.value = `HTTP ${resp.status}`
    resText.value = JSON.stringify(resp.data, null, 2)
    // 读取本次会话：优先响应头 X-Session-Id，回退到响应体顶层 sessionId
    const sid = (resp.headers && resp.headers['x-session-id']) || resp.data?.sessionId
    if (sid) sessionId.value = sid
  } catch (e) {
    ok.value = false
    statusLine.value = e.response ? `HTTP ${e.response.status}` : '网络错误'
    resText.value = JSON.stringify(e.response?.data ?? { message: e.message }, null, 2)
  } finally {
    elapsed.value = `${Math.round(performance.now() - t0)} ms`
    calling.value = false
  }
}

onMounted(() => {
  loadMetadata()
  if (!rows.value.length) addRoot() // 默认给一行空字段，用户直接开填
})

// 复制当前会话 ID 到剪贴板
const copySession = async () => {
  const text = sessionId.value
  if (!text) return
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    ElMessage.success('会话 ID 已复制')
  } catch {
    ElMessage.error('复制失败，请手动选择复制')
  }
}

// 重置会话：下次调用将不带 sessionId，由平台分配全新会话
const resetSession = () => {
  sessionId.value = ''
  ElMessage.info('已重置会话，下次调用将建立新会话')
}

// 路由复用组件切换算法时：清空方法名/表单/响应/会话，重新发现方法
watch(() => props.code, () => {
  method.value = ''
  methodOptions.value = []
  rows.value = []
  jsonText.value = ''
  resText.value = ''
  sessionId.value = ''
  addRoot()
  loadMetadata()
})
</script>

<style scoped>
.sub-title { font-size: 13px; color: #909399; font-family: Consolas, Menlo, monospace; }
.hint { margin-left: 10px; font-size: 12px; color: #909399; }

/* 方法名行 + 路由行：共用同一列宽（label 定宽），保证「路由」与方法名选择框左对齐 */
.method-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.route-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.bar-label { font-size: 14px; color: #606266; width: 56px; flex: none; }
.endpoint {
  font-family: Consolas, Menlo, monospace;
  font-size: 13px;
  color: #409eff;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  padding: 3px 10px;
}
/* 会话 ID 用绿色以区别于路由（蓝色） */
.endpoint.session {
  color: #67c23a;
  background: #f0f9eb;
  border-color: #e1f3d8;
}

/* 操作行：左=调用按钮+填写说明；右=请求体预览标题+模式切换（整体右对齐） */
/* 操作行：左=调用+说明（与编辑区同宽）；右区与下方预览列同宽同位（width/padding/border 完全一致），
   「请求体预览」左对齐到预览框左边缘，模式切换贴最右 */
.toolbar-row {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}
.toolbar-left {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 20px;
}
.toolbar-right-zone {
  flex: none;
  width: 380px;
  padding-left: 20px;
  border-left: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.preview-tag { font-size: 13px; font-weight: 600; color: #606266; white-space: nowrap; }
/* 模式切换：紧贴预览列左侧（与填写说明之后的位置） */
.mode-switch { flex: none; margin-right: 14px; }
.copy-btn { font-size: 12px; }
.copy-btn .copy-text { margin-left: 2px; }

.json-input { font-family: Consolas, Menlo, monospace; }
.json-input :deep(textarea) { font-family: Consolas, Menlo, monospace; }
/* JSON 模式：输入框高度与右侧请求体预览固定高度一致（520px，含边框内边距） */
.json-input :deep(textarea) { height: 520px !important; resize: vertical; }

/* 填写说明：小字，与调用按钮同处一行，可折行 */
.editor-helper {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

/* 字段树：Grid 固定四列（字段名 / 值 / 类型 / 操作），表头与所有行共用同一列模板，严格垂直对齐 */
.rows-head, .row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(180px, 1.4fr) 110px 110px;
  gap: 10px;
  align-items: center;
}
.rows-head {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 7px 10px;
}
.rows-head .col-op { text-align: right; }
.row {
  margin-bottom: 2px;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background 0.15s;
}
.row:hover { background: #f5f9ff; }
/* 字段名单元格：缩进 + 树形符号都在这里，内部弹性填充 */
.cell-name {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.cell-name .col-name { flex: 1 1 auto; min-width: 0; }
.tree-indent { color: #c0c4cc; font-size: 12px; flex: none; }
.col-value { min-width: 0; }
.col-type { width: 110px; }
/* 操作列固定宽度，保证表头与行、各行之间对齐 */
.col-op {
  width: 110px;
  flex: none;
  display: inline-flex;
  justify-content: flex-end;
  align-items: center;
  white-space: nowrap;
}
.col-op .el-button + .el-button { margin-left: 8px; }
.composite-mark { color: #909399; font-size: 13px; }

/* 编辑区（左）与请求体预览（右）并列，中间分隔线 */
.editor-layout {
  display: flex;
  align-items: flex-start;
  gap: 0;
}
.editor-main { flex: 1 1 auto; min-width: 0; padding-right: 20px; }
.editor-preview {
  flex: none;
  width: 380px;
  border-left: 1px solid #ebeef5;
  padding-left: 20px;
}
/* 请求体预览：放大并固定高度，不随内容伸缩（border-box 与 textarea 一致，保证两框等高） */
.editor-preview .json-box {
  box-sizing: border-box;
  height: 520px;
  max-height: none;
  margin-bottom: 0;
}

.toolbar { margin: 8px 0 16px; }

.block-title { font-size: 13px; font-weight: 600; color: #606266; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
.json-box {
  margin: 0 0 16px;
  padding: 12px 14px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  font-family: Consolas, Menlo, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 420px;
  overflow: auto;
}
.json-box.json-err { color: #f56c6c; background: #fef0f0; border-color: #fde2e2; }
.resp-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
</style>
