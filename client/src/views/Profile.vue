<template>
  <div class="flex flex-col pt-6 px-6">
    <!-- 标题 -->
    <div class="mb-8 animate-enter">
      <h2 class="text-2xl font-bold text-gray-900">个人中心</h2>
      <p class="text-sm text-gray-500 mt-1">学习数据统计</p>
    </div>

    <!-- 用户卡片 -->
    <div class="glass-card p-6 flex items-center gap-4 mb-6 animate-enter delay-100 relative group cursor-pointer hover:bg-blue-50/30 transition-colors" @click="showEditModal = true">
        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-klein-blue to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white text-2xl">
            <i class="fa-solid fa-user-graduate"></i>
        </div>
        <div>
            <h3 class="text-lg font-bold text-gray-800">{{ userNickname || userRoleLabel }}</h3>
            <p class="text-xs text-gray-400">{{ userDomain || '通用领域' }} • {{ userDifficultyLabel }}</p>
        </div>
        <div class="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-klein-blue transition-colors">
            <i class="fa-solid fa-pen-to-square"></i>
        </div>
    </div>

    <!-- 编辑个人信息弹窗 -->
    <teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-enter">
        <div class="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100" @click.stop>
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-bold text-gray-800">编辑个人信息</h3>
                <button @click="showEditModal = false" class="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="space-y-4">
                <!-- 昵称 -->
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">昵称</label>
                    <input v-model="editForm.nickname" type="text" placeholder="例如：小明" class="glass-input w-full p-3 text-sm" />
                </div>

                <!-- 学习领域 -->
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">学习领域</label>
                    <input v-model="editForm.domain" type="text" placeholder="例如：计算机科学、法律、医学" class="glass-input w-full p-3 text-sm" />
                </div>

                <!-- 用户身份 -->
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">用户身份</label>
                    <div class="relative">
                        <select v-model="editForm.role" class="glass-input w-full p-3 pr-10 appearance-none text-sm font-medium">
                            <option value="Beginner">新手小白</option>
                            <option value="Student">大学生</option>
                            <option value="Professional">职场人士</option>
                            <option value="Interviewee">面试备考</option>
                        </select>
                        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                            <i class="fa-solid fa-chevron-down text-xs"></i>
                        </div>
                    </div>
                </div>

                <!-- 题目难度 -->
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">题目难度</label>
                    <div class="flex bg-gray-100 p-1 rounded-xl">
                        <button 
                            v-for="diff in difficultyOptions" 
                            :key="diff.value"
                            @click="editForm.difficulty = diff.value"
                            class="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                            :class="editForm.difficulty === diff.value ? 'bg-white text-klein-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'"
                        >
                            {{ diff.label }}
                        </button>
                    </div>
                </div>
            </div>

            <button @click="saveProfile" class="primary-btn w-full py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 mt-6">
                保存修改
            </button>
        </div>
      </div>
    </teleport>

    <!-- 统计数据 -->
    <div class="grid grid-cols-2 gap-4 mb-6 animate-enter delay-200">
        <div class="glass-card p-4 flex flex-col items-center justify-center text-center">
            <span class="text-3xl font-black text-gray-800 mb-1">{{ quizStore.history.length }}</span>
            <span class="text-xs text-gray-400 font-medium uppercase tracking-wider">总测验次数</span>
        </div>
        <div class="glass-card p-4 flex flex-col items-center justify-center text-center">
            <span class="text-3xl font-black text-klein-blue mb-1">{{ averageScore }}</span>
            <span class="text-xs text-gray-400 font-medium uppercase tracking-wider">平均分</span>
        </div>
        <div class="glass-card p-4 flex flex-col items-center justify-center text-center col-span-2">
            <span class="text-3xl font-black text-red-500 mb-1">{{ quizStore.mistakes.length }}</span>
            <span class="text-xs text-gray-400 font-medium uppercase tracking-wider">当前错题数</span>
        </div>
    </div>

    <!-- 功能列表 -->
    <div class="glass-card overflow-hidden animate-enter delay-300">
        <button @click="clearData" class="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                    <i class="fa-solid fa-trash-can"></i>
                </div>
                <span class="text-sm font-bold text-gray-700">清除所有数据</span>
            </div>
            <i class="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </button>
        
        <button class="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-klein-blue">
                    <i class="fa-solid fa-circle-info"></i>
                </div>
                <span class="text-sm font-bold text-gray-700">关于应用</span>
            </div>
            <span class="text-xs text-gray-400">v1.0.0</span>
        </button>
    </div>

    <!-- 清除数据确认弹窗 -->
    <ConfirmModal
        v-model:visible="showClearConfirm"
        title="清除数据"
        message="确定要清除所有历史记录和错题吗？此操作不可恢复。"
        type="error"
        confirmText="确认清除"
        @confirm="confirmClearData"
    />

    <!-- 成功提示弹窗 -->
    <ConfirmModal
        v-model:visible="showSuccessAlert"
        title="操作成功"
        message="所有数据已清除。"
        type="success"
        :showCancel="false"
        confirmText="知道了"
    />

  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useQuizStore } from '../stores/quizStore';
