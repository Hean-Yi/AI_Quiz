import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css' // 引入全局样式 (包含 Tailwind 指令)
import App from './App.vue'
import router from './router'
import axios from 'axios'

// 配置 Axios 的基础 URL
// 在生产环境中，如果环境变量 VITE_API_BASE_URL 存在，则使用该地址
// 否则默认使用相对路径或开发环境代理
const envBaseUrl = import.meta.env.VITE_API_BASE_URL
if (import.meta.env.PROD && envBaseUrl) {
  axios.defaults.baseURL = envBaseUrl
}

const app = createApp(App)

// 注册 Pinia 状态管理
app.use(createPinia())
// 注册 Vue Router 路由
app.use(router)
// 挂载应用
app.mount('#app')
