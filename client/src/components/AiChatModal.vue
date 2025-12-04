<template>
    <div v-if="visible" class="fixed inset-0 z-[70] flex flex-col justify-end items-center bg-black/20 backdrop-blur-sm animate-fade-in" @click.self="close">
        <div class="bg-white w-full max-w-md h-[85vh] rounded-t-[32px] shadow-2xl flex flex-col animate-slide-up overflow-hidden">
            <!-- 顶部 -->
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-klein-blue flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <i class="fa-solid fa-robot text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-800">AI 助教</h3>
                        <p class="text-xs text-gray-400">基于当前题目和文档回答</p>
                    </div>
                </div>
                <button @click="close" class="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
            </div>

            <!-- 聊天内容 -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30" ref="chatContainer">
                <!-- 默认欢迎语 -->
                <div class="flex gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                        <i class="fa-solid fa-robot text-klein-blue text-xs"></i>
                    </div>
                    <div class="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm text-gray-700 max-w-[85%]">
                        你好！我是你的 AI 助教。关于这道题，你有什么想问的吗？
                    </div>
                </div>

                <!-- 消息列表 -->
                <div v-for="(msg, idx) in chatMessages" :key="idx" class="flex gap-3" :class="{'flex-row-reverse': msg.role === 'user'}">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                         :class="msg.role === 'user' ? 'bg-klein-blue' : 'bg-blue-100'">
                        <i class="fa-solid text-xs" :class="msg.role === 'user' ? 'fa-user text-white' : 'fa-robot text-klein-blue'"></i>
                    </div>
                    <div class="p-4 rounded-2xl shadow-sm text-sm max-w-[85%] leading-relaxed overflow-hidden"
                         :class="msg.role === 'user' ? 'bg-klein-blue text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'">
                         <!-- Markdown 渲染 -->
                         <div v-if="msg.role === 'assistant'" v-html="renderMarkdown(msg.content)" class="markdown-body"></div>
                         <div v-else>{{ msg.content }}</div>
                    </div>
                </div>

                <!-- Loading -->
                <div v-if="isChatting" class="flex gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                        <i class="fa-solid fa-robot text-klein-blue text-xs"></i>
                    </div>
                    <div class="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex gap-1.5 items-center">
                        <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                        <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                </div>
            </div>

            <!-- 输入框 -->
            <div class="p-4 bg-white border-t border-gray-100 shrink-0 pb-safe">
                <div class="flex gap-2 items-end bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-klein-blue focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                    <textarea  
                        v-model="chatInput" 
                        @keydown.enter.prevent="sendChatMessage"
                        placeholder="输入你的问题..." 
                        class="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2 max-h-32 resize-none"
                        rows="1"
                    ></textarea>
                    <button 
                        @click="sendChatMessage" 
                        :disabled="!chatInput.trim() || isChatting"
                        class="w-10 h-10 rounded-xl bg-klein-blue text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shrink-0 mb-0.5"
                    >
                        <i class="fa-solid fa-paper-plane text-sm"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue';
import axios from 'axios';
import { marked } from 'marked';

const props = defineProps({
    visible: Boolean,
    question: Object,
    pdfId: String
});

const emit = defineEmits(['update:visible']);

const chatInput = ref('');
const chatMessages = ref([]);
const isChatting = ref(false);
const chatContainer = ref(null);

const close = () => {
    emit('update:visible', false);
};

// 监听 visible 变化，打开时滚动到底部
watch(() => props.visible, (val) => {
    if (val) {
        scrollToBottom();
    }
});

// 监听题目变化，清空历史 (如果需要的话，或者保留)
// 这里我们假设每次打开都是针对特定题目的，如果题目变了，应该清空？
// 但在 Quiz 中，题目切换时 ChatModal 是关闭的。
// 为了简单，我们不自动清空，由父组件控制 key 或者手动清空。
// 但为了“保留历史直到退出”，我们其实不需要做任何清空操作，除非父组件销毁了这个组件。

const renderMarkdown = (text) => {
    try {
        return marked.parse(text);
    } catch (e) {
        return text;
    }
};

const typeWriterEffect = async (fullText, messageIndex) => {
    const speed = 20;
    let currentText = '';
    
    for (let i = 0; i < fullText.length; i++) {
        currentText += fullText[i];
        chatMessages.value[messageIndex].content = currentText;
        if (i % 5 === 0) scrollToBottom();
        await new Promise(resolve => setTimeout(resolve, speed));
    }
    scrollToBottom();
};

const sendChatMessage = async () => {
    const content = chatInput.value.trim();
    if (!content || isChatting.value) return;

    chatMessages.value.push({ role: 'user', content });
    chatInput.value = '';
    isChatting.value = true;
    scrollToBottom();

    try {
        const apiKey = localStorage.getItem('ai_quiz_api_key');
        const provider = localStorage.getItem('ai_quiz_provider') || 'openai';
        const baseUrl = localStorage.getItem('ai_quiz_base_url');
        const modelName = localStorage.getItem('ai_quiz_model_name');

        const res = await axios.post('/api/quiz/chat', {
            question: props.question,
            userQuery: content,
            pdfId: props.pdfId,
            apiKey,
            provider,
            baseURL: baseUrl,
            model: modelName
        });

        if (res.data.success) {
            const replyIndex = chatMessages.value.length;
            chatMessages.value.push({ role: 'assistant', content: '' });
            await typeWriterEffect(res.data.reply, replyIndex);
        }
    } catch (error) {
        console.error('Chat failed:', error);
        chatMessages.value.push({ role: 'assistant', content: '抱歉，AI 暂时无法回答，请稍后再试。' });
    } finally {
        isChatting.value = false;
        scrollToBottom();
    }
};

const scrollToBottom = () => {
    nextTick(() => {
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        }
    });
};
</script>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
}

.animate-slide-up {
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translate3d(0, 100%, 0); }
    to { transform: translate3d(0, 0, 0); }
}

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