<template>
  <div class="method-debug">
    <!-- 方法选择 + 路由（同一行） -->
    <div class="top-row">
      <div class="meta-row">
        <label class="meta-label">方法名</label>
        <el-select
          v-model="method"
          filterable
          placeholder="选择方法（来自算法契约）"
          class="method-select"
        >
          <el-option v-for="m in methodOptions" :key="m" :label="m" :value="m" />
        </el-select>
        <span v-if="methodLoading" class="meta-hint">加载契约中…</span>
      </div>

      <!-- 路由（POST 方法徽章 + 代码芯片） -->
      <div v-if="method" class="route-line">
        <el-tag :type="verbTagType" class="method-badge">{{ (currentMethod?.verb || 'POST').toUpperCase() }}</el-tag>
        <code class="route-url">{{ endpointUrl }}</code>
        <el-button link type="primary" size="small" class="copy-route" @click="copyRoute">
          <el-icon><CopyDocument /></el-icon><span class="copy-text">复制</span>
        </el-button>
      </div>
      <div v-else class="route-line route-empty">选择方法后显示完整调用路由</div>
    </div>

    <!-- 会话：仅对有状态算法显示。留空=新建会话；填入 sessionId=进入指定会话 -->
    <div v-if="stateful" class="session-row">
      <span class="meta-label">Session ID</span>
      <el-input
        v-model="sessionId"
        size="small"
        clearable
        placeholder="留空=新建会话；填入 sessionId=进入指定会话"
        class="session-input"
      />
      <el-button link type="primary" size="small" :disabled="!sessionId" @click="copySession">
        <el-icon><CopyDocument /></el-icon><span class="copy-text">复制</span>
      </el-button>
    </div>

    <!-- 参数说明（可编辑：含输入值列 + 调用） -->
    <section v-if="currentMethod" class="doc-section">
      <div class="section-head">
        <span class="section-title">参数说明</span>
        <span class="section-sub">来自算法契约 · {{ currentMethod.params?.length || 0 }} 个入参</span>
        <div class="section-actions">
          <el-radio-group v-model="mode" size="small" class="mode-switch">
            <el-radio-button label="form">表单填写</el-radio-button>
            <el-radio-button label="json">JSON 模式</el-radio-button>
          </el-radio-group>
          <el-button size="small" :disabled="!hasExample || calling" @click="resetToExample">用示例填充</el-button>
          <el-button type="primary" :loading="calling" class="invoke-btn" @click="invoke">调用</el-button>
        </div>
      </div>

      <!-- 表单模式：分级参数表，叶子行可直接输入 -->
      <template v-if="mode === 'form'">
        <div v-if="paramTreeRows.length" class="param-table editable">
          <div class="pt-head">
            <span class="c-key">参数</span>
            <span class="c-input">输入值</span>
            <span class="c-type">类型</span>
            <span class="c-req">必填</span>
            <span class="c-unit">单位</span>
            <span class="c-enum">枚举</span>
            <span class="c-desc">说明</span>
          </div>
          <div
            v-for="row in paramTreeRows"
            :key="row.key"
            class="pt-row"
            :class="{ 'is-group': row.hasKids }"
          >
            <span class="c-key" :style="{ paddingLeft: row.depth * 18 + 4 + 'px' }">
              <span v-if="row.hasKids" class="caret" @click="toggleGroup(row.key)">{{ row.open ? '▾' : '▸' }}</span>
              <span v-else class="caret-spacer"></span>
              <code :title="row.node.fullKey">{{ row.node.name }}</code>
            </span>
            <!-- 输入值列：叶子按类型渲染控件，分组行留空 -->
            <span class="c-input">
              <template v-if="row.hasKids">—</template>
              <template v-else>
                <el-switch
                  v-if="row.node.type === 'boolean'"
                  :model-value="paramValues[row.node.fullKey] === 'true'"
                  @change="v => setVal(row.node.fullKey, v ? 'true' : 'false')"
                />
                <el-select
                  v-else-if="row.node.enum && row.node.enum.length"
                  :model-value="paramValues[row.node.fullKey] || ''"
                  @change="v => setVal(row.node.fullKey, v)"
                  placeholder="选择"
                  size="small"
                  class="input-cell"
                >
                  <el-option v-for="e in row.node.enum" :key="e" :label="e" :value="e" />
                </el-select>
                <el-input
                  v-else
                  :model-value="paramValues[row.node.fullKey] || ''"
                  @input="v => setVal(row.node.fullKey, v)"
                  :placeholder="valuePlaceholder(row.node.type)"
                  :type="row.node.type === 'number' ? 'number' : 'text'"
                  size="small"
                  class="input-cell"
                  :class="{ 'is-invalid': isRequiredEmpty(row.node) }"
                />
              </template>
            </span>
            <span class="c-type"><span class="type-chip" :class="{ 'is-group': row.hasKids }">{{ row.node.type }}</span></span>
            <span class="c-req">
              <template v-if="row.hasKids">—</template>
              <el-tag v-else-if="row.node.required" type="danger" size="small" effect="plain">必填</el-tag>
              <el-tag v-else type="info" size="small" effect="plain">可选</el-tag>
            </span>
            <span class="c-unit">{{ row.hasKids ? '—' : (row.node.unit || '—') }}</span>
            <span class="c-enum">
              <template v-if="!row.hasKids && row.node.enum && row.node.enum.length">
                <el-tag v-for="e in row.node.enum" :key="e" size="small" class="enum-tag">{{ e }}</el-tag>
              </template>
              <span v-else class="muted">—</span>
            </span>
            <span class="c-desc">
              <template v-if="row.hasKids">（{{ row.node.type === 'array' ? '数组' : '对象' }} · 含 {{ row.node.children.length }} 项）</template>
              <template v-else>{{ row.node.desc || '—' }}</template>
            </span>
          </div>
        </div>
        <el-empty v-else description="该方法未提供结构化参数说明" :image-size="46" />
      </template>

      <!-- JSON 模式：整段粘贴请求体 -->
      <template v-else>
        <el-input
          v-model="jsonText"
          type="textarea"
          :rows="14"
          placeholder='粘贴完整 JSON 请求体，例如：&#10;{&#10;  "unit": { "gravity": "g", "magnetic": "nT" },&#10;  "params": { "gravity": { "x": 0.043, "y": 0.062, "z": 0.997 } }&#10;}'
          class="json-input"
          spellcheck="false"
        />
      </template>

    </section>

    <!-- 返回字段（只读分级树） -->
    <template v-if="resultTreeRows.length">
      <div class="section-head result-head">
        <span class="section-title">返回字段</span>
        <span class="section-sub">{{ resultTreeRows.length }} 个节点</span>
      </div>
      <div class="param-table">
        <div class="pt-head">
          <span class="c-key">字段</span>
          <span class="c-type">类型</span>
          <span class="c-req">必填</span>
          <span class="c-unit">单位</span>
          <span class="c-enum">枚举</span>
          <span class="c-desc">说明</span>
        </div>
        <div
          v-for="row in resultTreeRows"
          :key="row.key"
          class="pt-row"
          :class="{ 'is-group': row.hasKids }"
        >
          <span class="c-key" :style="{ paddingLeft: row.depth * 18 + 4 + 'px' }">
            <span v-if="row.hasKids" class="caret" @click="toggleGroup(row.key)">{{ row.open ? '▾' : '▸' }}</span>
            <span v-else class="caret-spacer"></span>
            <code :title="row.node.fullKey">{{ row.node.name }}</code>
          </span>
          <span class="c-type"><span class="type-chip" :class="{ 'is-group': row.hasKids }">{{ row.node.type }}</span></span>
          <span class="c-req">
            <template v-if="row.hasKids">—</template>
            <el-tag v-else-if="row.node.required" type="danger" size="small" effect="plain">必填</el-tag>
            <el-tag v-else type="info" size="small" effect="plain">可选</el-tag>
          </span>
          <span class="c-unit">{{ row.hasKids ? '—' : (row.node.unit || '—') }}</span>
          <span class="c-enum">
            <template v-if="!row.hasKids && row.node.enum && row.node.enum.length">
              <el-tag v-for="e in row.node.enum" :key="e" size="small" class="enum-tag">{{ e }}</el-tag>
            </template>
            <span v-else class="muted">—</span>
          </span>
          <span class="c-desc">
            <template v-if="row.hasKids">（{{ row.node.type === 'array' ? '数组' : '对象' }} · 含 {{ row.node.children.length }} 项）</template>
            <template v-else>{{ row.node.desc || '—' }}</template>
          </span>
        </div>
      </div>
    </template>

    <div v-if="resText !== ''" class="resp-section">
      <div class="section-head">
        <span class="section-title">响应体</span>
        <div class="resp-meta">
          <el-tag :type="ok ? 'success' : 'danger'" size="small" effect="dark">{{ statusLine }}</el-tag>
          <span class="elapsed">{{ elapsed }}</span>
        </div>
      </div>
      <pre class="json-box" :class="{ 'json-err': !ok }">{{ resText }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

// 方法调试（整合版）：参数说明表本身即表单 —— 叶子可直接输入「输入值」，
// 点「调用」即用表内填写的值构造请求体并 POST。JSON 模式作为高级入口保留。
const props = defineProps({
  code: { type: String, required: true },
  stateful: { type: Boolean, default: false }
})

const method = ref('')
const methodOptions = ref([])
const methodLoading = ref(false)

// 结构化方法契约（平台侧 /{code}/contract）：含 params/result/example
const contractMethods = ref([])
const currentMethod = computed(() => contractMethods.value.find(m => m.name === method.value) || null)
// HTTP 动词 → el-tag 类型，复用 Element Plus 标签样式，与版本「状态」标签风格统一
const verbTagType = computed(() => {
  const v = (currentMethod.value?.verb || 'POST').toUpperCase()
  const m = { GET: 'success', POST: 'primary', PUT: 'warning', PATCH: 'warning', DELETE: 'danger' }
  return m[v] || 'info'
})
const calling = ref(false)

const hasExample = computed(() => !!(currentMethod.value && currentMethod.value.example && currentMethod.value.example.request))

// ---------- 参数分级（树形）展示 ----------
const buildParamTree = (list) => {
  const root = { name: '', fullKey: '', children: [] }
  const groups = new Map()
  groups.set('', root)
  const ensure = (parentKey, seg) => {
    const fullKey = parentKey ? `${parentKey}.${seg}` : seg
    if (!groups.has(fullKey)) {
      const node = { name: seg, fullKey, type: 'object', children: [] }
      groups.set(fullKey, node)
      groups.get(parentKey).children.push(node)
    }
    return groups.get(fullKey)
  }
  for (const p of (list || [])) {
    const parts = String(p.key).split('.')
    let parentKey = ''
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i]
      const node = ensure(parentKey, seg)
      if (/^\d+$/.test(seg)) node.type = 'array' // 数字段视为数组元素
      parentKey = node.fullKey
    }
    groups.get(parentKey).children.push({
      name: parts[parts.length - 1],
      fullKey: p.key,
      type: p.type,
      required: p.required,
      unit: p.unit,
      enum: p.enum,
      desc: p.desc
    })
  }
  return root
}

