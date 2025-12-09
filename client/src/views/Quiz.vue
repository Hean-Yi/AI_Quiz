<template>
  <div class="flex flex-col h-full relative overflow-hidden bg-gray-50/50">
    
    <!-- 顶部进度条 -->
    <div class="h-1.5 bg-gray-200/50 w-full">
        <div class="h-full bg-gradient-to-r from-klein-blue to-blue-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(0,47,167,0.5)]" :style="{ width: progressPercentage + '%' }"></div>
    </div>

    <!-- 顶部栏 -->
    <div class="flex justify-between items-center px-6 py-4 animate-enter">
        <button @click="handleBack" class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-800 transition-colors">
            <i class="fa-solid fa-xmark text-lg"></i>
        </button>
        <div class="px-4 py-1.5 bg-white rounded-full shadow-sm text-xs font-bold text-gray-500 tracking-wide">
            <span class="text-klein-blue text-base">{{ quizStore.currentQuestionIndex + 1 }}</span> / {{ quizStore.totalQuestions }}
        </div>
        <div class="w-10"></div> <!-- 占位 -->
    </div>

    <!-- 题目卡片区域 -->
    <div class="flex-1 overflow-y-auto px-6 pb-32 no-scrollbar relative">
        <transition name="slide-fade" mode="out-in">
            <div :key="quizStore.currentQuestion.id" 
                 class="flex flex-col will-change-transform"
                 :class="questionContainerClass">
                
                <!-- 题目内容 -->
                <div>
                    <div class="flex items-center gap-2 mb-4">
                        <span class="inline-block px-3 py-1 bg-blue-50 text-klein-blue text-[10px] font-bold rounded-full uppercase tracking-wider">
                            {{ questionTypeLabel }}
                        </span>
                    </div>
                    
                    <h3 class="text-xl font-bold text-gray-800 leading-relaxed mb-8">
                        <span v-html="renderMarkdown(quizStore.currentQuestion.content)"></span>
                        <!-- 来源页码按钮 (仅在提交后/解析模式下显示) -->
                        <button 
                            v-if="quizStore.isSubmitted && quizStore.currentQuestion.relatedPages && quizStore.currentQuestion.relatedPages.length > 0"
                            @click="openPdfPage(quizStore.currentPdf?.pdfId, quizStore.currentQuestion.relatedPages[0])"
                            class="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors align-middle"
                            title="点击查看原文"
                        >
                            <i class="fa-solid fa-book-open text-[10px]"></i>
                            <span>P{{ quizStore.currentQuestion.relatedPages[0] }}</span>
                        </button>
                    </h3>

                    <!-- 简答题输入框 -->
                    <div v-if="quizStore.currentQuestion.type === 'short_answer'" class="animate-enter">
                        <textarea 
                            :value="quizStore.currentQuestion.userAnswer"
                            @input="e => quizStore.selectAnswer(quizStore.currentQuestion.id, e.target.value)"
                            :disabled="quizStore.isSubmitted"
                            placeholder="请输入你的答案..."
                            rows="8"
                            class="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-klein-blue focus:ring-0 resize-none transition-all text-sm leading-relaxed bg-gray-50/50"
                            :class="{'bg-gray-100': quizStore.isSubmitted}"
                        ></textarea>
                        
                        <!-- 提交后显示参考答案 -->
                        <div v-if="quizStore.isSubmitted" class="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                            <p class="text-xs font-bold text-green-600 mb-1">参考答案：</p>
                            <p class="text-sm text-gray-700">{{ quizStore.currentQuestion.correctAnswer }}</p>
                        </div>
                    </div>

                    <!-- 判断题选项 (新增) -->
                    <div v-else-if="quizStore.currentQuestion.type === 'true_false'" class="grid grid-cols-2 gap-4 mt-4 animate-enter">
                        <button 
                            @click="quizStore.selectAnswer(quizStore.currentQuestion.id, 'True')"
                            class="h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden group"
                            :class="getOptionClass('True')"
                        >
                            <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <i class="fa-solid fa-check text-lg text-blue-500"></i>
                            </div>
                            <span class="text-base font-bold text-gray-700">正确</span>
                            
                            <!-- Result Icon -->
                            <div v-if="showResultIcon('True')" class="absolute top-2 right-2">
                                 <i v-if="isOptionCorrect('True')" class="fa-solid fa-circle-check text-green-500 text-lg"></i>
                                 <i v-else-if="isOptionSelected('True')" class="fa-solid fa-circle-xmark text-red-500 text-lg"></i>
                            </div>
                        </button>

                        <button 
                            @click="quizStore.selectAnswer(quizStore.currentQuestion.id, 'False')"
                            class="h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden group"
                            :class="getOptionClass('False')"
                        >
                            <div class="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <i class="fa-solid fa-xmark text-lg text-orange-500"></i>
                            </div>
                            <span class="text-base font-bold text-gray-700">错误</span>

                            <!-- Result Icon -->
                            <div v-if="showResultIcon('False')" class="absolute top-2 right-2">
                                 <i v-if="isOptionCorrect('False')" class="fa-solid fa-circle-check text-green-500 text-lg"></i>
                                 <i v-else-if="isOptionSelected('False')" class="fa-solid fa-circle-xmark text-red-500 text-lg"></i>
                            </div>
                        </button>
                    </div>

                    <!-- 单选题选项列表 -->
                    <div v-else class="space-y-3 animate-enter">
                        <button 
                            v-for="(option, idx) in quizStore.currentQuestion.options" 
                            :key="idx"
                            @click="quizStore.selectAnswer(quizStore.currentQuestion.id, option)"
                            class="w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex justify-between items-center group relative overflow-hidden"
                            :class="getOptionClass(option)"
                        >
                            <span class="text-sm font-medium relative z-10" v-html="renderMarkdown(option)"></span>
                            
                            <!-- 选中/正确/错误 图标 -->
                            <div v-if="showResultIcon(option)" class="text-lg relative z-10">
                                <i v-if="isOptionCorrect(option)" class="fa-solid fa-circle-check text-green-500 drop-shadow-sm"></i>
                                <i v-else-if="isOptionSelected(option)" class="fa-solid fa-circle-xmark text-red-500 drop-shadow-sm"></i>
                            </div>
                            <div v-else class="w-5 h-5 rounded-full border-2 border-gray-200 group-hover:border-klein-blue transition-colors relative z-10 flex items-center justify-center"
                                 :class="{'bg-klein-blue border-klein-blue': isOptionSelected(option)}">
                                 <i v-if="isOptionSelected(option)" class="fa-solid fa-check text-white text-[10px]"></i>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- 解析 (仅在提交后显示) -->
                <div v-if="quizStore.isSubmitted" class="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 animate-enter">
                    <div class="flex items-center gap-2 mb-2">
                        <i class="fa-solid fa-lightbulb text-amber-400"></i>
                        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">解析</h4>
                    </div>
                    <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        <span v-html="parsedExplanation"></span>
                    </p>
                    
                    <!-- AI 问答按钮 -->
                    <div class="mt-3 pt-3 border-t border-blue-100 flex justify-end">
                        <button @click="openChat" class="text-xs font-bold text-klein-blue hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-100/50 transition-colors">
                            <i class="fa-solid fa-comments"></i>
                            对此题有疑问？问问 AI
                        </button>
                    </div>
                </div>

            </div>
        </transition>
    </div>

    <!-- 底部控制栏 -->
    <div class="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex justify-between items-center z-50 w-full max-w-md mx-auto">
        <button 
            @click="prevQuestion"  
            :disabled="quizStore.currentQuestionIndex === 0"
            class="w-14 h-14 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-gray-100 transition-all"
        >
            <i class="fa-solid fa-arrow-left text-lg"></i>
        </button>

        <!-- 提交按钮 (最后一题显示) -->
        <button 
            v-if="isLastQuestion && !quizStore.isSubmitted" 
            @click="quizStore.submitQuiz"
            class="primary-btn px-10 py-4 rounded-full font-bold text-sm shadow-lg shadow-blue-500/30"
        >
            提交试卷
        </button>

        <!-- 下一题按钮 -->
        <button 
            v-else
            @click="nextQuestion" 
            :disabled="quizStore.currentQuestionIndex === quizStore.totalQuestions - 1"
            class="w-14 h-14 rounded-full bg-gray-900 text-white hover:bg-black hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-30 disabled:bg-gray-300 transition-all shadow-lg shadow-gray-900/20"
        >
            <i class="fa-solid fa-arrow-right text-lg"></i>
        </button>
    </div>

    <!-- 结果弹窗 (提交后显示) -->
    <div v-if="showScoreModal" class="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-enter">
        <div class="bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl transform transition-all scale-100 relative overflow-hidden">
            <!-- 背景装饰 -->
            <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent -z-10"></div>

            <div class="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] relative">
                <i class="fa-solid fa-trophy text-5xl text-yellow-400 drop-shadow-sm"></i>
                <div class="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>
            </div>
            
            <h2 class="text-2xl font-bold text-gray-800 mb-1">考试结束!</h2>
            <p class="text-gray-400 text-sm font-medium mb-8">本次测试得分</p>
            
            <div class="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-klein-blue to-blue-400 mb-10 tracking-tighter">
                {{ quizStore.score }}<span class="text-2xl text-gray-300 font-medium ml-1">/100</span>
            </div>

            <div class="flex flex-col gap-3">
                <button @click="viewAnalysis" class="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-sm transition-colors">
                    查看详细解析
                </button>
                <button @click="handleAnotherSet" class="w-full py-4 bg-klein-blue hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all">
                    再来一套
                </button>
                <button @click="returnHomeFromResult" class="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-sm shadow-lg shadow-gray-900/20 transition-all">
                    返回首页
                </button>
            </div>
        </div>
    </div>

    <!-- AI 问答弹窗 (Bottom Sheet Style) -->
    <AiChatModal 
        v-model:visible="showChatModal"
        :question="quizStore.currentQuestion"
        :pdfId="quizStore.currentPdf?.pdfId"
    />

    <!-- 退出确认弹窗 -->
    <ConfirmModal
        v-model:visible="showExitModal"
        title="退出测验"
        message="确定要退出吗？当前的答题进度将丢失。"
        type="warning"
        confirmText="退出"
        @confirm="confirmExit"
    />

    <PdfPreviewModal
        v-model:visible="showPdfModal"
        :file-url="pdfPreviewUrl"
        :file-data="pdfPreviewData"
        :page="pdfPreviewPage"
        :title="quizStore.currentPdf?.originalName || 'PDF 预览'"
        @update:visible="val => { showPdfModal = val; if (!val) closePdfModal() }"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuizStore } from '../stores/quizStore';
