<template>
  <div class="flex flex-col pt-6 px-6">
    <!-- 欢迎头 -->
    <div class="mb-8 animate-enter">
      <h2 class="text-3xl font-bold text-gray-900 tracking-tight">Hello, {{ userNickname || userRole }} 👋</h2>
      <p class="text-gray-500 mt-2 text-sm font-medium">准备好开始今天的学习了吗？</p>
    </div>

    <!-- 上传区域 -->
    <div v-if="parsedFiles.length === 0" class="glass-card w-full p-8 text-center border-2 border-dashed border-gray-200 hover:border-klein-blue/50 transition-all duration-300 group mb-8 relative overflow-hidden cursor-pointer animate-enter delay-100"
         :class="{'border-klein-blue bg-blue-50/30': uploadStatus === 'uploading' || uploadStatus === 'processing'}">
      
      <!-- 正常状态 -->
      <div v-if="uploadStatus === 'idle'" class="relative z-10" @click="triggerUpload">
        <input type="file" ref="fileInput" class="hidden" accept=".pdf" multiple @change="handleFileUpload" />
        <div class="w-20 h-20 bg-gradient-to-br from-blue-50 to-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
          <i class="fa-solid fa-cloud-arrow-up text-3xl text-klein-blue"></i>
        </div>
        <h3 class="text-lg font-bold text-gray-800 mb-2">上传 PDF 课件</h3>
        <p class="text-xs text-gray-400">支持多文件上传与智能出题</p>
      </div>

      <!-- 上传中 / 处理中 状态 -->
      <div v-else class="relative z-10 flex flex-col items-center justify-center py-6">
        <div class="w-full max-w-[200px] mb-6">
           <div class="flex justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
             <span>{{ statusText }}</span>
             <span>{{ progress }}%</span>
           </div>
           <!-- 进度条槽 -->
           <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
             <div 
               class="bg-gradient-to-r from-klein-blue to-blue-400 h-full rounded-full transition-all duration-300 ease-out"
               :class="{'progress-stripe': uploadStatus === 'processing'}"
               :style="{ width: progress + '%' }"
             ></div>
           </div>
        </div>
        
        <p class="text-sm font-medium text-gray-500 animate-pulse flex items-center gap-2">
           <i class="fa-solid fa-circle-notch fa-spin text-klein-blue"></i>
           {{ uploadStatus === 'uploading' ? '正在上传文件...' : 'AI 正在解析文档...' }}
        </p>
      </div>
    </div>

    <!-- 解析成功后的配置区域 -->
    <div v-if="parsedFiles.length > 0" class="glass-card p-6 animate-enter space-y-6 border-l-4 border-l-green-500">
      <!-- 文件列表 -->
      <div class="space-y-3 pb-4 border-b border-gray-100">
         <div class="flex justify-between items-center mb-2">
             <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">已上传文件</h3>
             <button @click="triggerUpload" class="text-xs font-bold text-klein-blue hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                 <i class="fa-solid fa-plus"></i> 继续上传
             </button>
             <!-- 隐藏的 input 用于继续上传 -->
             <input type="file" ref="fileInput" class="hidden" accept=".pdf" multiple @change="handleFileUpload" />
         </div>

         <div v-for="(file, idx) in parsedFiles" :key="idx" class="flex items-center gap-4 relative group">
             <div class="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <i class="fa-solid fa-file-pdf text-lg"></i>
             </div>
             <div class="overflow-hidden flex-1">
                <h4 class="font-bold text-gray-800 text-xs truncate">{{ file.originalName }}</h4>
                <p class="text-[10px] text-gray-400 mt-0.5 font-medium">解析完成 • {{ file.totalPages }} 页</p>
             </div>
             <button v-if="file.previewUrl" @click="previewFile(file)" class="w-6 h-6 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center transition-colors mr-1" title="预览文件">
                 <i class="fa-solid fa-eye text-xs"></i>
             </button>
             <button @click="removeFile(idx)" class="w-6 h-6 rounded-full bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors">
                 <i class="fa-solid fa-xmark text-xs"></i>
             </button>
         </div>
         
         <!-- 上传进度条 (继续上传时显示) -->
         <div v-if="uploadStatus === 'uploading' || uploadStatus === 'processing'" class="mt-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
             <div class="flex justify-between text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                 <span>{{ statusText }}</span>
                 <span>{{ progress }}%</span>
             </div>
             <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                 <div class="bg-klein-blue h-full rounded-full transition-all duration-300" :style="{ width: progress + '%' }"></div>
             </div>
         </div>

         <button @click="resetUpload" class="w-full py-2 text-xs text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1 mt-2">
            <i class="fa-solid fa-trash-can"></i> 清空所有文件
         </button>
      </div>

      <!-- 题型选择 (多选) -->
      <div>
        <label class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block ml-1">选择题型 (可多选)</label>
        <div class="grid grid-cols-3 gap-3">
            <button 
                v-for="type in questionTypes" 
                :key="type.value"
                @click="toggleType(type.value)"
                class="py-3 px-2 rounded-2xl text-xs font-bold border transition-all duration-200 flex flex-col items-center gap-2 relative overflow-hidden"
                :class="selectedTypes.includes(type.value) ? 'bg-klein-blue text-white border-klein-blue shadow-lg shadow-blue-900/20 transform scale-105' : 'bg-white text-gray-500 border-transparent hover:bg-gray-50 hover:border-gray-200'"
            >
                <i :class="type.icon" class="text-lg"></i>
                {{ type.label }}
                <div v-if="selectedTypes.includes(type.value)" class="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"></div>
            </button>
        </div>
        
        <!-- 题型比例设置 -->
        <div v-if="selectedTypes.length > 1" class="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 animate-enter">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">题型分布设置 (总数: {{ questionQuantity }})</label>
            <div class="space-y-2">
                <div v-for="type in selectedTypes" :key="type" class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-600 w-16">{{ getTypeName(type) }}</span>
                    <input 
                        type="number" 
                        v-model.number="typeCounts[type]" 
                        min="0" 
                        :max="questionQuantity"
                        class="flex-1 p-1.5 text-xs border border-gray-200 rounded-lg focus:border-klein-blue focus:ring-0 text-center"
                    />
                    <span class="text-xs text-gray-400">题</span>
                </div>
                <div class="text-[10px] text-right font-bold" :class="totalCount === questionQuantity ? 'text-green-500' : 'text-amber-500'">
                    当前总计: {{ totalCount }} / {{ questionQuantity }}
                </div>
            </div>
        </div>
      </div>

      <!-- 题目数量 -->
      <div>
        <label class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block ml-1">题目数量</label>
        <div class="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100">
            <input 
                v-model.number="questionQuantity" 
                type="range" 
                min="1" 
                max="20" 
                class="flex-1 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-klein-blue"
            />
            <div class="w-12 h-10 bg-blue-50 text-klein-blue font-bold rounded-xl flex items-center justify-center text-sm shrink-0">
                {{ questionQuantity }}
            </div>
        </div>
      </div>

      <!-- 自定义要求 -->
      <div>
        <div class="flex items-center gap-2 mb-3 ml-1 cursor-pointer" @click="enableCustomReq = !enableCustomReq">
            <div class="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                 :class="enableCustomReq ? 'bg-klein-blue border-klein-blue' : 'border-gray-300 bg-white'">
                 <i v-if="enableCustomReq" class="fa-solid fa-check text-white text-[10px]"></i>
            </div>
            <label class="text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none">添加自定义出题要求</label>
        </div>
        
        <div v-if="enableCustomReq" class="animate-enter">
            <textarea 
                v-model="customRequirements" 
                rows="3" 
                placeholder="例如：请重点考察第三章的概念，题目难度偏难..."
                class="glass-input w-full p-3 text-xs resize-none"
            ></textarea>
        </div>
      </div>

      <!-- 生成按钮 -->
      <button 
        @click="generateQuiz" 
        :disabled="isGenerating || selectedTypes.length === 0"
        class="primary-btn w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 mt-2"
      >
        <i v-if="isGenerating" class="fa-solid fa-circle-notch fa-spin"></i>
        <i v-else class="fa-solid fa-wand-magic-sparkles"></i>
        {{ isGenerating ? 'AI 正在出题中...' : '开始生成题目' }}
      </button>
    </div>

    <!-- 错误详情弹窗 -->
    <div v-if="showErrorModal" class="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-enter">
        <div class="bg-white rounded-[24px] p-6 w-full max-w-md shadow-2xl transform transition-all scale-100 flex flex-col max-h-[80vh]">
            <div class="flex items-center gap-3 mb-4 text-red-500">
                <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-800">生成失败</h3>
            </div>
            
            <div class="flex-1 overflow-y-auto bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                <p class="text-sm text-gray-600 font-medium mb-2">错误信息：</p>
                <code class="text-xs font-mono text-red-600 break-words block whitespace-pre-wrap">{{ errorMessage }}</code>
                
                <div v-if="errorDetail" class="mt-4 pt-4 border-t border-gray-200">
                    <p class="text-xs text-gray-400 mb-1">详细堆栈/响应：</p>
                    <pre class="text-[10px] text-gray-500 overflow-x-auto">{{ errorDetail }}</pre>
                </div>
            </div>

            <div class="flex gap-3">
                <button @click="copyError" class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors">
                    复制错误信息
                </button>
                <button @click="showErrorModal = false" class="flex-1 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-sm transition-colors">
                    关闭
                </button>
            </div>
        </div>
    </div>

    <!-- 通用 Alert 弹窗 -->
    <ConfirmModal
        v-model:visible="alertState.visible"
        :title="alertState.title"
        :message="alertState.message"
        :type="alertState.type"
        :confirmText="alertState.confirmText"
        :showCancel="false"
        @confirm="handleAlertConfirm"
    />

    <PdfPreviewModal
        v-model:visible="showPdfPreview"
        :file-url="pdfPreviewUrl"
        :file-data="pdfPreviewData"
        :page="pdfPreviewPage"
        :title="pdfPreviewTitle"
        @update:visible="val => { showPdfPreview.value = val; if (!val) { pdfPreviewUrl.value = ''; pdfPreviewPage.value = 1; pdfPreviewData.value = null } }"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useQuizStore } from '../stores/quizStore';