import ConfirmModal from '../components/ConfirmModal.vue';

const quizStore = useQuizStore();
const showEditModal = ref(false);
const showClearConfirm = ref(false);
const showSuccessAlert = ref(false);

// 用户信息表单
const editForm = ref({
    nickname: '',
    domain: '',
    role: 'Student',
    difficulty: 'Medium'
});

// 显示用的用户信息
const userNickname = ref('');
const userDomain = ref('');
const userRole = ref('Student');
const userDifficulty = ref('Medium');

const roleLabels = {
    'Beginner': '新手小白',
    'Student': '大学生',
    'Professional': '职场人士',
    'Interviewee': '面试备考'
};

const userRoleLabel = computed(() => roleLabels[userRole.value] || userRole.value);
const difficultyLabels = {
    Easy: '简单',
    Medium: '适中',
    Hard: '困难'
};
const userDifficultyLabel = computed(() => difficultyLabels[userDifficulty.value] || userDifficulty.value);

const difficultyOptions = [
    { label: '简单', value: 'Easy' },
    { label: '适中', value: 'Medium' },
    { label: '困难', value: 'Hard' }
];

onMounted(() => {
    // 读取本地存储
    const storedNickname = localStorage.getItem('ai_quiz_nickname');
    const storedDomain = localStorage.getItem('ai_quiz_domain');
    const storedRole = localStorage.getItem('ai_quiz_role');
    const storedDiff = localStorage.getItem('ai_quiz_difficulty');

    if (storedNickname) userNickname.value = storedNickname;
    if (storedDomain) userDomain.value = storedDomain;
    if (storedRole) userRole.value = storedRole;
    if (storedDiff) userDifficulty.value = storedDiff;

    // 初始化表单
    editForm.value = {
        nickname: userNickname.value,
        domain: userDomain.value,
        role: userRole.value,
        difficulty: userDifficulty.value
    };

    // 如果是第一次使用（没有存储过角色），自动弹出编辑框
    if (!storedRole) {
        showEditModal.value = true;
    }
});

const saveProfile = () => {
    // 保存到本地
    localStorage.setItem('ai_quiz_nickname', editForm.value.nickname);
    localStorage.setItem('ai_quiz_domain', editForm.value.domain);
    localStorage.setItem('ai_quiz_role', editForm.value.role);
    localStorage.setItem('ai_quiz_difficulty', editForm.value.difficulty);

    // 更新显示
    userNickname.value = editForm.value.nickname;
    userDomain.value = editForm.value.domain;
    userRole.value = editForm.value.role;
    userDifficulty.value = editForm.value.difficulty;

    showEditModal.value = false;
};

const averageScore = computed(() => {
    if (quizStore.history.length === 0) return 0;
    const total = quizStore.history.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round(total / quizStore.history.length);
});

const clearData = () => {
    showClearConfirm.value = true;
};

const confirmClearData = () => {
    quizStore.clearHistory();
    showSuccessAlert.value = true;
};
</script>
