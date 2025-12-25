<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, provide } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { App } from '@capacitor/app';
import { Filesystem } from '@capacitor/filesystem';
import { Keyboard } from '@capacitor/keyboard';
import { useQuizStore } from './stores/quizStore';
import { useLayoutPath } from './utils/layout';

const route = useRoute();
const router = useRouter();
const quizStore = useQuizStore();
const { layoutPrefix, withLayout } = useLayoutPath();
const mediaQuery = window.matchMedia('(min-width: 1024px)');
const isLargeScreen = ref(mediaQuery.matches);
const isDesktopLayout = computed(() => {
  if (layoutPrefix.value === '/desktop') return true;
  if (layoutPrefix.value === '/mobile') return false;
  return isLargeScreen.value;
});
const layoutMode = computed(() => (isDesktopLayout.value ? 'desktop' : 'mobile'));
provide('layoutMode', layoutMode);

const showTabBar = computed(() => !isDesktopLayout.value && route.name !== 'Quiz' && route.name !== 'Onboarding' && !isKeyboardVisible.value);
const showHeader = computed(() => !isDesktopLayout.value && route.name !== 'Quiz' && route.name !== 'Onboarding');

const desktopNavItems = [
  { label: '首页', icon: 'fa-house', path: '/' },
  { label: '错题本', icon: 'fa-book-open', path: '/mistakes' },
  { label: '我的', icon: 'fa-user', path: '/profile' }
];

const pageTitle = computed(() => {
  const map = {
    Home: '首页',
    Mistakes: '错题本',
    Profile: '我的',
    Settings: '设置',
    Quiz: '测验',
    Onboarding: '欢迎'
  };
  return map[route.name] || 'AI 测验';
});

const brandTitle = computed(() => 'AI Quiz');

const transitionName = ref('fade');
const keyboardOffset = ref(0);
const lastKeyboardHeight = ref(0);
const baseVh = ref(window.innerHeight);
const isKeyboardVisible = ref(false);
const handleMediaChange = (event) => {
  isLargeScreen.value = event.matches;
};


const appShellStyle = computed(() => (
  isDesktopLayout.value ? { minHeight: '100vh' } : { height: '100vh' }
));

const tabBarStyle = computed(() => ({
  bottom: '1.5rem'
}));



watch(isDesktopLayout, (value) => {
  document.body.classList.toggle('desktop-mode', value);
}, { immediate: true });

// 监听窗口大小变化，用于检测软键盘弹出
const handleResize = () => {
  const currentHeight = window.innerHeight;
  // 如果当前高度显著小于基础高度，认为键盘弹出
  if (currentHeight < baseVh.value * 0.85) {
    isKeyboardVisible.value = true;
  } else if (Math.abs(currentHeight - baseVh.value) < 50) {
    isKeyboardVisible.value = false;
  }
};