import { useRouter } from 'vue-router';
import { renderMarkdown } from '../utils/markdown';
import AiChatModal from '../components/AiChatModal.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import PdfPreviewModal from '../components/PdfPreviewModal.vue';
import { Filesystem } from '@capacitor/filesystem';

const quizStore = useQuizStore();
const router = useRouter();
const showScoreModal = ref(false);
const showExitModal = ref(false);

// Chat 相关状态
const showChatModal = ref(false);

// PDF 预览相关状态
const showPdfModal = ref(false);
const pdfPreviewUrl = ref('');
const pdfPreviewData = ref(null);
const pdfPreviewPage = ref(1);

const isLastQuestion = computed(() => quizStore.currentQuestionIndex === quizStore.totalQuestions - 1);
const progressPercentage = computed(() => ((quizStore.currentQuestionIndex + 1) / quizStore.totalQuestions) * 100);

const questionTypeLabel = computed(() => {
    const type = quizStore.currentQuestion.type;
    if (type === 'true_false') return '判断题';
    if (type === 'short_answer') return '简答题';
    return '单项选择题'; 
});

// 动态计算题目容器样式
const questionContainerClass = computed(() => {
    const type = quizStore.currentQuestion.type;
    const base = "p-8";
    
    if (type === 'true_false') {
        return `${base} bg-white/80 backdrop-blur-xl border border-white shadow-sm rounded-[32px]`;
    }
    if (type === 'short_answer') {
        return `${base} bg-white shadow-sm border border-gray-100 rounded-2xl`;
    }
    return `${base} glass-card`;
});