import ConfirmModal from '../components/ConfirmModal.vue';
import PdfPreviewModal from '../components/PdfPreviewModal.vue';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const PdfViewer = registerPlugin('PdfViewer');

const router = useRouter();
const quizStore = useQuizStore();
const fileInput = ref(null);

// 统一 Alert 状态管理
const alertState = ref({
    visible: false,
    title: '提示',
    message: '',
    type: 'info',
    confirmText: '确定',
    onConfirm: null
});

const showAlert = (message, type = 'info', title = '提示', confirmText = '确定', onConfirm = null) => {
    alertState.value = {
        visible: true,
        title,
        message,
        type,
        confirmText,
        onConfirm
    };
};

const handleAlertConfirm = () => {
    if (alertState.value.onConfirm) {
        alertState.value.onConfirm();
    }
    // 这里的 visible = false 会由组件的 update:visible 事件处理，或者手动处理
    // ConfirmModal 组件内部点击确认会触发 confirm 事件并 emit update:visible false
    // 但我们需要确保 onConfirm 执行后再关闭，或者同时。
    // 组件实现是: emit('confirm'); emit('update:visible', false);
    // 所以这里只需要处理业务逻辑
};

// 用户信息
const userNickname = ref('');
const userRole = ref('Student');

onMounted(() => {
    userNickname.value = localStorage.getItem('ai_quiz_nickname') || '';
    userRole.value = localStorage.getItem('ai_quiz_role') || 'Student';

    // 恢复已上传的文件 (如果存在)
    if (quizStore.currentPdfList && quizStore.currentPdfList.length > 0) {
        parsedFiles.value = [...quizStore.currentPdfList];
        // 如果有文件，不需要显示上传成功动画，直接显示列表
        uploadStatus.value = 'idle';
    }
});