// Base64 转 Blob 工具函数
const base64ToBlob = (base64, mimeType) => {
  const base64Data = base64.replace(/^data:.*,/, '');
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

const handleFocusIn = (event) => {
  const target = event.target;
  const isEditable = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
  if (!isEditable) return;
  // 确保输入框在键盘弹出时可见
  window.setTimeout(() => {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 300);
};

onMounted(() => {
  // 初始化基础高度
  baseVh.value = window.innerHeight;
  
  window.addEventListener('resize', handleResize);
  window.addEventListener('focusin', handleFocusIn);
  mediaQuery.addEventListener('change', handleMediaChange);

  // 监听 Capacitor 键盘事件
  Keyboard.addListener('keyboardWillShow', () => { isKeyboardVisible.value = true; });
  Keyboard.addListener('keyboardWillHide', () => { isKeyboardVisible.value = false; });

  App.addListener('appUrlOpen', async (data) => {
    console.log('App opened with URL:', data.url);
    if (data.url && (data.url.startsWith('content://') || data.url.startsWith('file://'))) {
      try {
        // 尝试使用 fetch 读取文件 (支持 content:// URI)
        let blob;
        try {
            const response = await fetch(data.url);
            blob = await response.blob();
        } catch (fetchError) {
            console.warn('Fetch failed, trying Filesystem...', fetchError);
            // 如果 fetch 失败，尝试使用 Filesystem 读取
            const fileData = await Filesystem.readFile({
                path: data.url
            });
            blob = base64ToBlob(fileData.data, 'application/pdf');
        }

        if (blob) {
            // 处理文件名 (尝试从 URL 中解析)
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
            
            // 将文件存入 Store 并跳转
            quizStore.pendingFile = file;
            router.push(withLayout('/'));
        }
      } catch (error) {
        console.error('Failed to handle file import:', error);
        alert('文件导入失败: ' + error.message);
      }
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('focusin', handleFocusIn);
  mediaQuery.removeEventListener('change', handleMediaChange);
  Keyboard.removeAllListeners();
});

watch(() => route.name, (to, from) => {
  const tabs = ['Home', 'Mistakes', 'Profile'];
  const isToTab = tabs.includes(to);
  const isFromTab = tabs.includes(from);

  // Tab 之间切换 -> 淡入淡出
  if (isToTab && isFromTab) {
    transitionName.value = 'fade';
  }
  // 从 Tab 进入非 Tab 页面 (如 Home -> Quiz, Home -> Settings) -> 左滑进入
  else if (isFromTab && !isToTab) {
    transitionName.value = 'slide-left';
  }
  // 从非 Tab 页面返回 Tab (如 Quiz -> Home) -> 右滑退出
  else if (!isToTab && isFromTab) {
    transitionName.value = 'slide-right';
  }
  // 其他情况 -> 淡入淡出
  else {
    transitionName.value = 'fade';
  }
});
</script>

<template>
  <div
    class="w-full mx-auto flex flex-col relative font-sans overflow-hidden pt-[env(safe-area-inset-top)]"
    :class="isDesktopLayout ? 'desktop-shell' : 'bg-gray-50/50'"
    :style="appShellStyle"
  >
    <div v-if="isDesktopLayout" class="desktop-layout">
      <aside class="desktop-sidebar">
        <div class="desktop-brand">
          <div class="desktop-brand-mark">
            <i class="fa-solid fa-layer-group text-sm"></i>
          </div>
          <div class="desktop-brand-text">
            <p class="desktop-brand-eyebrow">{{ brandTitle }}</p>
            <p class="desktop-brand-title">知识工作台</p>
          </div>
        </div>

        <nav class="desktop-nav">
          <router-link
            v-for="item in desktopNavItems"
            :key="item.path"
            :to="withLayout(item.path)"
            custom
            v-slot="{ navigate, isActive }"
          >
            <button
              @click="navigate"
              class="desktop-nav-item"
              :title="item.label"
              :class="{ 'is-active': isActive }"
            >
              <i class="fa-solid" :class="item.icon"></i>
              <span>{{ item.label }}</span>
            </button>
          </router-link>
        </nav>

        <div class="desktop-sidebar-footer">
          <router-link :to="withLayout('/settings')" custom v-slot="{ navigate, isActive }">
            <button
              @click="navigate"
              class="desktop-nav-item"
              title="Settings"
              :class="{ 'is-active': isActive }"
            >
              <i class="fa-solid fa-gear"></i>
              <span>设置</span>
            </button>
          </router-link>
        </div>
      </aside>

      <div class="desktop-body">
        <header class="desktop-header">
          <div class="desktop-header-title">
            <h1 class="desktop-title">{{ pageTitle }}</h1>
          </div>
        </header>

        <main class="desktop-main">
          <div class="desktop-content">
            <router-view v-slot="{ Component }">
              <transition :name="transitionName" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </div>
        </main>
      </div>
    </div>

    <template v-else>
      <!-- ????? -->
      <header v-if="showHeader" class="px-6 py-4 flex justify-between items-center sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/50 transition-all duration-300">
          <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-klein-blue to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <i class="fa-solid fa-layer-group text-white text-sm"></i>
              </div>
              <h1 class="font-bold text-lg tracking-tight text-gray-800">{{ brandTitle }}</h1>
          </div>
          <router-link :to="withLayout('/settings')" class="icon-btn">
              <i class="fa-solid fa-gear text-lg"></i>
          </router-link>
      </header>

      <!-- ??????? -->
      <main class="flex-1 overflow-y-auto no-scrollbar relative" :style="contentStyle">
          <router-view v-slot="{ Component }">
            <transition :name="transitionName" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>

        <!-- ?? TabBar -->
        <nav 
          class="fixed bottom-6 left-6 right-6 max-w-md mx-auto glass-card p-2 flex justify-around items-center z-50 shadow-2xl shadow-black/5 transition-all duration-300 ease-in-out" 
          :class="{'translate-y-[200%] opacity-0': !showTabBar}"
          :style="tabBarStyle"
        >
            <router-link :to="withLayout('/')" custom v-slot="{ navigate, isActive }">
              <button @click="navigate" class="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-300 relative overflow-hidden group">
                  <div class="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  <i class="fa-solid fa-house text-xl z-10 transition-transform duration-300 group-active:scale-90" :class="isActive ? 'text-klein-blue' : 'text-gray-400'"></i>
                  <span class="text-[10px] font-medium z-10" :class="isActive ? 'text-klein-blue' : 'text-gray-400'">??</span>
              </button>
            </router-link>
            
            <router-link :to="withLayout('/mistakes')" custom v-slot="{ navigate, isActive }">
              <button @click="navigate" class="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-300 relative overflow-hidden group">
                  <div class="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  <i class="fa-solid fa-book-open text-xl z-10 transition-transform duration-300 group-active:scale-90" :class="isActive ? 'text-klein-blue' : 'text-gray-400'"></i>
                  <span class="text-[10px] font-medium z-10" :class="isActive ? 'text-klein-blue' : 'text-gray-400'">???</span>
              </button>
            </router-link>
            
            <router-link :to="withLayout('/profile')" custom v-slot="{ navigate, isActive }">
              <button @click="navigate" class="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-300 relative overflow-hidden group">
                  <div class="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  <i class="fa-solid fa-user text-xl z-10 transition-transform duration-300 group-active:scale-90" :class="isActive ? 'text-klein-blue' : 'text-gray-400'"></i>
                  <span class="text-[10px] font-medium z-10" :class="isActive ? 'text-klein-blue' : 'text-gray-400'">??</span>
              </button>
            </router-link>
        </nav>
    </template>
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

/* Desktop transitions */
.desktop-shell .fade-enter-active,
.desktop-shell .fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.desktop-shell .fade-enter-from,
.desktop-shell .fade-leave-to {
  opacity: 0;
  transform: translate3d(0, 8px, 0);
}

.desktop-shell .slide-left-enter-active,
.desktop-shell .slide-left-leave-active {
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease;
}
.desktop-shell .slide-left-enter-from {
  opacity: 0;
  transform: translate3d(24px, 0, 0);
}
.desktop-shell .slide-left-leave-to {
  opacity: 0;
  transform: translate3d(-24px, 0, 0);
}

.desktop-shell .slide-right-enter-active,
.desktop-shell .slide-right-leave-active {
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease;
}
.desktop-shell .slide-right-enter-from {
  opacity: 0;
  transform: translate3d(-24px, 0, 0);
}
.desktop-shell .slide-right-leave-to {
  opacity: 0;
  transform: translate3d(24px, 0, 0);
}
</style>