// 解析 explanation 中的 [Page X] 为链接
const parsedExplanation = computed(() => {
    const text = quizStore.currentQuestion.explanation || '';
    // 先渲染 Markdown
    const html = renderMarkdown(text);
    
    if (!quizStore.currentPdf) return html;

    // 修复正则：支持 [Page 2, Page 3] 这种格式
    // 策略：先替换单个的 [Page X]，对于逗号分隔的，可能需要更复杂的处理
    // 或者简单点，直接全局替换 Page X，不管它是否在括号内，只要符合格式
    
    // 更好的正则：匹配 [Page X] 或 [Page X, Page Y]
    // 但最简单的方法是先替换所有的 "Page \d+" 为链接，然后再处理括号？
    // 不，我们直接匹配 Page \d+ 即可，前提是它看起来像引用
    
    return html.replace(/Page\s+(\d+)/gi, (match, pageNum) => {
    return `<button class="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-200 transition-colors cursor-pointer align-middle" onclick="window.openPdfPage('${quizStore.currentPdf.pdfId}', ${pageNum})">
            <i class="fa-solid fa-link text-[8px]"></i> P${pageNum}
        </button>`;
    });
});

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

const resolvePdfData = async (pdfId) => {
    if (quizStore.currentPdf && quizStore.currentPdf.localPath) {
        const res = await Filesystem.readFile({ path: normalizePath(quizStore.currentPdf.localPath) });
        return base64ToUint8(res.data);
    }
    if (pdfId) {
        const resp = await fetch(`/uploads/${pdfId}`);
        const buffer = await resp.arrayBuffer();
        return new Uint8Array(buffer);
    }
    return null;
};

