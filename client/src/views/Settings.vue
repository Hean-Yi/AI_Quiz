<template>
  <div class="px-6 pt-6 pb-24 animate-enter">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900">设置</h2>
      <p class="text-sm text-gray-500 mt-1">配置你的 AI 助教</p>
    </div>
    
    <div class="space-y-6">
      
      <!-- AI 模型配置卡片 -->
      <div class="glass-card p-6 space-y-5">
        <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <i class="fa-solid fa-robot text-purple-600"></i>
            </div>
            <h3 class="font-bold text-gray-800">模型参数</h3>
        </div>

        <!-- API Provider -->
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">服务商 (Provider)</label>
          <div class="relative">
              <select v-model="provider" @change="handleProviderChange" class="glass-input w-full p-4 pr-10 appearance-none font-medium">
                  <option value="openai">OpenAI / DeepSeek / Compatible</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="google">Google (Gemini)</option>
              </select>
              <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                  <i class="fa-solid fa-chevron-down text-xs"></i>
              </div>
          </div>
        </div>

        <!-- API Base URL -->
        <div v-if="provider === 'openai'" class="animate-enter">
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">API Base URL</label>
          <input v-model="baseUrl" type="text" placeholder="https://api.openai.com/v1" class="glass-input w-full p-4 font-mono text-sm" />
          <div class="flex gap-2 mt-2 overflow-x-auto no-scrollbar pb-1">
             <button @click="baseUrl = 'https://api.openai.com/v1'" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-gray-600 transition-colors whitespace-nowrap active:scale-95">
                OpenAI
             </button>
             <button @click="baseUrl = 'https://api.deepseek.com'" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-gray-600 transition-colors whitespace-nowrap active:scale-95">
                DeepSeek
             </button>
             <button @click="baseUrl = 'https://api.siliconflow.cn/v1'" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-gray-600 transition-colors whitespace-nowrap active:scale-95">
                硅基流动
             </button>
             <button @click="baseUrl = 'https://open.bigmodel.cn/api/paas/v4'" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-gray-600 transition-colors whitespace-nowrap active:scale-95">
                GLM (智谱)
             </button>
             <button @click="baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/'" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-gray-600 transition-colors whitespace-nowrap active:scale-95">
                Google
             </button>
             <button @click="baseUrl = 'https://api.moonshot.cn/v1'" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-gray-600 transition-colors whitespace-nowrap active:scale-95">
                Moonshot
             </button>
          </div>
        </div>

        <!-- API Key -->
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">API Key</label>
          <div class="relative">
            <input :type="showKey ? 'text' : 'password'" v-model="apiKey" placeholder="sk-..." class="glass-input w-full p-4 pr-10" />
            <button @click="showKey = !showKey" class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <i class="fa-solid" :class="showKey ? 'fa-eye-slash' : 'fa-eye'"></i>
            </button>
          </div>
        </div>

        <!-- Model Name -->
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">模型名称 (Model)</label>
          <input v-model="modelName" type="text" placeholder="gpt-3.5-turbo" class="glass-input w-full p-4 font-mono text-sm" />
        </div>
      </div>

      <!-- Prompt 配置卡片 -->
      <div class="glass-card p-6 space-y-4">
         <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <i class="fa-solid fa-wand-magic-sparkles text-amber-500"></i>
                </div>
                <h3 class="font-bold text-gray-800">系统提示词</h3>
            </div>
            <span v-if="isAnyPromptDirty" class="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full font-bold animate-pulse">未保存</span>
         </div>

         <!-- 题型切换 Tabs -->
         <div class="flex gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-gray-100">
             <button 
                v-for="type in promptTypes" 
                :key="type.value"
                @click="currentPromptType = type.value"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2"
                :class="currentPromptType === type.value ? 'bg-amber-100 text-amber-700 shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'"
             >
                {{ type.label }}
                <span v-if="prompts[type.value].loaded && prompts[type.value].content !== prompts[type.value].original" class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
             </button>
         </div>
         
         <div class="relative group min-h-[300px]">
            <textarea 
              v-if="prompts[currentPromptType].loaded"
              v-model="prompts[currentPromptType].content" 
              rows="12" 
              class="glass-input w-full p-4 text-sm font-mono leading-relaxed resize-none focus:ring-amber-400/30"
              :class="{'ring-2 ring-amber-400/20 bg-amber-50/30': prompts[currentPromptType].content !== prompts[currentPromptType].original}"
            ></textarea>
            
            <!-- 加载失败或未加载时的占位 -->
            <div v-else-if="!isLoadingPrompt" class="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                <div class="text-center">
                    <p class="mb-2 text-sm">暂无内容或加载失败</p>
                    <button @click="loadPrompt(currentPromptType)" class="text-xs text-amber-500 font-bold hover:text-amber-600 flex items-center gap-1 mx-auto">
                        <i class="fa-solid fa-rotate-right"></i> 点击重试
                    </button>
                </div>
            </div>

            <!-- Loading 遮罩 -->
            <div v-if="isLoadingPrompt" class="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-10 border border-gray-100">
               <div class="flex flex-col items-center gap-2">
                   <i class="fa-solid fa-circle-notch fa-spin text-amber-500 text-xl"></i>
                   <span class="text-xs text-gray-400 font-medium">加载提示词...</span>
               </div>
            </div>
         </div>
         <p class="text-[10px] text-gray-400 ml-1">
           可用变量: <code class="bg-gray-100 px-1 py-0.5 rounded text-gray-600 font-mono">${quantity}</code>, <code class="bg-gray-100 px-1 py-0.5 rounded text-gray-600 font-mono">${context}</code>
           <span v-if="currentPromptType === 'default'">, <code class="bg-gray-100 px-1 py-0.5 rounded text-gray-600 font-mono">${type}</code></span>
         </p>
      </div>

      <button @click="saveAll" class="primary-btn w-full py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-900/20" :disabled="isSaving">
          <span v-if="!isSaving">保存设置</span>
          <span v-else class="flex items-center justify-center gap-2">
             <i class="fa-solid fa-circle-notch fa-spin"></i> 保存中...
          </span>
      </button>

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

  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import ConfirmModal from '../components/ConfirmModal.vue';

