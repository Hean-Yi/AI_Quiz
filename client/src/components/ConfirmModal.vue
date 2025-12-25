<template>
    <teleport to="body">
        <div v-if="visible" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in" @click.self="handleOverlayClick">
            <div class="bg-white w-full max-w-xs rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                <div class="p-6 text-center">
                    <div v-if="type === 'warning'" class="w-12 h-12 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fa-solid fa-exclamation text-xl text-amber-500"></i>
                    </div>
                    <div v-else-if="type === 'success'" class="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fa-solid fa-check text-xl text-green-500"></i>
                    </div>
                    <div v-else-if="type === 'error'" class="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fa-solid fa-xmark text-xl text-red-500"></i>
                    </div>
                    <div v-else class="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fa-solid fa-info text-xl text-klein-blue"></i>
                    </div>

                    <h3 class="text-lg font-bold text-gray-900 mb-2">{{ title }}</h3>
                    <p class="text-sm text-gray-500 leading-relaxed">{{ message }}</p>
                </div>

                <div class="flex border-t border-gray-100">
                    <button 
                        v-if="showCancel"
                        @click="onCancel" 
                        class="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-gray-100"
                    >
                        {{ cancelText }}
                    </button>
                    <button 
                        @click="onConfirm" 
                        class="flex-1 py-4 text-sm font-bold hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        :class="confirmButtonClass"
                    >
                        {{ confirmText }}
                    </button>
                </div>
            </div>
        </div>
    </teleport>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    visible: Boolean,
    title: {
        type: String,
        default: '提示'
    },
    message: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        default: 'info' // info, warning, success, error
    },
    showCancel: {
        type: Boolean,
        default: true
    },
    confirmText: {
        type: String,
        default: '确定'
    },
    cancelText: {
        type: String,
        default: '取消'
    },
    closeOnOverlayClick: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:visible', 'confirm', 'cancel']);

const confirmButtonClass = computed(() => {
    if (props.type === 'error' || props.type === 'warning') return 'text-red-500';
    if (props.type === 'success') return 'text-green-500';
    return 'text-klein-blue';
});

const onConfirm = () => {
    emit('confirm');
    emit('update:visible', false);
};

const onCancel = () => {
    emit('cancel');
    emit('update:visible', false);
};

const handleOverlayClick = () => {
    if (props.closeOnOverlayClick) {
        onCancel();
    }
};
</script>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.2s ease-out forwards;
}

.animate-scale-in {
    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