// 监听外部传入的文件 (Intent)
watch(() => quizStore.pendingFile, async (newFile) => {
    if (newFile) {
        console.log('Auto-uploading pending file:', newFile.name);
        // 模拟 input change 事件结构
        await handleFileUpload({ target: { files: [newFile] } });
        quizStore.pendingFile = null;
    }
}, { immediate: true });

// 状态: idle, uploading, processing, done
const uploadStatus = ref('idle');
const progress = ref(0);
const parsedFiles = ref([]); // 改为数组
const isGenerating = ref(false);
const selectedTypes = ref(['multiple_choice']); // 改为数组，默认选中单选
const questionQuantity = ref(10); // 默认 10 道题
const enableCustomReq = ref(false);
const customRequirements = ref('');
const typeCounts = ref({ multiple_choice: 10 }); // 题型数量分布

// 错误弹窗状态
const showErrorModal = ref(false);
const errorMessage = ref('');
const errorDetail = ref('');

// PDF 预览
const showPdfPreview = ref(false);
const pdfPreviewUrl = ref('');
const pdfPreviewPage = ref(1);
const pdfPreviewTitle = ref('PDF 预览');
const pdfPreviewData = ref(null);

const questionTypes = [
    { label: '单选题', value: 'multiple_choice', icon: 'fa-solid fa-list-ul' },
    { label: '判断题', value: 'true_false', icon: 'fa-solid fa-check-double' },
    { label: '简答题', value: 'short_answer', icon: 'fa-solid fa-align-left' }
];

