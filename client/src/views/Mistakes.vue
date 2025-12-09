<template>
  <div class="flex flex-col pt-6 px-6">
    <!-- 标题 -->
    <div class="mb-6 animate-enter flex justify-between items-end">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">错题本</h2>
        <p class="text-sm text-gray-500 mt-1">温故而知新 ({{ quizStore.mistakes.length }})</p>
      </div>
      
      <!-- 操作按钮组 -->
      <div v-if="quizStore.mistakes.length > 0" class="flex gap-2">
        <button 
            v-if="isSelectionMode"
            @click="toggleSelectAll"
            class="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors bg-blue-50 text-klein-blue hover:bg-blue-100"
        >
            {{ isAllSelected ? '取消全选' : '全选' }}
        </button>
        <button 
            @click="toggleSelectionMode"
            class="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            :class="isSelectionMode ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-klein-blue text-white hover:bg-blue-700 shadow-blue-500/30'"
        >
            {{ isSelectionMode ? '退出选择' : '错题自测' }}
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="quizStore.mistakes.length === 0" class="flex-1 flex flex-col items-center justify-center text-center animate-enter delay-100 opacity-0" style="animation-fill-mode: forwards;">
        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <i class="fa-solid fa-check-double text-4xl text-gray-300"></i>
        </div>
        <h3 class="text-lg font-bold text-gray-700">太棒了！</h3>
        <p class="text-gray-400 text-sm mt-2">目前没有错题，继续保持！</p>
    </div>

    <!-- 错题列表 -->
    <div v-else class="space-y-4 overflow-y-auto no-scrollbar pb-20">
        <div 
            v-for="(mistake, index) in quizStore.mistakes" 
            :key="index"
            class="glass-card p-5 animate-enter relative transition-all duration-200"
            :class="{'border-klein-blue bg-blue-50/30': isSelected(mistake)}"
            :style="{ animationDelay: `${index * 50}ms` }"
            @click="handleCardClick(mistake)"
        >
            <!-- 选择框 (自测模式) -->
            <div v-if="isSelectionMode" class="absolute top-5 right-5 z-10">
                <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                     :class="isSelected(mistake) ? 'bg-klein-blue border-klein-blue' : 'border-gray-300 bg-white'">
                     <i v-if="isSelected(mistake)" class="fa-solid fa-check text-white text-xs"></i>
                </div>
            </div>

            <div class="flex justify-between items-start mb-3">
                <div class="flex gap-2">
                    <span class="inline-block px-2 py-1 bg-red-50 text-red-500 text-[10px] font-bold rounded-md">
                        错题
                    </span>
                    <span class="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md">
                        {{ getQuestionTypeLabel(mistake.type) }}
                    </span>
                </div>
                <button v-if="!isSelectionMode" @click.stop="quizStore.removeMistake(mistake.content)" class="text-gray-300 hover:text-red-500 transition-colors p-3 -mr-2 -mt-2 active:scale-90">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>

            <h3 class="text-base font-bold text-gray-800 mb-4 leading-relaxed line-clamp-2">
                <span v-html="renderMarkdown(mistake.content)"></span>
            </h3>

            <!-- 简略信息 -->
            <div class="text-xs text-gray-400 flex justify-between items-center">
                <span>添加于 {{ formatDate(mistake.dateAdded) }}</span>
                <span v-if="!isSelectionMode" class="text-klein-blue font-bold flex items-center gap-1">
                    查看详情 <i class="fa-solid fa-chevron-right text-[10px]"></i>
                </span>
            </div>
        </div>
    </div>

    <!-- 底部浮动按钮 (开始自测) -->
    <div v-if="isSelectionMode" class="fixed bottom-28 left-0 right-0 px-6 z-50 flex justify-center pointer-events-none">
        <button 
            @click="startSelfTest"
            :disabled="selectedMistakes.length === 0"
            class="primary-btn px-8 py-3 rounded-full font-bold text-sm shadow-lg shadow-blue-500/30 pointer-events-auto transform transition-all"
            :class="selectedMistakes.length === 0 ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'"
        >
            开始自测 ({{ selectedMistakes.length }})
        </button>
    </div>

    <!-- 错题详情弹窗 -->
    <div v-if="showDetailModal" class="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fade-in" @click.self="showDetailModal = false">
        <div class="bg-white rounded-[24px] w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-scale-in overflow-hidden">
            <!-- 顶部 -->
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <h3 class="font-bold text-gray-800">错题详情</h3>
                <button @click="showDetailModal = false" class="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <!-- 内容 -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                <div>
                    <h3 class="text-lg font-bold text-gray-800 leading-relaxed mb-4">
                        <span v-html="renderMarkdown(currentMistake.content)"></span>
                    </h3>
                    
                    <!-- 选项展示 -->
                    <div class="space-y-2">
                        <div v-for="(opt, idx) in currentMistake.options" :key="idx">
                            <div v-if="isCorrect(opt, currentMistake)" class="p-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2 text-sm font-medium text-green-800">
                                <i class="fa-solid fa-circle-check text-green-500"></i>
                                <span v-html="renderMarkdown(opt)"></span>
                            </div>
                            <div v-else-if="isUserWrong(opt, currentMistake)" class="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-sm font-medium text-red-800">
                                <i class="fa-solid fa-circle-xmark text-red-500"></i>
                                <span v-html="renderMarkdown(opt)"></span>
                                <span class="text-[10px] bg-red-100 px-1.5 py-0.5 rounded ml-auto">你的选择</span>
                            </div>
                            <div v-else class="p-3 rounded-xl bg-white border border-gray-100 text-sm text-gray-500">
                                <span v-html="renderMarkdown(opt)"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 解析 -->
                <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <div class="flex items-center gap-2 mb-2">
                        <i class="fa-solid fa-lightbulb text-amber-400"></i>
                        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">解析</h4>
                    </div>
                    <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap" v-html="renderMarkdown(currentMistake.explanation)"></p>
                </div>
            </div>

            <!-- 底部操作 -->
            <div class="p-4 border-t border-gray-100 bg-white flex gap-3">
                <button @click="openChat" class="flex-1 py-3 bg-klein-blue hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    <i class="fa-solid fa-robot"></i> 问问 AI
                </button>
            </div>
        </div>
    </div>

    <!-- AI 问答弹窗 -->
    <AiChatModal 
        v-model:visible="showChatModal"
        :question="currentMistake"
        :pdfId="quizStore.currentPdf?.pdfId"
    />

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useQuizStore } from '../stores/quizStore';
import { useRouter } from 'vue-router';
import { renderMarkdown } from '../utils/markdown';
import AiChatModal from '../components/AiChatModal.vue';