const collapsedGroups = ref(new Set())
const toggleGroup = (key) => {
  const next = new Set(collapsedGroups.value)
  if (next.has(key)) next.delete(key); else next.add(key)
  collapsedGroups.value = next
}

const flattenParamTree = (root, prefix) => {
  const out = []
  const walk = (node, depth) => {
    for (const c of node.children) {
      const hasKids = c.children && c.children.length
      const key = prefix + c.fullKey
      out.push({ node: c, depth, hasKids, key, open: !collapsedGroups.value.has(key) })
      if (hasKids && !collapsedGroups.value.has(key)) walk(c, depth + 1)
    }
  }
  walk(root, 0)
  return out
}

const paramTreeRows = computed(() => flattenParamTree(buildParamTree(currentMethod.value?.params), 'p|'))
const resultTreeRows = computed(() => flattenParamTree(buildParamTree(currentMethod.value?.result), 'r|'))

// ---------- 输入值存储（按点路径 dot-path 存值） ----------
const paramValues = ref({}) // { [fullKey]: string }
const setVal = (key, val) => { paramValues.value = { ...paramValues.value, [key]: val } }
const isRequiredEmpty = (node) => node.required && !(paramValues.value[node.fullKey] && paramValues.value[node.fullKey] !== '')

// 必填集合（用于裁剪空值时保留必填叶子）
const requiredSet = computed(() => {
  const s = new Set()
  for (const p of (currentMethod.value?.params || [])) if (p.required) s.add(p.key)
  return s
})