const statusText = computed(() => {
  if (uploadStatus.value === 'uploading') return 'UPLOADING';
  if (uploadStatus.value === 'processing') return 'PROCESSING';
  return 'READY';
});

const totalCount = computed(() => {
    return Object.values(typeCounts.value).reduce((a, b) => a + b, 0);
});

const getTypeName = (type) => {
    const t = questionTypes.find(qt => qt.value === type);
    return t ? t.label : type;
};

// 默认题型数量配置
const defaultTypeCounts = {
    multiple_choice: 10,
    true_false: 5,
    short_answer: 3
};

const base64ToUint8 = (base64) => {
    const cleaned = base64.replace(/^data:.*,/, '');
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const normalizePath = (path) => path?.startsWith('file://') ? path.replace('file://', '') : path;

const deleteLocalFile = async (path) => {
    if (!path) return;
    try {
        await Filesystem.deleteFile({ path: normalizePath(path) });
    } catch (e) {
        console.warn('删除本地缓存失败', e);
    }
};

// 监听题型变化，处理新增/删除
watch(selectedTypes, (newTypes, oldTypes) => {
    // 确保 oldTypes 存在 (第一次可能为 undefined)
    const prev = oldTypes || [];
    
    // 找出新增的
    const added = newTypes.filter(t => !prev.includes(t));
    // 找出删除的
    const removed = prev.filter(t => !newTypes.includes(t));

    // 处理新增：赋予默认值
    added.forEach(t => {
        // 只有当该类型没有被设置过时才赋予默认值
        if (typeCounts.value[t] === undefined) {
            typeCounts.value[t] = defaultTypeCounts[t] || 5;
        }
    });

    // 处理删除
    removed.forEach(t => {
        delete typeCounts.value[t];
    });
    
    // 触发总数更新 (由 typeCounts watcher 处理)
});

// 监听各题型数量变化 -> 更新总数
watch(typeCounts, (newCounts) => {
    const sum = Object.values(newCounts).reduce((a, b) => a + b, 0);
    if (sum !== questionQuantity.value) {
        questionQuantity.value = sum;
    }
}, { deep: true });

// 监听总数滑块变化 -> 调整第一个题型的数量以匹配
watch(questionQuantity, (newTotal) => {
    const currentSum = Object.values(typeCounts.value).reduce((a, b) => a + b, 0);
    if (newTotal !== currentSum) {
        const diff = newTotal - currentSum;
        // 找到第一个选中的题型进行调整
        if (selectedTypes.value.length > 0) {
            const firstType = selectedTypes.value[0];
            const newVal = (typeCounts.value[firstType] || 0) + diff;
            // 确保不小于 0
            typeCounts.value[firstType] = Math.max(0, newVal);
        }
    }
});

const triggerUpload = () => {
    fileInput.value.click();
};

const resetUpload = () => {
    uploadStatus.value = 'idle';
    // 释放 URL
    parsedFiles.value.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        if (f.localPath) deleteLocalFile(f.localPath);
    });
    parsedFiles.value = [];
    progress.value = 0;
};

