<template>
  <div>
    <el-card shadow="never">
      <div class="table-toolbar">
        <el-button type="success" @click="openCreate">新建版本</el-button>
      </div>
      <div v-loading="loading" class="table-wrap">
        <el-table :data="tableData" border stripe style="width:100%" scrollbar-always-on empty-text="该算法暂无版本">
          <el-table-column prop="version" label="版本号" width="120" />
          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="创建时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="320">
            <template #default="{ row }">
              <el-button link type="primary" :disabled="row.status !== 'draft'" @click="openEdit(row)">编辑</el-button>
              <el-button link type="success" :disabled="row.status !== 'draft'" @click="onPublish(row)">发布</el-button>
              <el-button link type="warning" :disabled="row.status === 'archived'" @click="onArchive(row)">归档</el-button>
              <el-button link type="primary" @click="openFiles(row)">文件</el-button>
              <el-button link type="info" @click="openChangelog(row)">操作日志</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-pagination
        v-if="total > 0"
        class="pager"
        background
        layout="total, sizes, prev, pager, next, jumper"
        v-model:current-page="page"
        v-model:page-size="limit"
        :page-sizes="[5, 10, 20, 50]"
        :total="total"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </el-card>

    <!-- 新建版本 -->
    <el-dialog v-model="createVisible" title="新建版本" width="520px" :lock-scroll="false">
      <el-form ref="cFormRef" :model="cForm" :rules="cRules" label-width="90px">
        <el-form-item label="算法ID">
          <el-input :model-value="algorithmId" disabled />
        </el-form-item>
        <el-form-item label="版本号">
          <div class="readonly-text">{{ nextVersionHint }}</div>
        </el-form-item>
        <el-form-item label="操作人" prop="operator">
          <el-input v-model="cForm.operator" placeholder="请输入操作人" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="cForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="代码文件" prop="files">
          <div
            class="drop-zone"
            :class="{ 'drop-zone--active': dragDepth > 0 }"
            @click="createFileInputRef && createFileInputRef.click()"
            @dragenter.prevent="dragDepth++"
            @dragover.prevent
            @dragleave.prevent="dragDepth = Math.max(0, dragDepth - 1)"
            @drop.prevent="onDrop"
          >
            <el-icon class="drop-icon"><UploadFilled /></el-icon>
            <div class="drop-text">将代码文件夹或文件拖拽到此处上传</div>
            <div class="drop-sub">支持多级子目录，也可点击选择文件夹</div>
          </div>
          <input ref="createFileInputRef" type="file" webkitdirectory multiple style="display:none" @change="onCreateFileChange" />
          <div v-if="cForm.files.length" class="hint file-list">
            <div class="file-list-head">
              <span>已选 {{ cForm.files.length }} 个文件，共 {{ formatSize(totalSelectedSize) }}</span>
              <el-button link type="danger" size="small" @click.stop="clearCreateFiles">清空</el-button>
            </div>
            <div class="file-list-body">
              <div v-for="(item, i) in cForm.files" :key="i" class="file-list-item">
                {{ item.relativePath || item.file.name }} ({{ formatSize(item.file.size) }})
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitCreate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑版本（仅草稿） -->
    <el-dialog v-model="editVisible" title="编辑版本" width="520px" :lock-scroll="false" align-center>
      <el-form ref="eFormRef" :model="eForm" :rules="eRules" label-width="90px">
        <el-form-item label="版本号">
          <div class="readonly-text">{{ eForm.version }}</div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="eForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="操作人" prop="operator">
          <el-input v-model="eForm.operator" placeholder="请输入操作人" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitEdit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 版本文件 -->
    <el-dialog v-model="filesVisible" title="版本文件" width="760px" :lock-scroll="false" align-center>
      <div v-if="activeVersion" style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:10px">
        <span style="color:#606266;font-size:14px;font-weight:500">
          版本：{{ activeVersion.version }} · 状态：<el-tag :type="statusType(activeVersion.status)" size="small">{{ statusLabel(activeVersion.status) }}</el-tag>
        </span>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <el-button v-if="activeVersion.status === 'draft'" type="danger" :disabled="!canBatchDelete" @click="confirmBatchDeleteFiles">批量删除</el-button>
          <el-button type="success" :disabled="!selectedFiles.length" @click="batchDownload">批量下载</el-button>
          <span v-if="selectedFiles.length" style="color:#909399;font-size:12px;white-space:nowrap">已选 {{ selectedFiles.length }} 项</span>
          <el-button v-if="activeVersion.status === 'draft'" type="primary" :disabled="!canUploadFolder" @click="folderInputRef && folderInputRef.click()">上传文件夹</el-button>
          <input v-if="activeVersion.status === 'draft'" ref="folderInputRef" type="file" webkitdirectory multiple style="display:none" @change="onFolderChange" />
        </div>
      </div>
      <el-table
        ref="fileTableRef"
        :data="fileList"
        border
        stripe
        empty-text="暂无文件"
        style="margin-top:4px"
        scrollbar-always-on
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="45" />
        <el-table-column prop="name" label="文件名（相对路径）" min-width="280" show-overflow-tooltip />
        <el-table-column label="大小" width="110" align="right">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 操作日志 -->
    <el-dialog v-model="logVisible" title="操作日志" width="960px" :lock-scroll="false" align-center class="log-dialog">
      <div v-loading="logLoading" class="table-wrap log-table-wrap">
        <el-table :data="changeLogs" height="420" border stripe empty-text="暂无记录" scrollbar-always-on style="width:100%">
          <el-table-column prop="version" label="版本号" width="80" align="center" />
          <el-table-column prop="operator" label="操作人" width="90" align="center" />
          <el-table-column label="动作" width="120" align="center">
            <template #default="{ row }"><el-tag :type="actionTagType(row.action)" :class="actionTagClass(row.action)">{{ actionLabel(row.action) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="时间" width="150" align="center">
            <template #default="{ row }">{{ formatDateTime(row.changeTime) }}</template>
          </el-table-column>
          <el-table-column prop="changeDesc" label="说明" min-width="200" show-overflow-tooltip />
        </el-table>
      </div>
      <el-pagination
        v-if="logTotal > 0"
        class="pager"
        background
        layout="total, sizes, prev, pager, next, jumper"
        v-model:current-page="logPage"
        v-model:page-size="logLimit"
        :page-sizes="[5, 10, 20, 50]"
        :total="logTotal"
        @current-change="onLogPageChange"
        @size-change="onLogSizeChange"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listVersions, getVersion, createVersion, updateVersion,
  publishVersion, archiveVersion, getVersionChangelog,
  uploadVersionFile, uploadVersionFiles, deleteVersionFile,
  batchDownloadVersionFiles
} from '../api/version'
import { updateAlgorithm } from '../api/algorithm'

