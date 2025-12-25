<template>
  <div class="min-h-screen bg-white flex flex-col">
    <!-- 顶部进度条 -->
    <div class="w-full h-1 bg-gray-100">
      <div class="h-full bg-klein-blue transition-all duration-500 ease-out" :style="{ width: progressWidth }"></div>
    </div>

    <div class="flex-1 flex flex-col px-8 pt-12 pb-8 animate-enter">
      
      <!-- Step 1: 欢迎 & 角色设定 -->
      <div v-if="step === 1" class="flex-1 flex flex-col">
        <div class="mb-8">
          <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-klein-blue text-3xl shadow-lg shadow-blue-100">
            <i class="fa-solid fa-hand-sparkles"></i>
          </div>
          <h1 class="text-3xl font-black text-gray-900 mb-3 tracking-tight">欢迎使用 AI 测验</h1>
          <p class="text-gray-500 leading-relaxed">让我们先花一点时间了解你的学习偏好，以便 AI 助教为你提供更精准的服务。</p>
        </div>

        <div class="space-y-6 flex-1">
            <!-- 昵称 -->
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">昵称</label>
                <input v-model="form.nickname" type="text" placeholder="例如：小明、Alex" class="glass-input w-full p-4 text-sm border-gray-200 focus:border-klein-blue" />
            </div>

            <!-- 学习领域 -->
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">学习领域</label>
                <input v-model="form.domain" type="text" placeholder="例如：计算机科学、法律、医学" class="glass-input w-full p-4 text-sm border-gray-200 focus:border-klein-blue" />
            </div>

            <!-- 用户身份 -->
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">当前身份</label>
                <div class="grid grid-cols-2 gap-3">
                    <button 
                        v-for="role in roles" 
                        :key="role.value"
                        @click="form.role = role.value"
                        class="p-3 rounded-xl text-xs font-bold border transition-all text-left flex flex-col gap-1"
                        :class="form.role === role.value ? 'border-klein-blue bg-blue-50 text-klein-blue ring-1 ring-klein-blue' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
                    >
                        <span class="text-lg"><i :class="role.icon"></i></span>
                        <span>{{ role.label }}</span>
                    </button>
                </div>
            </div>

            <!-- 难度偏好 -->
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">默认难度</label>
                <div class="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                        v-for="diff in difficultyOptions" 
                        :key="diff.value"
                        @click="form.difficulty = diff.value"
                        class="flex-1 py-3 rounded-lg text-xs font-bold transition-all"
                        :class="form.difficulty === diff.value ? 'bg-white text-klein-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'"
                    >
                        {{ diff.label }}
                    </button>
                </div>
            </div>
        </div>

        <button @click="nextStep" class="primary-btn w-full py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-900/20 mt-8 flex items-center justify-center gap-2 group">
            下一步
            <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
        </button>
      </div>

      <!-- Step 2: API 配置 -->
      <div v-if="step === 2" class="flex-1 flex flex-col animate-enter">
        <div class="mb-8">
          <button @click="step = 1" class="text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1 text-sm font-bold">
            <i class="fa-solid fa-arrow-left"></i> 返回
          </button>
          <h1 class="text-2xl font-black text-gray-900 mb-2 tracking-tight">配置 AI 模型</h1>
          <p class="text-gray-500 text-sm">你需要提供 API 密钥才能使用生成服务。这些信息仅保存在你的本地浏览器中。</p>
        </div>

        <div class="space-y-5 flex-1">
            <!-- Provider -->
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">服务商</label>
                <select v-model="form.provider" @change="handleProviderChange" class="glass-input w-full p-4 appearance-none font-medium bg-white">
                    <option value="openai">OpenAI / DeepSeek / 兼容接口</option>
                    <option value="anthropic" disabled>Anthropic（即将支持）</option>
                    <option value="google" disabled>Google（即将支持）</option>
                </select>
            </div>

            <!-- Base URL -->
            <div v-if="form.provider === 'openai'">
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">API 基础地址</label>
                <input v-model="form.baseUrl" type="text" class="glass-input w-full p-4 font-mono text-sm" />
                <div class="flex gap-2 mt-2 overflow-x-auto no-scrollbar pb-1">
                    <button @click="form.baseUrl = 'https://api.openai.com/v1'" class="text-[10px] bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600 font-bold border border-gray-200 transition-colors whitespace-nowrap">
                        OpenAI
                    </button>
                    <button @click="form.baseUrl = 'https://api.deepseek.com'" class="text-[10px] bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600 font-bold border border-gray-200 transition-colors whitespace-nowrap">
                        DeepSeek
                    </button>
                    <button @click="form.baseUrl = 'https://api.siliconflow.cn/v1'" class="text-[10px] bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600 font-bold border border-gray-200 transition-colors whitespace-nowrap">
                        硅基流动
                    </button>
                    <button @click="form.baseUrl = 'https://open.bigmodel.cn/api/paas/v4'" class="text-[10px] bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600 font-bold border border-gray-200 transition-colors whitespace-nowrap">
                        GLM
                    </button>
                    <button @click="form.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/'" class="text-[10px] bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600 font-bold border border-gray-200 transition-colors whitespace-nowrap">
                        Google
                    </button>
                    <button @click="form.baseUrl = 'https://api.moonshot.cn/v1'" class="text-[10px] bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600 font-bold border border-gray-200 transition-colors whitespace-nowrap">
                        Moonshot
                    </button>
                </div>
            </div>

            <!-- API 密钥 -->
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">API 密钥 <span class="text-red-500">*</span></label>
                <input v-model="form.apiKey" type="password" placeholder="sk-..." class="glass-input w-full p-4 font-mono text-sm" />
            </div>

            <!-- Model -->
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">模型名称</label>
                <input v-model="form.modelName" type="text" placeholder="gpt-3.5-turbo" class="glass-input w-full p-4 font-mono text-sm" />
            </div>
        </div>

        <button @click="finish" :disabled="!form.apiKey" class="primary-btn w-full py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-900/20 mt-8 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            完成设置
            <i class="fa-solid fa-check"></i>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLayoutPath } from '../utils/layout';