const removeFile = (index) => {
    const file = parsedFiles.value[index];
    if (file && file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
    }
    if (file && file.localPath) {
        deleteLocalFile(file.localPath);
    }
    parsedFiles.value.splice(index, 1);
    if (parsedFiles.value.length === 0) {
        resetUpload();
    }
};

const resolvePdfData = async (file) => {
    if (!file) return null;
    if (file.localPath) {
        const res = await Filesystem.readFile({ path: normalizePath(file.localPath) });
        return base64ToUint8(res.data);
    }
    if (file.previewUrl) {
        const resp = await fetch(file.previewUrl);
        const buf = await resp.arrayBuffer();
        return new Uint8Array(buf);
    }
    if (file.pdfId) {
        const resp = await fetch(`/uploads/${file.pdfId}`);
        const buf = await resp.arrayBuffer();
        return new Uint8Array(buf);
    }
    return null;
};

const previewFile = async (file) => {
    // Native Preview
    if (Capacitor.isNativePlatform()) {
        if (file.localPath) {
            try {
                await PdfViewer.openPdf({ filePath: file.localPath });
            } catch (e) {
                console.error('Native preview failed', e);
                showAlert('无法预览文件: ' + e.message, 'error');
            }
            return;
        } else {
             showAlert('本地文件不存在，无法预览', 'warning');
             return;
        }
    }

    const data = await resolvePdfData(file);
    if (!data) return;
    pdfPreviewTitle.value = file.originalName || 'PDF 预览';
    pdfPreviewData.value = data;
    pdfPreviewUrl.value = '';
    pdfPreviewPage.value = 1;
    showPdfPreview.value = true;
};

const toggleType = (typeValue) => {
    if (selectedTypes.value.includes(typeValue)) {
        // 至少保留一个
        if (selectedTypes.value.length > 1) {
            selectedTypes.value = selectedTypes.value.filter(t => t !== typeValue);
        }
    } else {
        selectedTypes.value = [...selectedTypes.value, typeValue];
    }
};

const handleFileUpload = async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // Create local previews
  const localPreviews = {};
  for (let i = 0; i < files.length; i++) {
      localPreviews[files[i].name] = URL.createObjectURL(files[i]);
  }

  // 重置状态
  uploadStatus.value = 'uploading';
  progress.value = 0;
  // parsedFiles.value = []; // 不再清空

  const formData = new FormData();
  // 支持多文件
  const localPreviewsMap = {}; // 临时存储本地路径

  for (let i = 0; i < files.length; i++) {
      const file = files[i];
      formData.append('pdfFiles', file);

      // 尝试保存到本地文件系统 (Capacitor)
      try {
          // 读取文件内容为 Base64
          const reader = new FileReader();
          reader.onload = async (e) => {
              const base64Data = e.target.result.split(',')[1];
              const fileName = `cached_${Date.now()}_${file.name}`;
              
              try {
                  const result = await Filesystem.writeFile({
                      path: fileName,
                      data: base64Data,
                      directory: Directory.Data
                  });
                  // 记录本地路径
                  localPreviewsMap[file.name] = result.uri;
                  console.log('Saved local cache:', result.uri);
              } catch (err) {
                  console.warn('Failed to save local cache:', err);
              }
          };
          reader.readAsDataURL(file);
      } catch (e) {
          console.warn('FileReader error:', e);
      }
  }

  try {
    // 调用后端 API
    const response = await axios.post('/api/pdf/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      // 核心：监听上传进度
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        progress.value = percentCompleted;
        
        // 上传完了，但还需要服务器处理（解析PDF）
        if (percentCompleted === 100) {
           uploadStatus.value = 'processing';
        }
      }
    });

    // 请求成功
    if (response.data.success) {
      // 追加新文件
      // 等待一下确保 FileReader 完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newFiles = response.data.data.map(f => ({
          ...f,
          localPath: localPreviewsMap[f.originalName] || ''
      }));
      // 简单的去重 (根据 originalName)
      const existingNames = new Set(parsedFiles.value.map(f => f.originalName));
      const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.originalName));
      
      parsedFiles.value = [...parsedFiles.value, ...uniqueNewFiles];
      
      // 恢复 idle 状态以便继续操作，或者保持 done
      // 这里我们恢复 idle，因为界面上已经有文件列表了，不需要显示大大的 "DONE"
      uploadStatus.value = 'idle'; 
    }

  } catch (error) {
    console.error('Upload failed:', error);
    const currentBaseUrl = axios.defaults.baseURL || window.location.origin;
    const errorMsg = error.message || 'Unknown error';
    const status = error.response ? error.response.status : 'N/A';
    showAlert(`上传失败: ${errorMsg}\nStatus: ${status}\nTarget: ${currentBaseUrl}`, 'error', '上传失败');
    uploadStatus.value = 'idle';
  } finally {
      // 清空 input，允许重复上传同名文件(如果删除了)
      if (fileInput.value) fileInput.value.value = '';
  }
};

