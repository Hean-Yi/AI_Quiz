<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { App } from '@capacitor/app';
import { Filesystem } from '@capacitor/filesystem';
import { useQuizStore } from './stores/quizStore';

const route = useRoute();
const router = useRouter();
const quizStore = useQuizStore();
const showTabBar = computed(() => route.name !== 'Quiz' && route.name !== 'Onboarding');
const showHeader = computed(() => route.name !== 'Quiz' && route.name !== 'Onboarding');

const transitionName = ref('fade');

// Base64 转 Blob 辅助函数
const base64ToBlob = (base64, mimeType) => {
  // 处理可能的前缀 (data:application/pdf;base64,)
  const base64Data = base64.replace(/^data:.*,/, '');
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

onMounted(() => {
  // 监听外部应用打开 (Intent)
  App.addListener('appUrlOpen', async (data) => {
    console.log('App opened with URL:', data.url);
    if (data.url && (data.url.startsWith('content://') || data.url.startsWith('file://'))) {
      try {
        // 尝试使用 fetch 读取 (通常 content:// URI 在 WebView 中可读)
        let blob;
        try {
            const response = await fetch(data.url);
            blob = await response.blob();
        } catch (fetchError) {
            console.warn('Fetch failed, trying Filesystem...', fetchError);
            // 降级使用 Filesystem
            const fileData = await Filesystem.readFile({
                path: data.url
            });
            blob = base64ToBlob(fileData.data, 'application/pdf');
        }

        if (blob) {
            // 提取文件名 (尝试从 URL 中获取，或者使用默认值)
            let fileName = 'imported_document.pdf';
            try {
                const urlObj = new URL(data.url);
                const pathSegments = urlObj.pathname.split('/');
                const lastSegment = pathSegments[pathSegments.length - 1];
                if (lastSegment && lastSegment.toLowerCase().endsWith('.pdf')) {
                    fileName = decodeURIComponent(lastSegment);
                }
            } catch (e) {
                // ignore
            }

            const file = new File([blob], fileName, { type: "application/pdf" });
            console.log('File processed:', file);
            
            // 存入 Store 并跳转
            quizStore.pendingFile = file;
            router.push('/');
        }
      } catch (error) {
        console.error('Failed to handle file import:', error);
        alert('无法读取文件: ' + error.message);
      }
    }
  });
});

watch(() => route.name, (to, from) => {
  const tabs = ['Home', 'Mistakes', 'Profile'];
  const isToTab = tabs.includes(to);
  const isFromTab = tabs.includes(from);

  // Tab 之间切换 -> Fade
  if (isToTab && isFromTab) {
    transitionName.value = 'fade';
  }
  // 从 Tab 进入非 Tab (如 Home -> Quiz, Home -> Settings) -> Slide Left
  else if (isFromTab && !isToTab) {
    transitionName.value = 'slide-left';
  }
  // 从非 Tab 返回 Tab (如 Quiz -> Home) -> Slide Right
  else if (!isToTab && isFromTab) {
    transitionName.value = 'slide-right';
  }
  // 其他情况 (默认)
  else {
    transitionName.value = 'fade';
  }
});
</script>

<template>
  <div class="w-full max-w-md mx-auto min-h-screen flex flex-col relative font-sans overflow-hidden bg-gray-50/50 pt-[env(safe-area-inset-top)]" :class="{'pb-24': showTabBar}">
    
    <!-- 顶部导航栏 -->
    <header v-if="showHeader" class="px-6 py-4 flex justify-between items-center sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/50 transition-all duration-300">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-klein-blue to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <i class="fa-solid fa-layer-group text-white text-sm"></i>
            </div>
            <h1 class="font-bold text-lg tracking-tight text-gray-800">AI Quiz</h1>
        </div>
        <router-link to="/settings" class="icon-btn">
            <i class="fa-solid fa-gear text-lg"></i>
        </router-link>
    </header>

    <!-- 页面内容渲染区 -->
    <main class="flex-1 overflow-y-auto no-scrollbar relative">
      <router-view v-slot="{ Component }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 底部 TabBar -->
    <nav v-if="showTabBar" class="fixed bottom-6 left-6 right-6 w-[calc(100%-3rem)] max-w-[calc(28rem-3rem)] mx-auto glass-card p-2 flex justify-around items-center z-50 shadow-2xl shadow-black/5">
        <router-link to="/" custom v-slot="{ navigate, isActive }">
          <button @click="navigate" class="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-300 relative overflow-hidden group">
              <div class="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
              <i class="fa-solid fa-house text-xl z-10 transition-transform duration-300 group-active:scale-90" :class="isActive ? 'text-klein-blue' : 'text-gray-400'"></i>
              <span class="text-[10px] font-medium z-10" :class="isActive ? 'text-klein-blue' : 'text-gray-400'">首页</span>
          </button>
        </router-link>
        
        <router-link to="/mistakes" custom v-slot="{ navigate, isActive }">
          <button @click="navigate" class="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-300 relative overflow-hidden group">
              <div class="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
              <i class="fa-solid fa-book-open text-xl z-10 transition-transform duration-300 group-active:scale-90" :class="isActive ? 'text-klein-blue' : 'text-gray-400'"></i>
              <span class="text-[10px] font-medium z-10" :class="isActive ? 'text-klein-blue' : 'text-gray-400'">错题本</span>
          </button>
        </router-link>
        
        <router-link to="/profile" custom v-slot="{ navigate, isActive }">
          <button @click="navigate" class="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-300 relative overflow-hidden group">
              <div class="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
              <i class="fa-solid fa-user text-xl z-10 transition-transform duration-300 group-active:scale-90" :class="isActive ? 'text-klein-blue' : 'text-gray-400'"></i>
              <span class="text-[10px] font-medium z-10" :class="isActive ? 'text-klein-blue' : 'text-gray-400'">我的</span>
          </button>
        </router-link>
    </nav>

  </div>
</template>

<style>
/* Fade Transition (Tab Switch) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide Left (Enter Page) */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}
.slide-left-enter-from {
  opacity: 0;
  transform: translate3d(20px, 0, 0);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translate3d(-20px, 0, 0);
}

/* Slide Right (Back Page) */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}
.slide-right-enter-from {
  opacity: 0;
  transform: translate3d(-20px, 0, 0);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translate3d(20px, 0, 0);
}
</style>