// 从示例请求体回填到 paramValues（按点路径匹配契约叶子）
const setValuesFromExample = (val, prefix) => {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    for (const k of Object.keys(val)) setValuesFromExample(val[k], prefix ? `${prefix}.${k}` : k)
  } else if (Array.isArray(val)) {
    val.forEach((v, i) => setValuesFromExample(v, prefix ? `${prefix}.${i}` : `${i}`))
  } else {
    paramValues.value[prefix] = (val === null || val === undefined) ? '' : String(val)
  }
}

const resetToExample = () => {
  const m = currentMethod.value
  if (!(m && m.example && m.example.request)) return
  try {
    paramValues.value = {}
    setValuesFromExample(JSON.parse(m.example.request), '')
  } catch { /* 示例非法则忽略 */ }
}

// ---------- 构造请求体（表单模式：由参数树 + 输入值组装） ----------
const leafValue = (node) => {
  const raw = paramValues.value[node.fullKey] ?? ''
  const t = node.type
  if (t === 'number') {
    const n = Number(raw)
    return (raw === '' || Number.isNaN(n)) ? (requiredSet.value.has(node.fullKey) ? raw : undefined) : n
  }
  if (t === 'boolean') return raw === 'true'
  if (t === 'json' || t === 'array') { try { return JSON.parse(raw) } catch { return raw } }
  if (t === 'null') return null
  return raw === '' ? (requiredSet.value.has(node.fullKey) ? '' : undefined) : raw
}