const generateQuiz = async () => {
    if (parsedFiles.value.length === 0) return;
    
    // 校验数量
    if (totalCount.value !== questionQuantity.value) {
        showAlert(`题型分布总数 (${totalCount.value}) 必须等于题目总数 (${questionQuantity.value})`, 'warning', '配置错误');
        return;
    }

    // 从 localStorage 获取配置
    const apiKey = localStorage.getItem('ai_quiz_api_key');
    const provider = localStorage.getItem('ai_quiz_provider') || 'openai';
    const baseUrl = localStorage.getItem('ai_quiz_base_url');
    const modelName = localStorage.getItem('ai_quiz_model_name');

    // 获取用户 Persona 配置
    const domain = localStorage.getItem('ai_quiz_domain') || '';
    const role = localStorage.getItem('ai_quiz_role') || 'Student';
    const difficulty = localStorage.getItem('ai_quiz_difficulty') || 'Medium';

    if (!apiKey) {
        showAlert('请先在设置页配置 API Key', 'warning', '未配置 API Key', '去设置', () => {
            router.push('/settings');
        });
        return;
    }

    // 合并到自定义要求
    const finalCustomReq = (enableCustomReq.value ? customRequirements.value : '');

    isGenerating.value = true;
    try {
        const res = await axios.post('/api/quiz/generate', {
            pdfIds: parsedFiles.value.map(f => f.pdfId), // 传 ID 数组
            types: selectedTypes.value, // 传类型数组
            typeCounts: typeCounts.value, // 传具体数量分布
            quantity: questionQuantity.value,
            customRequirements: finalCustomReq,
            apiKey: apiKey,
            provider: provider,
            baseURL: baseUrl,
            model: modelName,
            // 传递 Persona 信息
            domain,
            role,
            difficulty
        }, {
            timeout: 300000 // 前端设置 5 分钟超时
        });

        if (res.data.success) {
            // 存入 Store
            quizStore.setQuestions(res.data.data, parsedFiles.value[0], parsedFiles.value);
            // 跳转
            router.push('/quiz');
        }
    } catch (error) {
        console.error('Generate failed:', error);
        // 显示错误弹窗
        errorMessage.value = error.response?.data?.error || error.message || '未知错误';
        errorDetail.value = JSON.stringify(error.response?.data || error, null, 2);
        showErrorModal.value = true;
    } finally {
        isGenerating.value = false;
    }
};

const copyError = () => {
    navigator.clipboard.writeText(`${errorMessage.value}\n\n${errorDetail.value}`);
    showAlert('错误信息已复制', 'success');
};
</script>
