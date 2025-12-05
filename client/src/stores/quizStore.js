import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useQuizStore = defineStore('quiz', () => {
    const questions = ref([]);
    const currentQuestionIndex = ref(0);
    const isSubmitted = ref(false);
    const score = ref(0);
    const mistakes = ref([]);
    const history = ref([]); // 简单的历史记录 { date, score, total }
    const currentPdf = ref(null); // 存储当前 PDF 信息 { pdfId, originalName, localPath, ... }
    const currentPdfList = ref([]); // 新增：存储当前所有上传的 PDF 列表
    const pendingFile = ref(null); // 待处理的外部文件 (Intent 传入)

    // 初始化加载
    const initStore = () => {
        const storedMistakes = localStorage.getItem('ai_quiz_mistakes');
        if (storedMistakes) {
            mistakes.value = JSON.parse(storedMistakes);
        }
        const storedHistory = localStorage.getItem('ai_quiz_history');
        if (storedHistory) {
            history.value = JSON.parse(storedHistory);
        }
    };
    initStore();

    // 重置状态 (完全重置)
    const resetQuiz = () => {
        questions.value = [];
        currentQuestionIndex.value = 0;
        isSubmitted.value = false;
        score.value = 0;
        currentPdf.value = null;
        currentPdfList.value = [];
    };

    // 重置状态但保留 PDF (用于"再来一套")
    const resetForNewQuiz = () => {
        questions.value = [];
        currentQuestionIndex.value = 0;
        isSubmitted.value = false;
        score.value = 0;
        // 不清空 currentPdf 和 currentPdfList
    };

    // 设置题目
    const setQuestions = (newQuestions, pdfInfo = null, pdfList = []) => {
        // 这里不调用 resetQuiz，而是手动重置题目相关状态，以免清空了 pdfList
        questions.value = newQuestions;
        currentQuestionIndex.value = 0;
        isSubmitted.value = false;
        score.value = 0;
        
        if (pdfInfo) {
            currentPdf.value = pdfInfo;
        }
        if (pdfList && pdfList.length > 0) {
            currentPdfList.value = pdfList;
        }
    };

    // 从错题开始测验
    const startQuizFromMistakes = (selectedMistakes) => {
        resetForNewQuiz(); // 保留 PDF 上下文 (如果有的话)
        // 深拷贝错题，重置用户答案
        questions.value = selectedMistakes.map(m => ({
            ...m,
            userAnswer: null, // 重置答案
            id: m.id || Math.random() // 确保有 ID
        }));
    };

    // 选择答案

    // 选择答案
    const selectAnswer = (questionId, answer) => {
        if (isSubmitted.value) return;
        const question = questions.value.find(q => q.id === questionId);
        if (question) {
            question.userAnswer = answer;
        }
    };

    // 提交试卷
    const submitQuiz = () => {
        if (isSubmitted.value) return;
        
        let correctCount = 0;
        const newMistakes = [];

        questions.value.forEach(q => {
            // 简单比对，忽略大小写和空格
            const isCorrect = q.userAnswer?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase();
            if (isCorrect) {
                correctCount++;
            } else {
                // 记录错题 (避免重复添加，根据 ID 或 内容判断)
                const exists = mistakes.value.some(m => m.content === q.content);
                if (!exists) {
                    newMistakes.push({
                        ...q,
                        dateAdded: new Date().toISOString()
                    });
                }
            }
        });
        
        score.value = Math.round((correctCount / questions.value.length) * 100);
        isSubmitted.value = true;

        // 更新错题本
        if (newMistakes.length > 0) {
            mistakes.value = [...newMistakes, ...mistakes.value];
            localStorage.setItem('ai_quiz_mistakes', JSON.stringify(mistakes.value));
        }

        // 更新历史记录
        history.value.unshift({
            date: new Date().toISOString(),
            score: score.value,
            total: questions.value.length
        });
        localStorage.setItem('ai_quiz_history', JSON.stringify(history.value));
    };

    const removeMistake = (questionContent) => {
        mistakes.value = mistakes.value.filter(m => m.content !== questionContent);
        localStorage.setItem('ai_quiz_mistakes', JSON.stringify(mistakes.value));
    };

    const clearHistory = () => {
        history.value = [];
        localStorage.removeItem('ai_quiz_history');
        mistakes.value = [];
        localStorage.removeItem('ai_quiz_mistakes');
    };

    // 计算属性
    const currentQuestion = computed(() => questions.value[currentQuestionIndex.value]);
    const totalQuestions = computed(() => questions.value.length);
    const progress = computed(() => ((currentQuestionIndex.value + 1) / totalQuestions.value) * 100);

    return {
        questions,
        currentQuestionIndex,
        isSubmitted,
        score,
        currentQuestion,
        totalQuestions,
        progress,
        mistakes,
        history,
        currentPdf,
        currentPdfList,
        pendingFile,
        setQuestions,
        selectAnswer,
        submitQuiz,
        resetQuiz,
        resetForNewQuiz,
        startQuizFromMistakes,
        removeMistake,
        clearHistory
    };
});