const buildBodyFromParamTree = () => {
  const root = buildParamTree(currentMethod.value?.params)
  const build = (node) => {
    const hasKids = node.children && node.children.length
    if (!hasKids) return leafValue(node) // 叶子
    // 分组：数组（数字子段）或对象
    const isArr = node.type === 'array' || node.children.every(c => /^\d+$/.test(c.name))
    if (isArr) return node.children.map(c => build(c))
    const obj = {}
    for (const c of node.children) obj[c.name] = build(c)
    return obj
  }
  const built = build(root)
  return pruneEmpty(built, '')
}

// 递归裁剪：删除空字符串的可选叶子、以及由空子节点构成的对象/数组
const pruneEmpty = (val, path) => {
  if (Array.isArray(val)) {
    const arr = val.map(v => pruneEmpty(v, path)).filter(v => v !== undefined)
    return arr.length ? arr : undefined
  }
  if (val && typeof val === 'object') {
    const obj = {}
    let any = false
    for (const k of Object.keys(val)) {
      const child = pruneEmpty(val[k], path ? `${path}.${k}` : k)
      if (child !== undefined) { obj[k] = child; any = true }
    }
    return any ? obj : undefined
  }
  if (val === '') return requiredSet.value.has(path) ? '' : undefined
  return val
}

// ---------- 模式 / JSON 文本 ----------
const mode = ref('form') // 'form' | 'json'
const jsonText = ref('')

watch(mode, (nv) => {
  if (nv === 'json' && !jsonText.value.trim()) {
    try { jsonText.value = JSON.stringify(buildBodyFromParamTree(), null, 2) } catch { /* ignore */ }
  }
})

// ---------- 构造请求体 ----------
const getBody = () => {
  if (mode.value === 'json') {
    const s = jsonText.value.trim()
    if (!s) return {}
    return JSON.parse(s)
  }
  return buildBodyFromParamTree()
}

const valuePlaceholder = (type) => {
  if (type === 'boolean') return 'true / false'
  if (type === 'number') return '如 9.80665'
  if (type === 'null') return '（值忽略）'
  return '文本'
}

// ---------- 方法发现（契约优先） ----------
const loadMetadata = async () => {
  methodLoading.value = true
  method.value = ''
  contractMethods.value = []
  try {
    const data = await request({ url: `/${props.code}/contract`, method: 'get', silent: true })
    const methods = Array.isArray(data?.methods) ? data.methods : []
    if (methods.length) {
      contractMethods.value = methods
      methodOptions.value = methods.map(m => m.name)
    } else {
      methodOptions.value = Array.isArray(data?.capabilities) ? data.capabilities : []
    }
  } catch {
    try {
      const md = await request({ url: `/${props.code}/metadata`, method: 'get', silent: true })
      methodOptions.value = Array.isArray(md?.capabilities) ? md.capabilities : []
    } catch {
      methodOptions.value = []
    }
  } finally {
    if (methodOptions.value.length) {
      method.value = methodOptions.value.includes('calculate') ? 'calculate' : methodOptions.value[0]
    }
    methodLoading.value = false
  }
}

