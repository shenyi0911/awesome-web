<template>
  <div>
    <el-card shadow="never">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="名称">
          <el-input v-model="query.name" placeholder="算法名称" clearable @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item label="唯一标识符">
          <el-input v-model="query.code" placeholder="唯一标识符" clearable @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
          <el-button type="success" @click="openCreate">新增算法</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:16px">
      <el-table :data="tableData" v-loading="loading" border stripe style="width:100%" scrollbar-always-on>
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column prop="code" label="唯一标识符" min-width="140" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="language" label="开发语言" width="100" />
        <el-table-column prop="author" label="作者" width="120" />
        <el-table-column label="版本" min-width="160">
          <template #default="{ row }">
            <template v-if="row.latestVersion">
              <el-tag size="small" type="primary" style="cursor:pointer" @click="goVersions(row)">{{ row.latestVersion }}</el-tag>
              <el-tag
                size="small"
                :type="statusType(row.latestVersionStatus)"
                style="margin-left:8px;cursor:pointer"
                @click="goVersions(row)"
              >{{ versionStatusLabel(row.latestVersionStatus) }}</el-tag>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170">
          <template #default="{ row }">
            <el-button link type="primary" @click="goDetail(row)">详情</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-tooltip
              :disabled="canDelete(row)"
              content="最新版本为已发布状态，需先归档才能删除"
              placement="top"
            >
              <span class="del-wrap">
                <el-button link type="danger" :disabled="!canDelete(row)" @click="onDelete(row)">删除</el-button>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="pager"
        background
        layout="total, prev, pager, next"
        :total="total"
        :current-page="query.page"
        :page-size="query.limit"
        @current-change="onPageChange"
      />
    </el-card>

    <!-- 新增算法弹窗 -->
    <el-dialog v-model="createVisible" title="新增算法" width="560px" align-center :lock-scroll="false">
      <el-form ref="createFormRef" :model="form" :rules="createRules" label-width="110px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="中文/字母/数字" />
        </el-form-item>
        <el-form-item label="唯一标识符" prop="code" :error="codeError">
          <el-input v-model="form.code" placeholder="小写字母/数字/连字符/下划线（Dapr app-id）" @input="codeError = ''" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width:100%">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="开发语言" prop="language">
          <el-select v-model="form.language" placeholder="请选择开发语言" style="width:100%">
            <el-option v-for="l in languages" :key="l" :label="l" :value="l" />
          </el-select>
        </el-form-item>
        <el-form-item label="作者" prop="author">
          <el-input v-model="form.author" />
        </el-form-item>
        <el-form-item label="有状态" prop="stateful">
          <el-radio-group v-model="form.stateful">
            <el-radio label="是" value="true" />
            <el-radio label="否" value="false" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="应用场景">
          <el-input v-model="form.scene" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onCreateSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑算法弹窗 -->
    <el-dialog v-model="editVisible" title="编辑算法" width="560px" align-center :lock-scroll="false">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="110px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="editForm.category" placeholder="请选择分类" style="width:100%">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="唯一标识符">
          <el-input v-model="editForm.code" disabled />
        </el-form-item>
        <el-form-item label="开发语言">
          <el-input v-model="editForm.language" disabled />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="editForm.author" disabled />
        </el-form-item>
        <el-form-item label="有状态">
          <el-input :value="editForm.stateful ? '是' : '否'" disabled />
        </el-form-item>
        <el-form-item label="应用场景">
          <el-input v-model="editForm.scene" />
        </el-form-item>
        <el-form-item label="更新人" prop="updateUser">
          <el-input v-model="editForm.updateUser" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="最新版本">
          <div v-if="loadingFiles" class="file-tip">加载中...</div>
          <div v-else-if="!latestVersion" class="file-tip">暂无版本</div>
          <div v-else>
            <div class="version-line">
              <el-tag size="small" type="primary">{{ latestVersion.version }}</el-tag>
              <el-tag size="small" :type="latestVersion.status === 'released' ? 'success' : latestVersion.status === 'archived' ? 'warning' : 'info'" style="margin-left:8px">
                {{ versionStatusLabel(latestVersion.status) }}
              </el-tag>
            </div>
            <ul v-if="existingFiles.length" class="file-list">
              <li v-for="f in existingFiles" :key="f.path">
                {{ f.name }} ({{ formatSize(f.size) }})
              </li>
            </ul>
            <div v-else class="file-tip">该版本暂无文件</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onEditSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listAlgorithms, createAlgorithm, updateAlgorithm, deleteAlgorithm } from '../api/algorithm'
import { getAlgorithmInfo } from '../api/info'

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const tableData = ref([])
const total = ref(0)

const createVisible = ref(false)
const createFormRef = ref()
const codeError = ref('')
const editVisible = ref(false)
const editFormRef = ref()

const languages = ['Java', 'Python', 'C++', 'C#', 'Go']
const categories = ['通用', '采集', '决策']

const query = reactive({ name: '', code: '', page: 1, limit: 10 })
const form = reactive({
  name: '', code: '', category: '', language: '',
  author: '', scene: '', stateful: '', description: ''
})
const editForm = reactive({
  id: '', name: '', category: '', code: '', language: '', author: '', stateful: false,
  scene: '', updateUser: '', description: ''
})