const props = defineProps({
  algorithmId: { type: String, required: true },
  openOnMount: { type: Boolean, default: false }
})

const emit = defineEmits(['changed', 'opened'])

const loading = ref(false)
const submitting = ref(false)
const tableData = ref([])
const operator = 'system'

const page = ref(1)
const limit = ref(10)
const total = ref(0)

const statusLabel = (s) => ({ draft: '草稿', released: '已发布', archived: '已归档', rollback: '回滚' }[s] || s)
const statusType = (s) => ({ draft: 'info', released: 'success', archived: 'warning', rollback: 'danger' }[s] || 'info')
const actionLabel = (a) => ({ create: '创建', publish: '发布', archive: '归档', edit: '编辑', 'upload-file': '上传文件', 'download-file': '下载文件', 'delete-file': '删除文件' }[a] || a)
const actionTagType = (a) => ({ create: 'success', publish: 'primary', archive: 'info', edit: 'warning', 'upload-file': 'success', 'download-file': 'success', 'delete-file': 'danger' }[a] || 'info')
// 上传文件/下载文件用自定义配色覆盖，避免与「创建」等默认色重复
const actionTagClass = (a) => ({ 'upload-file': 'log-tag-upload', 'download-file': 'log-tag-download' }[a] || '')

const nextVersionHint = computed(() => {
  let max = 0
  for (const v of tableData.value) {
    const m = /(\d+)/.exec((v.version || '').split('.')[0])
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `v${max + 1}`
})

const hasNonArchivedVersion = async () => {
  const [draft, released] = await Promise.all([
    listVersions({ algorithmId: props.algorithmId, status: 'draft', limit: 1, offset: 0 }),
    listVersions({ algorithmId: props.algorithmId, status: 'released', limit: 1, offset: 0 })
  ])
  return ((draft.total || 0) + (released.total || 0)) > 0
}

const fetchList = async () => {
  if (!props.algorithmId) return
  loading.value = true
  try {
    const res = await listVersions({
      algorithmId: props.algorithmId,
      limit: limit.value,
      offset: (page.value - 1) * limit.value
    })
    tableData.value = (res.list || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

const onPageChange = (p) => {
  page.value = p
  fetchList()
}

const onSizeChange = (size) => {
  limit.value = size
  page.value = 1
  fetchList()
}

// 新建
const createVisible = ref(false)
const cFormRef = ref()
const createFileInputRef = ref()
const cForm = reactive({ operator: '', description: '', files: [] })
const cRules = {
  operator: [{ required: true, message: '请输入操作人', trigger: 'blur' }],
  files: [{
    required: true,
    validator: (rule, value, cb) => {
      if (!value || !value.length) cb(new Error('请上传代码文件夹'))
      else cb()
    },
    trigger: 'change'
  }]
}

const openCreate = async () => {
  if (await hasNonArchivedVersion()) {
    await ElMessageBox.alert(
      '当前存在未归档的旧版本（草稿/已发布），请先将旧版本全部归档后再新建版本。',
      '无法新建版本',
      { type: 'warning', lockScroll: false }
    )
    return
  }
  Object.assign(cForm, { operator: '', description: '', files: [] })
  if (createFileInputRef.value) createFileInputRef.value.value = ''
  createVisible.value = true
  nextTick(() => cFormRef.value?.clearValidate())
}

const onCreateFileChange = (e) => {
  const files = e.target.files
  const arr = []
  if (files && files.length) {
    for (const f of files) {
      arr.push({ file: f, relativePath: f.webkitRelativePath || f.name })
    }
  }
  cForm.files = arr
  cFormRef.value?.validateField('files')
}

// ---- 拖拽上传（新建版本）：支持拖入文件夹/多文件，递归遍历并保留相对路径 ----
const dragDepth = ref(0)
const totalSelectedSize = computed(() => cForm.files.reduce((s, it) => s + (it.file.size || 0), 0))

// 递归遍历拖入的目录条目（webkitGetAsEntry），收集 { file, relativePath }
const traverseEntry = async (entry, parent, out) => {
  if (!entry) return
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej))
    out.push({ file, relativePath: parent ? `${parent}/${file.name}` : file.name })
  } else if (entry.isDirectory) {
    const path = parent ? `${parent}/${entry.name}` : entry.name
    const reader = entry.createReader()
    // readEntries 每次最多返回 100 条，需循环读到空为止
    for (;;) {
      const batch = await new Promise((res, rej) => reader.readEntries(res, rej))
      if (!batch || !batch.length) break
      for (const child of batch) await traverseEntry(child, path, out)
    }
  }
}

const onDrop = async (e) => {
  dragDepth.value = 0
  const dt = e.dataTransfer
  if (!dt) return
  const out = []
  const items = dt.items
  if (items && items.length && items[0].webkitGetAsEntry) {
    const entries = []
    for (const it of items) {
      const en = it.webkitGetAsEntry && it.webkitGetAsEntry()
      if (en) entries.push(en)
    }
    for (const en of entries) await traverseEntry(en, '', out)
  }
  // 兜底：浏览器不支持 webkitGetAsEntry 时退化为普通文件列表
  if (!out.length && dt.files && dt.files.length) {
    for (const f of dt.files) out.push({ file: f, relativePath: f.webkitRelativePath || f.name })
  }
  if (!out.length) return
  cForm.files = out
  cFormRef.value?.validateField('files')
}

const clearCreateFiles = () => {
  cForm.files = []
  if (createFileInputRef.value) createFileInputRef.value.value = ''
  cFormRef.value?.validateField('files')
}

const onSubmitCreate = async () => {
  await cFormRef.value.validate()
  if (!cForm.files.length) {
    ElMessage.error('请上传代码文件夹')
    return
  }
  submitting.value = true
  let version = null
  try {
    await updateAlgorithm(props.algorithmId, { updateUser: cForm.operator })
    version = await createVersion({
      algorithmId: props.algorithmId,
      operator: cForm.operator,
      description: cForm.description
    })
    if (!version || !version.id) {
      ElMessage.error('版本创建失败')
      return
    }
    // 一次请求批量上传，操作日志合并为一条记录
    await uploadVersionFiles(
      version.id,
      cForm.files.map(item => ({ file: item.file, relativePath: item.relativePath })),
      cForm.operator
    )
    ElMessage.success(`创建成功并上传 ${cForm.files.length} 个文件`)
    createVisible.value = false
    page.value = 1
    fetchList()
    emit('changed')
  } catch (err) {
    if (version && version.id) {
      ElMessage.warning('版本已创建，但部分文件上传失败，请到「文件」管理中重新上传')
      createVisible.value = false
      fetchList()
      emit('changed')
    } else {
      ElMessage.error('创建失败：' + (err?.message || err))
    }
  } finally {
    submitting.value = false
  }
}

// 编辑（仅草稿）
const editVisible = ref(false)
const eFormRef = ref()
const eForm = reactive({ id: '', version: '', description: '', operator: '' })
const eRules = {
  operator: [{ required: true, message: '请输入操作人', trigger: 'blur' }]
}

const openEdit = (row) => {
  Object.assign(eForm, {
    id: row.id, version: row.version, description: row.description || '', operator: ''
  })
  editVisible.value = true
  nextTick(() => eFormRef.value?.clearValidate())
}

const onSubmitEdit = async () => {
  await eFormRef.value.validate()
  submitting.value = true
  try {
    await updateAlgorithm(props.algorithmId, { updateUser: eForm.operator })
    await updateVersion(eForm.id, {
      description: eForm.description,
      operator: eForm.operator
    })
    ElMessage.success('更新成功')
    editVisible.value = false
    fetchList()
    emit('changed')
  } finally {
    submitting.value = false
  }
}

// 发布 / 归档
const onPublish = async (row) => {
  const others = tableData.value.filter(v => v.status !== 'archived' && v.id !== row.id)
  const message = others.length
    ? `发布「${row.version}」将自动归档当前所有旧版本（共 ${others.length} 个，含草稿与已发布），确认继续？`
    : `确认发布版本「${row.version}」？发布后该版本将变为已发布状态。`
  await ElMessageBox.confirm(message, '发布确认', { type: 'warning', lockScroll: false })
  try {
    await publishVersion(row.id, operator)
  } catch (err) {
    // 发布失败用弹窗展示后端校验原因（如缺少 algorithm.yaml / entry 主文件）
    ElMessageBox.alert(err?.message || '发布失败', '发布失败', { type: 'error', lockScroll: false })
    return
  }
  ElMessage.success('已发布')
  fetchList()
  emit('changed')
}

const onArchive = async (row) => {
  await ElMessageBox.confirm(`确认归档版本「${row.version}」？归档后不可修改，仅保留历史。`, '提示', { type: 'warning', lockScroll: false })
  await archiveVersion(row.id, operator)
  ElMessage.success('已归档')
  fetchList()
  emit('changed')
}

// 版本文件
const filesVisible = ref(false)
const activeVersion = ref(null)
const fileList = ref([])
const folderInputRef = ref()
const fileTableRef = ref()
const selectedFiles = ref([])

const canUploadFolder = computed(() => activeVersion.value && activeVersion.value.status === 'draft')
const canBatchDelete = computed(() => activeVersion.value && activeVersion.value.status === 'draft' && selectedFiles.value.length > 0)

const openFiles = async (row) => {
  activeVersion.value = row
  fileList.value = row.files || []
  selectedFiles.value = []
  if (fileTableRef.value) fileTableRef.value.clearSelection()
  filesVisible.value = true
}

const handleSelectionChange = (rows) => {
  selectedFiles.value = rows
}

// 重新拉取当前打开版本的详情（含最新文件列表），同步刷新 dialog 与列表数据
const refreshActiveFiles = async () => {
  if (!activeVersion.value) return
  const res = await getVersion(activeVersion.value.id)
  if (!res || !res.id) return
  const files = res.files || []
  // 更新 dialog 内展示的版本与文件列表
  activeVersion.value = { ...activeVersion.value, ...res, files }
  fileList.value = files
  // 同步刷新分页列表里对应版本，避免再次打开 dialog 时数据陈旧
  const idx = tableData.value.findIndex(v => v.id === res.id)
  if (idx >= 0) {
    tableData.value[idx] = { ...tableData.value[idx], ...res, files }
  }
}

const onFolderChange = async (e) => {
  const files = e.target.files
  const arr = []
  if (files && files.length) {
    for (const f of files) arr.push(f)
  }
  if (!arr.length) return
  if (!canUploadFolder.value) {
    ElMessage.warning('仅草稿版本可上传文件')
    return
  }
  submitting.value = true
  try {
    // 一次请求批量上传，操作日志合并为一条记录
    await uploadVersionFiles(
      activeVersion.value.id,
      arr.map(f => ({ file: f, relativePath: f.webkitRelativePath || f.name })),
      operator
    )
    ElMessage.success(`已上传 ${arr.length} 个文件`)
    await refreshActiveFiles()
    fetchList()
    emit('changed')
  } catch (err) {
    ElMessage.error('上传失败：' + (err?.message || err))
  } finally {
    submitting.value = false
    if (folderInputRef.value) folderInputRef.value.value = ''
  }
}

const onFileChange = async (uploadFile) => {
  const file = uploadFile.raw
  if (!file || !activeVersion.value) return
  try {
    await uploadVersionFile(activeVersion.value.id, file, operator)
    ElMessage.success(`已上传 ${file.name}`)
    await refreshActiveFiles()
    fetchList()
    emit('changed')
  } catch (e) {
    ElMessage.error('上传失败')
  }
}

// 批量下载：将选中的文件打包成 zip（保留相对路径结构）一次性下载
const batchDownload = async () => {
  if (!activeVersion.value || !selectedFiles.value.length) return
  try {
    const blob = await batchDownloadVersionFiles(
      activeVersion.value.id,
      selectedFiles.value.map(f => f.path),
      operator
    )
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `version-${activeVersion.value.version}-files.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    ElMessage.success(`已开始下载 ${selectedFiles.value.length} 个文件`)
  } catch (err) {
    ElMessage.error('批量下载失败：' + (err?.message || err))
  }
}

const confirmBatchDeleteFiles = async () => {
  if (!activeVersion.value || !selectedFiles.value.length) return
  const names = selectedFiles.value.map(f => f.name).join('、')
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedFiles.value.length} 个文件吗？\n${names}`,
      '批量删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false
      }
    )
    await batchDeleteFiles()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('批量删除失败：' + (err?.message || err))
    }
  }
}