// 选中方法变化：清空输入值，并用示例请求体回填（表单模式）
watch(method, () => {
  paramValues.value = {}
  const m = currentMethod.value
  if (m && m.example && m.example.request) {
    try { setValuesFromExample(JSON.parse(m.example.request), '') } catch { /* ignore */ }
  }
  if (mode.value === 'json') {
    jsonText.value = (m && m.example && m.example.request) ? m.example.request : ''
  }
})

// 必填校验（直接检查输入值，而非构造后的 body）
const validateRequired = () => {
  const m = currentMethod.value
  if (!m || !Array.isArray(m.params)) return ''
  for (const p of m.params) {
    if (p.required) {
      const v = paramValues.value[p.key]
      if (v === undefined || v === '') return `缺少必填参数：${p.key}`
    }
  }
  return ''
}

// ---------- 调用 ----------
const invoke = async () => {
  const m = (method.value || '').trim()
  if (!m) { ElMessage.warning('请选择方法'); return }
  let body
  try {
    body = getBody()
  } catch (e) {
    ElMessage.error(`构造请求体失败: ${e.message}`)
    return
  }
  const reqErr = validateRequired()
  if (reqErr) { ElMessage.error(reqErr); return }
  calling.value = true
  resText.value = ''
  const t0 = performance.now()
  const config = { timeout: 30000 }
  if (sessionId.value) config.headers = { 'X-Session-Id': sessionId.value }
  try {
    const resp = await axios.post(`/api/v1/${props.code}/${m}`, body, config)
    ok.value = true
    statusLine.value = `HTTP ${resp.status}`
    resText.value = JSON.stringify(resp.data, null, 2)
    const sid = (resp.headers && resp.headers['x-session-id']) || resp.data?.sessionId
    if (sid && props.stateful) sessionId.value = sid
  } catch (e) {
    ok.value = false
    statusLine.value = e.response ? `HTTP ${e.response.status}` : '网络错误'
    resText.value = JSON.stringify(e.response?.data ?? { message: e.message }, null, 2)
  } finally {
    elapsed.value = `${Math.round(performance.now() - t0)} ms`
    calling.value = false
  }
}

const resText = ref('')
const ok = ref(true)
const statusLine = ref('')
const elapsed = ref('')
const sessionId = ref('')

// 完整真实路由
const endpointUrl = computed(() => {
  if (!method.value) return ''
  const host = window.location.hostname || 'localhost'
  return `${window.location.protocol}//${host}:8080/api/v1/${props.code}/${method.value}`
})

// ---------- 复制工具 ----------
const copyText = async (text, okMsg) => {
  if (!text) return
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy')
      document.body.removeChild(ta)
    }
    ElMessage.success(okMsg)
  } catch {
    ElMessage.error('复制失败，请手动选择复制')
  }
}
const copyRoute = () => copyText(endpointUrl.value, '路由已复制')
const copySession = () => copySessionId()
const copySessionId = () => copyText(sessionId.value, '会话 ID 已复制')

onMounted(() => { loadMetadata() })

// 切换算法时重置
watch(() => props.code, () => {
  method.value = ''
  methodOptions.value = []
  paramValues.value = {}
  jsonText.value = ''
  resText.value = ''
  sessionId.value = ''
  mode.value = 'form'
  loadMetadata()
})
</script>

<style scoped>
/* ============ 根容器 ============ */
.method-debug { padding: 2px 2px 8px; }

/* ============ 方法选择行 ============ */
/* ============ 方法名 + 路由 同一行 ============ */
.top-row {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 12px;
  flex-wrap: nowrap;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}
