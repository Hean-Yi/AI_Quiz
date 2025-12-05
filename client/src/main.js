import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css' // 引入 Tailwind 和全局样式
import App from './App.vue'
import router from './router'
import axios from 'axios'

// 初始化 Axios Base URL：优先本地存储，其次环境变量（生产包默认指向云端）
const storedServerUrl = localStorage.getItem('ai_quiz_server_url');
const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (storedServerUrl) {
  axios.defaults.baseURL = storedServerUrl;
} else if (envBaseUrl) {
  axios.defaults.baseURL = envBaseUrl;
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