const quizStore = useQuizStore();
const router = useRouter();

// 状态
const isSelectionMode = ref(false);
const selectedMistakes = ref([]);
const showDetailModal = ref(false);
const currentMistake = ref({});
const showChatModal = ref(false);

const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
};

const isCorrect = (option, question) => {
    return option.trim().toLowerCase() === question.correctAnswer?.trim().toLowerCase();
};

const isUserWrong = (option, question) => {
    return option === question.userAnswer && !isCorrect(option, question);
};

// 交互逻辑
const toggleSelectionMode = () => {
    isSelectionMode.value = !isSelectionMode.value;
    selectedMistakes.value = [];
};

const isSelected = (mistake) => {
    return selectedMistakes.value.some(m => m.content === mistake.content);
};

const isAllSelected = computed(() => {
    return quizStore.mistakes.length > 0 && selectedMistakes.value.length === quizStore.mistakes.length;
});

const toggleSelectAll = () => {
    if (isAllSelected.value) {
        selectedMistakes.value = [];
    } else {
        selectedMistakes.value = [...quizStore.mistakes];
    }
};

const getQuestionTypeLabel = (type) => {
    const map = {
        'multiple_choice': '单选题',
        'true_false': '判断题',
        'short_answer': '简答题'
    };
    return map[type] || '未知题型';
};

const handleCardClick = (mistake) => {
    if (isSelectionMode.value) {
        // 选择模式：切换选中状态
        if (isSelected(mistake)) {
            selectedMistakes.value = selectedMistakes.value.filter(m => m.content !== mistake.content);
        } else {
            selectedMistakes.value.push(mistake);
        }
    } else {
        // 详情模式：打开弹窗
        currentMistake.value = mistake;
        showDetailModal.value = true;
    }
};

const startSelfTest = () => {
    if (selectedMistakes.value.length === 0) return;
    
    quizStore.startQuizFromMistakes(selectedMistakes.value);
    router.push('/quiz');
};

const openChat = () => {
    showChatModal.value = true;
};
</script>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
}

.animate-scale-in {
    animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
</style>