.meta-label {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  flex: none;
}
.method-select { width: 320px; }
.meta-hint {
  font-size: 12px;
  color: #909399;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* ============ 路由行 ============ */
.route-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}
.route-empty {
  font-size: 13px;
  color: #a8abb2;
  font-style: italic;
}
/* POST/GET 等动词徽章：复用 Element Plus el-tag 样式，与版本「状态」标签一致 */
.method-badge { flex: none; }
.route-url {
  font-family: Consolas, Menlo, monospace;
  font-size: 13px;
  color: #303133;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 5px 12px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* ============ 会话（sessionId 输入） ============ */
.session-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.session-row .meta-label { flex: none; }
.session-input {
  flex: 1;
  max-width: 560px;
}
.session-input :deep(.el-input__wrapper) {
  font-family: Consolas, Menlo, monospace;
  font-size: 13px;
}
.session-input :deep(.el-input__inner)::placeholder {
  color: #c0c4cc;
  font-size: 12px;
  font-family: inherit;
}
.copy-route {
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.copy-route .copy-text { margin-left: 1px; }

/* ============ 文档区（参数说明 / 返回字段） ============ */
.doc-section { margin: 4px 0 18px; }

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0 10px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
}
.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #303133;
}
.section-sub {
  font-size: 12px;
  color: #909399;
}
.result-head { border-left-color: #67c23a; }
/* 参数说明表头右侧：模式切换 + 填充 + 调用 */
.section-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.mode-switch { flex: none; }
.invoke-btn {
  font-weight: 600;
  padding: 8px 22px;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.25);
}

/* 参数 / 返回 表格 */
.param-table {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
/* 可编辑（参数说明）：7 列含「输入值」 */
.param-table.editable .pt-head,
.param-table.editable .pt-row {
  grid-template-columns: minmax(150px, 1.4fr) minmax(150px, 1.3fr) 80px 60px 96px minmax(96px, 0.9fr) minmax(130px, 1.3fr);
}
/* 只读（返回字段）：6 列 */
.param-table .pt-head,
.param-table .pt-row {
  display: grid;
  grid-template-columns: minmax(160px, 1.5fr) 92px 70px 116px minmax(110px, 1fr) minmax(150px, 1.4fr);
  gap: 12px;
  align-items: center;
  padding: 9px 14px;
}
.pt-head {
  background: #f5f7fa;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  border-bottom: 1px solid #ebeef5;
}
.pt-row {
  font-size: 13px;
  color: #303133;
  border-bottom: 1px solid #f2f3f5;
  transition: background 0.15s;
}
.pt-row:last-child { border-bottom: none; }
.pt-row:hover { background: #f0f7ff; }
.pt-row.is-group { background: #fbfaff; }
.pt-row.is-group:hover { background: #f3effe; }
.c-key {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.c-key code {
  font-family: Consolas, Menlo, monospace;
  font-size: 12.5px;
  font-weight: 600;
  color: #303133;
  word-break: break-all;
}
.pt-row.is-group .c-key code { color: #5b3fd6; }
.caret {
  flex: none;
  width: 14px;
  text-align: center;
  cursor: pointer;
  color: #909399;
  font-size: 12px;
  transition: color 0.15s;
  user-select: none;
}
.caret:hover { color: #409eff; }
.caret-spacer { flex: none; width: 14px; }
.type-chip {
  display: inline-block;
  font-family: Consolas, Menlo, monospace;
  font-size: 11.5px;
  color: #606266;
  background: #f0f2f5;
  border-radius: 4px;
  padding: 2px 8px;
}
.type-chip.is-group {
  color: #7c4dff;
  background: #f3effe;
  border: 1px solid #e4d9ff;
}
.c-req { text-align: center; }
.c-unit { color: #606266; }
.c-enum { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.enum-tag {
  margin: 0;
  font-family: Consolas, Menlo, monospace;
  background: #fdf6ec;
  border-color: #faecd8;
  color: #e6a23c;
}
.c-desc { color: #606266; line-height: 1.5; word-break: break-all; }
.muted { color: #c0c4cc; }

/* 输入值列 */
.c-input {
  min-width: 0;
  display: flex;
  align-items: center;
}
.input-cell { width: 100%; }
.input-cell.is-invalid :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #f56c6c inset;
}

/* ============ JSON 输入 ============ */
.json-input { font-family: Consolas, Menlo, monospace; }
.json-input :deep(textarea) { font-family: Consolas, Menlo, monospace; }

/* ============ JSON / 响应代码块 ============ */
.json-box {
  margin: 0 0 16px;
  padding: 12px 14px;
  background: #f7f8fa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
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

/* ============ 响应区 ============ */
.resp-section { margin-top: 4px; }
.resp-meta { display: flex; align-items: center; gap: 10px; }
.elapsed { font-size: 12px; color: #909399; }
</style>