const batchDeleteFiles = async () => {
  if (!activeVersion.value || !selectedFiles.value.length) return
  submitting.value = true
  let success = 0
  let failed = 0
  try {
    for (const f of selectedFiles.value) {
      try {
        await deleteVersionFile(activeVersion.value.id, f.path, operator)
        success++
      } catch (err) {
        failed++
        console.error('删除文件失败：', f.path, err)
      }
    }
    if (success > 0) {
      ElMessage.success(`已删除 ${success} 个文件`)
    }
    if (failed > 0) {
      ElMessage.warning(`${failed} 个文件删除失败`)
    }
    selectedFiles.value = []
    if (fileTableRef.value) fileTableRef.value.clearSelection()
    await refreshActiveFiles()
    fetchList()
    emit('changed')
  } finally {
    submitting.value = false
  }
}

// 操作日志
const logVisible = ref(false)
const changeLogs = ref([])
const logVersionId = ref('')
const logPage = ref(1)
const logLimit = ref(10)
const logTotal = ref(0)
const logLoading = ref(false)

const fetchChangeLogs = async () => {
  if (!logVersionId.value) return
  logLoading.value = true
  try {
    const res = await getVersionChangelog(logVersionId.value, {
      limit: logLimit.value,
      offset: (logPage.value - 1) * logLimit.value
    })
    changeLogs.value = res.list || []
    logTotal.value = res.total || 0
  } finally {
    logLoading.value = false
  }
}