const router = useRouter();
const { withLayout } = useLayoutPath();
const step = ref(1);

const form = ref({
    nickname: '',
    domain: '',
    role: 'Student',
    difficulty: 'Medium',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    modelName: 'gpt-3.5-turbo'
});

const roles = [
    { label: '新手小白', value: 'Beginner', icon: 'fa-solid fa-seedling' },
    { label: '大学生', value: 'Student', icon: 'fa-solid fa-graduation-cap' },
    { label: '职场人士', value: 'Professional', icon: 'fa-solid fa-briefcase' },
    { label: '面试备考', value: 'Interviewee', icon: 'fa-solid fa-user-tie' }
];

const difficultyOptions = [
    { label: '简单', value: 'Easy' },
    { label: '适中', value: 'Medium' },
    { label: '困难', value: 'Hard' }
];

const progressWidth = computed(() => {
    return step.value === 1 ? '50%' : '100%';
});

const handleProviderChange = () => {
    if (form.value.provider === 'openai') {
        if (!form.value.baseUrl) form.value.baseUrl = 'https://api.openai.com/v1';
    }
};

const nextStep = () => {
    step.value = 2;
};

const finish = () => {
    if (!form.value.apiKey) return;

    // 保存 Persona
    localStorage.setItem('ai_quiz_nickname', form.value.nickname || 'Student');
    localStorage.setItem('ai_quiz_domain', form.value.domain);
    localStorage.setItem('ai_quiz_role', form.value.role);
    localStorage.setItem('ai_quiz_difficulty', form.value.difficulty);

    // 保存 API 设置
    localStorage.setItem('ai_quiz_provider', form.value.provider);
    localStorage.setItem('ai_quiz_base_url', form.value.baseUrl);
    localStorage.setItem('ai_quiz_api_key', form.value.apiKey);
    localStorage.setItem('ai_quiz_model_name', form.value.modelName);

    // 标记已完成引导
    localStorage.setItem('ai_quiz_onboarded', 'true');

    // 跳转首页
    router.push(withLayout('/'));
};
</script>

<style scoped>
.glass-input {
    @apply bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-klein-blue focus:ring-4 focus:ring-blue-500/10 transition-all duration-300;
}
</style>
