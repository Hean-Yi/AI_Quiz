import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Settings from '../views/Settings.vue';
import Quiz from '../views/Quiz.vue';
import Mistakes from '../views/Mistakes.vue';
import Profile from '../views/Profile.vue';
import Onboarding from '../views/Onboarding.vue';

const baseRoutes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: Onboarding
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings
  },
  {
    path: '/quiz',
    name: 'Quiz',
    component: Quiz
  },
  {
    path: '/mistakes',
    name: 'Mistakes',
    component: Mistakes
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile
  }
];

const routes = baseRoutes.map((route) => {
  const basePath = route.path === '/' ? '' : route.path;
  return {
    ...route,
    alias: [`/desktop${basePath}`, `/mobile${basePath}`]
  };
});

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 全局路由守卫：检查是否已完成初始化引导
router.beforeEach((to, from, next) => {
  const hasOnboarded = localStorage.getItem('ai_quiz_onboarded');
  const isDesktop = to.path.startsWith('/desktop');
  const isMobile = to.path.startsWith('/mobile');
  const prefix = isDesktop ? '/desktop' : isMobile ? '/mobile' : '';
  
  if (!hasOnboarded && to.name !== 'Onboarding') {
    next({ path: prefix ? `${prefix}/onboarding` : '/onboarding' });
  } else {
    next();
  }
});

export default router;