const createRules = {
  name: [
    { required: true, message: '请输入名称', trigger: ['blur', 'change'] },
    { pattern: /^[a-zA-Z0-9\u4e00-\u9fa5]+$/, message: '仅允许中文、字母、数字', trigger: ['blur', 'change'] }
  ],
  code: [
    { required: true, message: '请输入唯一标识符', trigger: ['blur', 'change'] },
    { pattern: /^[a-z0-9_-]+$/, message: '仅允许小写字母、数字、连字符、下划线（Dapr app-id 规则）', trigger: ['blur', 'change'] }
  ],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  language: [{ required: true, message: '请选择语言', trigger: 'change' }],
  author: [
    { required: true, message: '请输入作者', trigger: ['blur', 'change'] },
    { pattern: /^[a-zA-Z0-9\u4e00-\u9fa5]+$/, message: '仅允许中文、字母、数字', trigger: ['blur', 'change'] }
  ],
  stateful: [{ required: true, message: '请选择是否有状态', trigger: 'change' }]
}

const editRules = {
  name: [
    { required: true, message: '请输入名称', trigger: ['blur', 'change'] },
    { pattern: /^[a-zA-Z0-9\u4e00-\u9fa5]+$/, message: '仅允许中文、字母、数字', trigger: ['blur', 'change'] }
  ],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  updateUser: [{ required: true, message: '请输入更新人', trigger: 'blur' }]
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await listAlgorithms({
      name: query.name, code: query.code,
      limit: query.limit, offset: (query.page - 1) * query.limit
    })
    tableData.value = (res.list || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

const onSearch = () => { query.page = 1; fetchList() }
const onReset = () => { query.name = ''; query.code = ''; query.page = 1; fetchList() }
const onPageChange = (p) => { query.page = p; fetchList() }

const resetCreateForm = () => {
  Object.assign(form, {
    name: '', code: '', category: '', language: '',
    author: '', scene: '', stateful: '', description: ''
  })
}

const openCreate = () => {
  resetCreateForm()
  codeError.value = ''
  createVisible.value = true
  nextTick(() => createFormRef.value?.clearValidate())
}

const existingFiles = ref([])
const loadingFiles = ref(false)
const latestVersion = ref(null)

const versionStatusLabel = (s) => ({ draft: '草稿', released: '已发布', archived: '已归档', rollback: '回滚' }[s] || s)
const statusType = (s) => ({ released: 'success', archived: 'warning', rollback: 'danger', draft: 'info' }[s] || 'info')

const openEdit = async (row) => {
  Object.assign(editForm, {
    id: row.id, name: row.name, category: row.category,
    code: row.code || '', language: row.language || '', author: row.author || '',
    stateful: row.stateful,
    scene: row.scene || '', updateUser: row.updateUser || '', description: row.description || ''
  })
  editVisible.value = true
  loadingFiles.value = true
  try {
    const info = await getAlgorithmInfo(row.id)
    const versions = (info.versions || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    latestVersion.value = versions[0] || null
    existingFiles.value = latestVersion.value ? (latestVersion.value.files || []) : []
  } catch (err) {
    latestVersion.value = null
    existingFiles.value = []
  } finally {
    loadingFiles.value = false
  }
  nextTick(() => editFormRef.value?.clearValidate())
}

const goDetail = (row) => router.push(`/algorithms/${row.id}`)
const goVersions = (row) => router.push(`/algorithms/${row.id}/versions`)

// 仅最新版本为草稿/已归档（或尚无版本）的算法可删除
const canDelete = (row) => !row.latestVersionStatus || row.latestVersionStatus !== 'released'

const onDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定删除算法「${row.name}」吗？将删除其全部版本的文件与所有相关记录，操作不可恢复！`,
      '删除算法',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger' }
    )
  } catch {
    return
  }
  try {
    await deleteAlgorithm(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (err) {
    ElMessage.error(err.message || '删除失败')
  }
}

const onCreateSubmit = async () => {
  await createFormRef.value.validate()
  if (form.stateful !== 'true' && form.stateful !== 'false') {
    ElMessage.error('请选择是否有状态')
    return
  }
  submitting.value = true
  try {
    const algo = await createAlgorithm({
      name: form.name,
      code: form.code,
      category: form.category,
      language: form.language,
      author: form.author,
      scene: form.scene || '',
      stateful: form.stateful === 'true',
      description: form.description || ''
    }, { silent: true })
    ElMessage.success('创建成功')
    createVisible.value = false
    fetchList()
    if (algo && algo.id) {
      router.push({ path: `/algorithms/${algo.id}`, query: { createVersion: '1' } })
    }
  } catch (err) {
    const msg = err.message || ''
    if (msg.toLowerCase().includes('already exists') || msg.includes('code')) {
      codeError.value = '唯一标识符已存在'
    } else {
      ElMessage.error(msg || '创建失败')
    }
  } finally {
    submitting.value = false
  }
}

const onEditSubmit = async () => {
  await editFormRef.value.validate()
  submitting.value = true
  try {
    const { id } = editForm
    const payload = {
      name: editForm.name,
      category: editForm.category,
      scene: editForm.scene,
      updateUser: editForm.updateUser,
      description: editForm.description
    }
    await updateAlgorithm(id, payload)
    ElMessage.success('更新成功')
    editVisible.value = false
    fetchList()
  } finally {
    submitting.value = false
  }
}

const formatSize = (bytes) => {
  if (bytes == null) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(1)} ${units[i]}`
}

const formatDateTime = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(fetchList)
</script>

<style scoped>
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
.file-tip { color: #909399; font-size: 12px; margin-top: 6px; }
.file-tip.existing { color: #67c23a; }
.file-list {
  margin: 6px 0 0 0;
  padding-left: 18px;
  color: #606266;
  font-size: 13px;
  line-height: 1.8;
}
.file-list li::marker { color: #909399; }
.version-line { display: flex; align-items: center; }
/* tooltip 包裹层打断了 el-button 相邻 margin 规则，手动补齐与左侧按钮相同的 12px 间距 */
.del-wrap { margin-left: 12px; }
.el-form-item__label { white-space: nowrap; }
</style>