const openPdfPage = (pdfId, pageNum = 1) => {
    resolvePdfData(pdfId).then((data) => {
        if (!data) return;
        pdfPreviewData.value = data;
        pdfPreviewUrl.value = '';
        pdfPreviewPage.value = Number(pageNum) || 1;
        showPdfModal.value = true;
    }).catch((e) => {
        console.error('加载 PDF 失败', e);
    });
};
window.openPdfPage = openPdfPage;

const closePdfModal = () => {
    showPdfModal.value = false;
    pdfPreviewUrl.value = '';
    pdfPreviewPage.value = 1;
    pdfPreviewData.value = null;
};

// 监听提交状态，显示弹窗
watch(() => quizStore.isSubmitted, (newVal) => {
    if (newVal) {
        showScoreModal.value = true;
    }
});

const nextQuestion = () => {
    if (quizStore.currentQuestionIndex < quizStore.totalQuestions - 1) {
        quizStore.currentQuestionIndex++;
    }
};

const prevQuestion = () => {
    if (quizStore.currentQuestionIndex > 0) {
        quizStore.currentQuestionIndex--;
    }
};

const handleBack = () => {
    if (quizStore.isSubmitted) {
        showScoreModal.value = true;
        return;
    }
    showExitModal.value = true;
};

const deleteCachedFiles = async () => {
    const list = quizStore.currentPdfList || [];
    await Promise.all(list.map(async (f) => {
        if (f.localPath) {
            try {
                await Filesystem.deleteFile({ path: normalizePath(f.localPath) });
            } catch (e) {
                console.warn('删除缓存失败', e);
            }
        }
    }));
};

const confirmExit = async () => {
    showExitModal.value = false;
    showScoreModal.value = false;
    await deleteCachedFiles();
    quizStore.resetQuiz();
    router.push('/');
};

const viewAnalysis = () => {
    showScoreModal.value = false;
    quizStore.currentQuestionIndex = 0;
};

const handleAnotherSet = async () => {
    showScoreModal.value = false;
    await deleteCachedFiles();
    quizStore.resetQuiz();
    router.push('/');
};

const returnHomeFromResult = async () => {
    await confirmExit();
};

// --- Chat 逻辑 ---

const openChat = () => {
    showChatModal.value = true;
};

// --- 样式辅助函数 ---

const isOptionSelected = (option) => {
    return quizStore.currentQuestion.userAnswer === option;
};

const isOptionCorrect = (option) => {
    return option.trim().toLowerCase() === quizStore.currentQuestion.correctAnswer?.trim().toLowerCase();
};

const getOptionClass = (option) => {
    const isSelected = isOptionSelected(option);
    const isSubmitted = quizStore.isSubmitted;
    const isCorrect = isOptionCorrect(option);

    if (!isSubmitted) {
        return isSelected 
            ? 'border-klein-blue bg-blue-50/30 shadow-[0_4px_14px_0_rgba(0,47,167,0.1)]' 
            : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200';
    } else {
        if (isCorrect) {
            return 'border-green-500 bg-green-50/50 shadow-[0_4px_14px_0_rgba(34,197,94,0.2)]';
        }
        if (isSelected && !isCorrect) {
            return 'border-red-500 bg-red-50/50 shadow-[0_4px_14px_0_rgba(239,68,68,0.2)]';
        }
        return 'border-transparent bg-gray-50 opacity-40';
    }
};

const showResultIcon = (option) => {
    if (!quizStore.isSubmitted) return false;
    return isOptionCorrect(option) || (isOptionSelected(option) && !isOptionCorrect(option));
};

</script>

<style scoped>
/* 优化后的动画：硬件加速 + 物理曲线 */
.slide-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1); /* 快速离场 */
}

.slide-fade-enter-from {
  transform: translate3d(20px, 0, 0);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translate3d(-20px, 0, 0);
  opacity: 0;
}

/* 性能优化类 */
.will-change-transform {
    will-change: transform, opacity;
}

/* 动画类 */
.animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
}

.animate-slide-up {
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-scale-in {
    animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translate3d(0, 100%, 0); }
    to { transform: translate3d(0, 0, 0); }
}

@keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}


/* Markdown 样式微调 */
:deep(.markdown-body) {
    font-size: 0.875rem;
    line-height: 1.6;
    color: #374151;
}
:deep(.markdown-body p) {
    margin-bottom: 0.75em;
}
:deep(.markdown-body p:last-child) {
    margin-bottom: 0;
}
:deep(.markdown-body strong) {
    font-weight: 700;
    color: #111827;
}
:deep(.markdown-body ul) {
    list-style-type: disc;
    padding-left: 1.2em;
    margin-bottom: 0.75em;
}
:deep(.markdown-body ol) {
    list-style-type: decimal;
    padding-left: 1.2em;
    margin-bottom: 0.75em;
}
:deep(.markdown-body code) {
    background-color: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
    font-family: monospace;
    font-size: 0.85em;
}
</style>