const openChangelog = async (row) => {
  logVersionId.value = row.id
  logPage.value = 1
  logLimit.value = 10
  await fetchChangeLogs()
  logVisible.value = true
}

const onLogPageChange = (page) => {
  logPage.value = page
  fetchChangeLogs()
}

const onLogSizeChange = (size) => {
  logLimit.value = size
  logPage.value = 1
  fetchChangeLogs()
}

const formatDateTime = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const formatSize = (bytes) => {
  if (bytes == null) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0, n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(1)} ${units[i]}`
}

onMounted(async () => {
  fetchList()
  if (props.openOnMount) {
    await openCreate()
    emit('opened')
  }
})
watch(() => props.algorithmId, fetchList)
</script>

<style scoped>
.hint { color: #909399; font-size: 12px; margin-top: 4px; }
/* 拖拽上传区域（新建版本） */
.drop-zone {
  width: 100%;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
  padding: 18px 12px;
  text-align: center;
  cursor: pointer;
  transition: border-color .2s, background-color .2s;
}
.drop-zone:hover,
.drop-zone--active {
  border-color: #409eff;
  background: #ecf5ff;
}
.drop-icon { font-size: 30px; color: #c0c4cc; margin-bottom: 6px; }
.drop-zone--active .drop-icon { color: #409eff; }
.drop-text { color: #606266; font-size: 14px; }
.drop-sub { color: #909399; font-size: 12px; margin-top: 2px; }
.file-list { width: 100%; margin-top: 8px; }
.file-list-head { display: flex; justify-content: space-between; align-items: center; color: #606266; }
.file-list-body { max-height: 140px; overflow: auto; margin-top: 4px; }
.file-list-item { line-height: 20px; word-break: break-all; }
.readonly-text { color: #606266; font-size: 14px; line-height: 32px; }
.table-wrap { min-height: 320px; }
.table-toolbar { margin-bottom: 16px; display: flex; justify-content: flex-end; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
/* 操作日志动作标签自定义配色（覆盖 el-tag 默认类型色，保证各动作颜色互不重复） */
.el-tag.log-tag-upload {
  --el-tag-bg-color: #f4ecff;
  --el-tag-border-color: #e0ccff;
  --el-tag-text-color: #7a35d6;
}
.el-tag.log-tag-download {
  --el-tag-bg-color: #e2f7f4;
  --el-tag-border-color: #c2ece6;
  --el-tag-text-color: #0d9488;
}
</style>