const router = useRouter();

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
};

// 本地设置
const provider = ref('openai');
const baseUrl = ref('https://api.openai.com/v1');
const apiKey = ref('');
const modelName = ref('gpt-3.5-turbo');
const showKey = ref(false);

// Prompt 管理
const promptTypes = [
    { label: '默认/混合', value: 'default' },
    { label: '单选题', value: 'multiple_choice' },
    { label: '判断题', value: 'true_false' },
    { label: '简答题', value: 'short_answer' }
];
const currentPromptType = ref('default');
const isLoadingPrompt = ref(false);
const isSaving = ref(false);

// 缓存所有类型的 Prompt
const prompts = ref({
    default: { content: '', original: '', loaded: false },
    multiple_choice: { content: '', original: '', loaded: false },
    true_false: { content: '', original: '', loaded: false },
    short_answer: { content: '', original: '', loaded: false }
});

const isAnyPromptDirty = computed(() => {
    return Object.values(prompts.value).some(p => p.loaded && p.content !== p.original);
});

// 初始化
onMounted(async () => {
  // 1. 加载本地配置
  const storedProvider = localStorage.getItem('ai_quiz_provider');
  if (storedProvider) provider.value = storedProvider;

  const storedBaseUrl = localStorage.getItem('ai_quiz_base_url');
  if (storedBaseUrl) baseUrl.value = storedBaseUrl;

  const storedKey = localStorage.getItem('ai_quiz_api_key');
  if (storedKey) apiKey.value = storedKey;

  const storedModel = localStorage.getItem('ai_quiz_model_name');
  if (storedModel) modelName.value = storedModel;

  // 2. 加载默认 Prompt
  await loadPrompt('default');
});

// 监听 Provider 变化，设置默认值
const handleProviderChange = () => {
    if (provider.value === 'openai') {
        if (!baseUrl.value) baseUrl.value = 'https://api.openai.com/v1';
    }
};

// 监听 Tab 切换
watch(currentPromptType, async (newType) => {
    await loadPrompt(newType);
});

const loadPrompt = async (type) => {
  // 如果已经加载过，就不重新加载，保留用户的编辑状态
  if (prompts.value[type].loaded) return;

  isLoadingPrompt.value = true;
  try {
    const res = await axios.get(`/api/system/prompt?type=${type}`);
    if (res.data.success) {
      prompts.value[type].content = res.data.prompt;
      prompts.value[type].original = res.data.prompt;
      prompts.value[type].loaded = true;
    }
  } catch (err) {
    console.error(`Failed to fetch prompt for ${type}`, err);
  } finally {
    isLoadingPrompt.value = false;
  }
};

const saveAll = async () => {
  isSaving.value = true;
  try {
    // 1. 保存配置到本地
    localStorage.setItem('ai_quiz_provider', provider.value);
    localStorage.setItem('ai_quiz_base_url', baseUrl.value);
    localStorage.setItem('ai_quiz_api_key', apiKey.value);
    localStorage.setItem('ai_quiz_model_name', modelName.value);

    // 2. 保存所有修改过的 Prompt
    const savePromises = [];
    for (const type of Object.keys(prompts.value)) {
        const p = prompts.value[type];
        if (p.loaded && p.content !== p.original) {
            savePromises.push(
                axios.post('/api/system/prompt', {
                    prompt: p.content,
                    type: type
                }).then(() => {
                    // 更新原始值
                    p.original = p.content;
                })
            );
        }
    }

    if (savePromises.length > 0) {
        await Promise.all(savePromises);
    }

    // 提示成功
    showAlert('设置已保存', 'success', '保存成功', '返回首页', () => {
        router.push('/');
    });

  } catch (err) {
    showAlert('保存失败: ' + err.message, 'error', '保存失败');
  } finally {
    isSaving.value = false;
  }
};
</script>
